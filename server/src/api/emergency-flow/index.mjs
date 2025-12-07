// ESM形弁E- 応急復旧フローエンド�EインチE// /api/emergency-flow/* にマッピング

import fs from 'fs';
import { getBlobServiceClient, containerName, norm, upload } from '../../infra/blob.mjs';
import { getOpenAIClient, isOpenAIAvailable } from '../../infra/openai.mjs';
import path from 'path';

// 褁E��パスを試して既存データのプレフィチE��ス違いに対忁Efunction buildCandidatePaths(fileName, skipNorm = false) {
  const baseName = fileName || '';
  const paths = [
    // 現衁E base付き�E�Eormで knowledge-base/ が付与される�E�E    skipNorm ? null : norm(`troubleshooting/${baseName}`),
    // 旧: baseなぁE    `troubleshooting/${baseName}`,
    // 念のため: baseを直書ぁE    `knowledge-base/troubleshooting/${baseName}`,
  ].filter(Boolean);
  // 重褁E��除
  return [...new Set(paths)];
}

async function resolveBlobClient(containerClient, fileName) {
  const candidates = buildCandidatePaths(fileName);
  for (const blobName of candidates) {
    const blobClient = containerClient.getBlobClient(blobName);
    if (await blobClient.exists()) {
      return { blobClient, blobName };
    }
  }
  return null;
}

export default async function emergencyFlowHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(Boolean);

  // /api/emergency-flow/list
  if (pathParts[2] === 'list' && method === 'GET') {
    try {
      console.log('[api/emergency-flow/list] Fetching flows');
      
      const flows = [];
      const blobServiceClient = getBlobServiceClient();

      if (!blobServiceClient) {
        console.warn('[api/emergency-flow/list] BLOB client not available');
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: 'BLOB storage not available',
          timestamp: new Date().toISOString()
        });
      }

      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.error(`[api/emergency-flow/list] Container not found: ${containerName}`);
          return res.json({
            success: true,
            data: flows,
            total: flows.length,
            message: `Container "${containerName}" not found`,
            timestamp: new Date().toISOString()
          });
        }

        // まず現行パス�E�Eorm�E�で列挙し、E件なら旧パスも試ぁE        const prefixes = [norm('troubleshooting/'), 'troubleshooting/', 'knowledge-base/troubleshooting/'];
        const seen = new Set();

        for (const prefix of prefixes) {
          console.log(`[api/emergency-flow/list] Listing with prefix: ${prefix}`);
          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (!blob.name.endsWith('.json')) continue;
            const fileName = blob.name.split('/').pop();
            if (!fileName) continue;
            if (seen.has(fileName)) continue;
            seen.add(fileName);
            flows.push({
              id: fileName.replace('.json', ''),
              name: fileName,
              fileName,
              blobName: blob.name,
              lastModified: blob.properties.lastModified,
              size: blob.properties.contentLength,
            });
          }
          if (flows.length > 0) break; // 何か取れたら終亁E        }
        
        console.log(`[api/emergency-flow/list] Found ${flows.length} flows`);
      } catch (blobError) {
        console.error('[api/emergency-flow/list] BLOB error:', blobError);
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: 'BLOB error occurred',
          error: blobError.message,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/emergency-flow/list] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'フロー一覧の取得に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // /api/emergency-flow/:fileName - GET個別取征E  if (pathParts[2] && !pathParts[2].includes('list') && !pathParts[2].includes('image') && !pathParts[2].includes('save') && method === 'GET') {
    try {
      const fileName = pathParts[2];
      console.log(`[api/emergency-flow] Fetching: ${fileName}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const resolved = await resolveBlobClient(containerClient, fileName);
      if (!resolved) {
        console.warn('[api/emergency-flow] Blob not found for', fileName);
        return res.status(404).json({ success: false, error: 'フローが見つかりません' });
      }

      console.log(`[api/emergency-flow] BLOB path: ${resolved.blobName}`);
      const downloadResponse = await resolved.blobClient.download();
      const contentType = downloadResponse.contentType || 'application/json';

      res.setHeader('Content-Type', contentType);
      downloadResponse.readableStreamBody.pipe(res);
    } catch (error) {
      console.error('[api/emergency-flow] Error:', error);
      return res.status(404).json({
        success: false,
        error: 'フローが見つかりません',
        details: error.message
      });
    }
    return;
  }

  // /api/emergency-flow/save - POST保孁E  if (pathParts[2] === 'save' && method === 'POST') {
    try {
      console.log('[api/emergency-flow/save] Saving flow data');

      const { flowData, flowId } = req.body;
      if (!flowData) {
        return res.status(400).json({ 
          success: false, 
          error: 'flowData is required' 
        });
      }

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        console.error('[api/emergency-flow/save] ❁EBLOB service client not available');
        return res.status(503).json({ 
          success: false, 
          error: 'BLOB storage not available' 
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // コンチE��が存在するか確誁E      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.log('[api/emergency-flow/save] Creating container:', containerName);
        await containerClient.create();
      }
      
      // 既存データとの互換性のため base付きとなし両方で保存を試みめE      const blobNamePrimary = norm(`troubleshooting/${flowId || 'flow-' + Date.now()}.json`);
      const blobClientPrimary = containerClient.getBlockBlobClient(blobNamePrimary);

      const content = typeof flowData === 'string' ? flowData : JSON.stringify(flowData, null, 2);

      console.log('[api/emergency-flow/save] ✁ESaving flow data to BLOB');
      console.log('[api/emergency-flow/save]   Container:', containerName);
      console.log('[api/emergency-flow/save]   BLOB path:', blobNamePrimary);
      console.log('[api/emergency-flow/save]   Flow ID:', flowId);

      await blobClientPrimary.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log(`[api/emergency-flow/save] ✁ESaved successfully to: ${blobNamePrimary}`);

      // baseなし�EレフィチE��スにも�Eストエフォートで保存（既存ファイル構造との互換性�E�E      try {
        const altName = `troubleshooting/${flowId || 'flow-' + Date.now()}.json`;
        const altClient = containerClient.getBlockBlobClient(altName);
        await altClient.upload(content, content.length, {
          blobHTTPHeaders: { blobContentType: 'application/json' }
        });
        console.log(`[api/emergency-flow/save] Also saved to: ${altName}`);
      } catch (altErr) {
        console.warn('[api/emergency-flow/save] Alt prefix save skipped:', altErr.message);
      }

      return res.json({
        success: true,
        message: 'Flow data saved successfully',
        blobName: blobNamePrimary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/emergency-flow/save] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // /api/emergency-flow/upload-image - POST画像アチE�EローチE  if (pathParts[2] === 'upload-image' && method === 'POST') {
    // multerミドルウェアを手動で適用
    return upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('[api/emergency-flow/upload-image] Upload error:', err);
        return res.status(500).json({
          success: false,
          error: 'ファイルのアチE�Eロードに失敗しました',
          details: err.message
        });
      }

      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'ファイルがアチE�EロードされてぁE��せん'
          });
        }

        console.log('[api/emergency-flow/upload-image] Uploading:', {
          fileName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const fileName = `emergency_flow_${timestamp}${ext}`;
        const blobServiceClient = getBlobServiceClient();

        // 開発環墁E BLOBが利用できなぁE��合�Eローカル保孁E        if (!blobServiceClient) {
          console.warn('[api/emergency-flow/upload-image] BLOB unavailable, saving locally');
          const fs = await import('fs');
          const localDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
          
          if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
          }
          
          const localPath = path.join(localDir, fileName);
          fs.writeFileSync(localPath, req.file.buffer);
          
          console.log('[api/emergency-flow/upload-image] Saved locally:', localPath);
          const imageUrl = `/api/images/emergency-flows/${fileName}`;
          
          return res.json({
            success: true,
            imageUrl: imageUrl,
            fileName: fileName,
            size: req.file.size,
            storage: 'local'
          });
        }

        // 本番環墁E BLOBに保孁E        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = `knowledge-base/images/emergency-flows/${fileName}`;
        console.log('[api/emergency-flow/upload-image] Uploading to Blob:', blobName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const containerExists = await containerClient.exists();
        if (!containerExists) {
          await containerClient.createIfNotExists();
        }

        await blockBlobClient.uploadData(req.file.buffer, {
          blobHTTPHeaders: {
            blobContentType: req.file.mimetype
          },
          metadata: {
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
          }
        });

        console.log(`[api/emergency-flow/upload-image] Uploaded: ${blobName}`);

        const imageUrl = `/api/images/emergency-flows/${fileName}`;

        return res.json({
          success: true,
          imageUrl: imageUrl,
          fileName: fileName,
          blobName: blobName,
          size: req.file.size,
          storage: 'blob'
        });
      } catch (error) {
        console.error('[api/emergency-flow/upload-image] Error:', error);
        return res.status(500).json({
          success: false,
          error: '画像�EアチE�Eロードに失敗しました',
          details: error.message
        });
      }
    });
  }

  // /api/emergency-flow/image/:fileName - DELETE画像削除
  if (pathParts[2] === 'image' && pathParts[3] && method === 'DELETE') {
    try {
      const fileName = pathParts[3];
      console.log('[api/emergency-flow/delete-image] Deleting:', fileName);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = `knowledge-base/images/emergency-flows/${fileName}`;
      const blobClient = containerClient.getBlobClient(blobName);

      const exists = await blobClient.exists();
      if (!exists) {
        console.log('[api/emergency-flow/delete-image] Image not found:', blobName);
        return res.status(404).json({
          success: false,
          error: '画像が見つかりません'
        });
      }

      await blobClient.delete();
      console.log(`[api/emergency-flow/delete-image] Deleted: ${blobName}`);

      return res.json({
        success: true,
        message: '画像を削除しました',
        deletedFile: fileName
      });
    } catch (error) {
      console.error('[api/emergency-flow/delete-image] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/generate - POSTフロー生�E�E�EPT統合！E  if (pathParts[2] === 'generate' && method === 'POST') {
    try {
      const { keyword } = req.body;
      console.log('[api/emergency-flow/generate] Generate request:', keyword);

      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: 'キーワードが忁E��でぁE
        });
      }

      const timestamp = Date.now();
      const flowId = `flow_${timestamp}`;
      let flowTemplate;

      // OpenAI APIを使用してフロー生�E
      if (isOpenAIAvailable) {
        console.log('[api/emergency-flow/generate] 🤁EUsing OpenAI to generate flow for keyword:', keyword);
        const openai = getOpenAIClient();

        const prompt = `建設機械の応急処置フローをJSON形式で生�Eしてください、EキーワーチE ${keyword}

以下�E構造でJSONを生成してください:
{
  "title": "フローのタイトル�E�E{keyword}に関連�E�E,
  "description": "フローの説昁E,
  "triggerKeywords": ["${keyword}", "関連キーワーチE", "関連キーワーチE"],
  "steps": [
    {
      "id": "step1",
      "type": "step",
      "title": "スチE��プ�Eタイトル",
      "description": "詳細な説昁E,
      "message": "作業老E��のメチE��ージ",
      "nextStep": "step2"
    },
    {
      "id": "step2",
      "type": "decision",
      "title": "判断ポインチE,
      "description": "状況判断の説昁E,
      "message": "判断メチE��ージ",
      "options": [
        { "label": "選択肢1", "nextStep": "step3" },
        { "label": "選択肢2", "nextStep": "step4" }
      ]
    }
  ]
}

注意事頁E
- stepタイチE 通常の作業スチE��プ！EextStepで次のスチE��プIDを指定！E- decisionタイチE 判断刁E���Eイント！Eptionsで選択肢を提供！E- 最終スチE��プ�EnextStepは "complete" にする
- 安�E確認、症状確認、応急処置、報告�E流れを含める
- 建設機械の専門用語を使用し、実践皁E��冁E��にする`;

        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'あなた�E建設機械の保守�EメンチE��ンスの専門家です。安�Eで実践皁E��応急処置フローを生成してください、E
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });

          const gptResponse = completion.choices[0].message.content;
          console.log('[api/emergency-flow/generate] ✁EGPT response received');
          
          const parsedFlow = JSON.parse(gptResponse);
          
          flowTemplate = {
            id: flowId,
            title: parsedFlow.title || keyword,
            description: parsedFlow.description || `キーワード、E{keyword}」から�E動生成された応急処置フロー`,
            triggerKeywords: parsedFlow.triggerKeywords || [keyword],
            steps: parsedFlow.steps || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedBy: 'GPT-4'
          };

          console.log('[api/emergency-flow/generate] ✁EFlow generated with', flowTemplate.steps.length, 'steps');
        } catch (gptError) {
          console.error('[api/emergency-flow/generate] ❁EGPT generation failed:', gptError.message);
          // GPT失敗時はフォールバック
          flowTemplate = createFallbackTemplate(flowId, keyword);
        }
      } else {
        console.warn('[api/emergency-flow/generate] ⚠�E�EOpenAI not available, using fallback template');
        flowTemplate = createFallbackTemplate(flowId, keyword);
      }

      // 🔧 生�Eしたフローを�E動的にBLOBに保孁E      const blobServiceClient = getBlobServiceClient();
      
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          
          // コンチE��が存在するか確認し、なければ作�E
          const containerExists = await containerClient.exists();
          if (!containerExists) {
            console.log('[api/emergency-flow/generate] Creating container:', containerName);
            await containerClient.create();
          }
          
          const fileName = `${flowId}.json`;
          const blobName = norm(`troubleshooting/${fileName}`);
          
          console.log('[api/emergency-flow/generate] ✁ESaving generated flow to BLOB');
          console.log('[api/emergency-flow/generate]   Container:', containerName);
          console.log('[api/emergency-flow/generate]   BLOB path:', blobName);
          console.log('[api/emergency-flow/generate]   File name:', fileName);
          
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const content = JSON.stringify(flowTemplate, null, 2);
          
          await blockBlobClient.upload(content, content.length, {
            blobHTTPHeaders: { blobContentType: 'application/json' },
            metadata: {
              generatedFrom: 'keyword',
              keyword: keyword,
              createdAt: new Date().toISOString()
            }
          });
          
          console.log('[api/emergency-flow/generate] ✁EFlow saved successfully to BLOB:', blobName);
          
          return res.json({
            success: true,
            data: flowTemplate,
            saved: true,
            blobName: blobName,
            fileName: fileName,
            message: `フローを生成してBLOBに保存しました (${blobName})`
          });
        } catch (blobError) {
          console.error('[api/emergency-flow/generate] ❁EBLOB save failed:', blobError);
          console.error('[api/emergency-flow/generate] Error details:', blobError.stack);
          // BLOB保存に失敗してもフローチE�Eタは返す
          return res.json({
            success: true,
            data: flowTemplate,
            saved: false,
            warning: 'フローを生成しましたが、保存に失敗しました',
            error: blobError.message,
            errorStack: blobError.stack
          });
        }
      } else {
        console.warn('[api/emergency-flow/generate] ⚠�E�EBLOB client not available');
        return res.json({
          success: true,
          data: flowTemplate,
          saved: false,
          warning: 'BLOB storage not available - please check AZURE_STORAGE_CONNECTION_STRING'
        });
      }
    } catch (error) {
      console.error('[api/emergency-flow/generate] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/:id - PUT更新�E�編雁E���E差刁E��書き！E  if (pathParts[2] && method === 'PUT') {
    try {
      const flowId = pathParts[2].replace('.json', '');
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      const flowData = req.body;

      console.log('[api/emergency-flow/PUT] Updating flow:', flowId);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 既存�EBLOBを探ぁE      const resolved = await resolveBlobClient(containerClient, fileName);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'フローが見つかりません'
        });
      }

      // updatedAtを更新
      const updatedFlowData = {
        ...flowData,
        updatedAt: new Date().toISOString()
      };

      // 画像数をログ出劁E      const imageCount = updatedFlowData.steps?.reduce((count, step) => {
        return count + (step.images?.length || 0);
      }, 0) || 0;

      console.log(`[api/emergency-flow/PUT] Flow has ${imageCount} images`);

      const content = JSON.stringify(updatedFlowData, null, 2);

      // 差刁E��上書き保存（既存データを完�Eに置き換え！E      const blockBlobClient = containerClient.getBlockBlobClient(resolved.blobName);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
        metadata: {
          lastModified: new Date().toISOString(),
          flowId: flowId
        }
      });

      console.log(`[api/emergency-flow/PUT] ✁EUpdated successfully: ${resolved.blobName}`);

      return res.json({
        success: true,
        message: 'フローを更新しました',
        data: updatedFlowData,
        blobName: resolved.blobName,
        imageCount: imageCount
      });
    } catch (error) {
      console.error('[api/emergency-flow/PUT] ❁EError:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/:id - DELETE削除
  if (pathParts[2] && method === 'DELETE') {
    try {
      const fileName = pathParts[2];
      console.log('[api/emergency-flow/delete] Deleting:', fileName);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const resolved = await resolveBlobClient(containerClient, fileName);

      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'フローが見つかりません'
        });
      }

      // JSONをダウンロードして画像ファイル名を取征E      let imagesToDelete = [];
      try {
        const downloadResponse = await resolved.blobClient.download();
        if (downloadResponse.readableStreamBody) {
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const jsonData = JSON.parse(buffer.toString('utf-8'));
          
          // steps配�Eから画像を抽出
          if (Array.isArray(jsonData.steps)) {
            jsonData.steps.forEach(step => {
              if (step.images && Array.isArray(step.images)) {
                step.images.forEach(image => {
                  if (image.fileName) {
                    imagesToDelete.push(image.fileName);
                  }
                });
              }
            });
          }
        }
      } catch (parseError) {
        console.warn('[api/emergency-flow/delete] Could not parse JSON for image cleanup:', parseError.message);
      }

      // 関連画像を削除
      if (imagesToDelete.length > 0) {
        console.log(`[api/emergency-flow/delete] Deleting ${imagesToDelete.length} related images`);
        for (const imageFileName of imagesToDelete) {
          try {
            const imageBlobName = `knowledge-base/images/emergency-flows/${imageFileName}`;
            const imageBlob = containerClient.getBlockBlobClient(imageBlobName);
            const exists = await imageBlob.exists();
            if (exists) {
              await imageBlob.delete();
              console.log(`[api/emergency-flow/delete] Deleted image: ${imageFileName}`);
            }
          } catch (imgError) {
            console.warn(`[api/emergency-flow/delete] Failed to delete image ${imageFileName}:`, imgError.message);
          }
        }
      }

      // JSONファイルを削除
      await resolved.blobClient.delete();
      console.log(`[api/emergency-flow/delete] Deleted JSON: ${resolved.blobName}`);

      return res.json({
        success: true,
        message: '削除しました',
        deletedFile: fileName,
        deletedImages: imagesToDelete.length
      });
    } catch (error) {
      console.error('[api/emergency-flow/delete] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

// フォールバックチE��プレート生成関数
function createFallbackTemplate(flowId, keyword) {
  return {
    id: flowId,
    title: keyword,
    description: `キーワード、E{keyword}」から�E動生成された応急処置フロー`,
    triggerKeywords: [keyword],
    steps: [
      {
        id: 'step1',
        type: 'step',
        title: '安�E確誁E,
        description: '作業エリアの安�Eを確認し、忁E��な保護具を着用してください、E,
        message: '作業エリアの安�Eを確認し、忁E��な保護具を着用してください、E,
        nextStep: 'step2'
      },
      {
        id: 'step2',
        type: 'step',
        title: '痁E��の確誁E,
        description: `${keyword}の痁E��を詳しく確認してください。`,
        message: `${keyword}の痁E��を詳しく確認してください。`,
        nextStep: 'step3'
      },
      {
        id: 'step3',
        type: 'decision',
        title: '状況判断',
        description: '現在の状況を選択してください、E,
        message: '現在の状況を選択してください、E,
        options: [
          { label: '軽微な問顁E, nextStep: 'step4' },
          { label: '深刻な問顁E, nextStep: 'step5' },
          { label: '緊急対応忁E��E, nextStep: 'step6' },
          { label: '不�E', nextStep: 'step7' }
        ]
      },
      {
        id: 'step4',
        type: 'step',
        title: '応急処置',
        description: '基本皁E��点検と調整を行ってください、E,
        message: '基本皁E��点検と調整を行ってください、E,
        nextStep: 'complete'
      },
      {
        id: 'step5',
        type: 'step',
        title: '詳細点椁E,
        description: '詳細な点検を実施し、問題箁E��を特定してください、E,
        message: '詳細な点検を実施し、問題箁E��を特定してください、E,
        nextStep: 'step8'
      },
      {
        id: 'step6',
        type: 'step',
        title: '緊急対忁E,
        description: '直ちに専門技術老E��連絡し、指示を仰ぁE��ください、E,
        message: '直ちに専門技術老E��連絡し、指示を仰ぁE��ください、E,
        nextStep: 'complete'
      },
      {
        id: 'step7',
        type: 'step',
        title: '専門家への相諁E,
        description: '判断が困難な場合�E、専門技術老E��連絡してください、E,
        message: '判断が困難な場合�E、専門技術老E��連絡してください、E,
        nextStep: 'complete'
      },
      {
        id: 'step8',
        type: 'step',
        title: '報呁E,
        description: '確認した�E容を記録し、E��係老E��報告してください、E,
        message: '確認した�E容を記録し、E��係老E��報告してください、E,
        nextStep: 'complete'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedBy: 'Fallback Template'
  };
}

export const methods = ['get', 'post', 'delete', 'put'];
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      const flowData = req.body;

      console.log('[api/emergency-flow/PUT] Updating flow:', flowId);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 既存�EBLOBを探ぁE      const resolved = await resolveBlobClient(containerClient, fileName);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'フローが見つかりません'
        });
      }

      // updatedAtを更新
      const updatedFlowData = {
