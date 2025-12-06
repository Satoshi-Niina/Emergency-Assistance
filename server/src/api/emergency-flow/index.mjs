// ESM形式 - 応急復旧フローエンドポイント
// /api/emergency-flow/* にマッピング

import fs from 'fs';
import { getBlobServiceClient, containerName, norm, upload } from '../../infra/blob.mjs';
import path from 'path';

// 複数パスを試して既存データのプレフィックス違いに対応
function buildCandidatePaths(fileName, skipNorm = false) {
  const baseName = fileName || '';
  const paths = [
    // 現行: base付き（normで knowledge-base/ が付与される）
    skipNorm ? null : norm(`troubleshooting/${baseName}`),
    // 旧: baseなし
    `troubleshooting/${baseName}`,
    // 念のため: baseを直書き
    `knowledge-base/troubleshooting/${baseName}`,
  ].filter(Boolean);
  // 重複排除
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

        // まず現行パス（norm）で列挙し、0件なら旧パスも試す
        const prefixes = [norm('troubleshooting/'), 'troubleshooting/', 'knowledge-base/troubleshooting/'];
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
          if (flows.length > 0) break; // 何か取れたら終了
        }
        
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

  // /api/emergency-flow/:fileName - GET個別取得
  if (pathParts[2] && !pathParts[2].includes('list') && !pathParts[2].includes('image') && !pathParts[2].includes('save') && method === 'GET') {
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

  // /api/emergency-flow/save - POST保存
  if (pathParts[2] === 'save' && method === 'POST') {
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
        return res.status(503).json({ 
          success: false, 
          error: 'BLOB storage not available' 
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // 既存データとの互換性のため base付きとなし両方で保存を試みる
      const blobNamePrimary = norm(`troubleshooting/${flowId || 'flow-' + Date.now()}.json`);
      const blobClientPrimary = containerClient.getBlockBlobClient(blobNamePrimary);

      const content = typeof flowData === 'string' ? flowData : JSON.stringify(flowData, null, 2);

      await blobClientPrimary.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log(`[api/emergency-flow/save] Saved to: ${blobNamePrimary}`);

      // baseなしプレフィックスにもベストエフォートで保存（既存ファイル構造との互換性）
      try {
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

  // /api/emergency-flow/upload-image - POST画像アップロード
  if (pathParts[2] === 'upload-image' && method === 'POST') {
    // multerミドルウェアを手動で適用
    return upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('[api/emergency-flow/upload-image] Upload error:', err);
        return res.status(500).json({
          success: false,
          error: 'ファイルのアップロードに失敗しました',
          details: err.message
        });
      }

      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'ファイルがアップロードされていません'
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

        // 開発環境: BLOBが利用できない場合はローカル保存
        if (!blobServiceClient) {
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

        // 本番環境: BLOBに保存
        const containerClient = blobServiceClient.getContainerClient(containerName);
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
          error: '画像のアップロードに失敗しました',
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

  // /api/emergency-flow/generate - POSTフロー生成（AI未対応のため簡易テンプレート返却）
  if (pathParts[2] === 'generate' && method === 'POST') {
    try {
      const { keyword } = req.body;
      console.log('[api/emergency-flow/generate] Generate request:', keyword);

      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: 'キーワードが必要です'
        });
      }

      // 簡易テンプレート（OpenAI統合は別途実装）
      const timestamp = Date.now();
      const flowId = `flow_${keyword}_${timestamp}`;
      const flowTemplate = {
        id: flowId,
        title: keyword,
        description: `キーワード「${keyword}」から自動生成された応急処置フロー`,
        triggerKeywords: [keyword],
        steps: [
          {
            id: 'step1',
            type: 'step',
            title: '安全確認',
            description: '作業エリアの安全を確認し、必要な保護具を着用してください。',
            message: '作業エリアの安全を確認し、必要な保護具を着用してください。',
            nextStep: 'step2'
          },
          {
            id: 'step2',
            type: 'step',
            title: '症状の確認',
            description: `${keyword}の症状を詳しく確認してください。`,
            message: `${keyword}の症状を詳しく確認してください。`,
            nextStep: 'step3'
          },
          {
            id: 'step3',
            type: 'decision',
            title: '状況判断',
            description: '現在の状況を選択してください。',
            message: '現在の状況を選択してください。',
            options: [
              { label: '軽微な問題', nextStep: 'step4' },
              { label: '深刻な問題', nextStep: 'step5' },
              { label: '緊急対応必要', nextStep: 'step6' },
              { label: '不明', nextStep: 'step7' }
            ]
          },
          {
            id: 'step4',
            type: 'step',
            title: '応急処置',
            description: '基本的な点検と調整を行ってください。',
            message: '基本的な点検と調整を行ってください。',
            nextStep: 'complete'
          },
          {
            id: 'step5',
            type: 'step',
            title: '詳細点検',
            description: '詳細な点検を実施し、問題箇所を特定してください。',
            message: '詳細な点検を実施し、問題箇所を特定してください。',
            nextStep: 'step8'
          },
          {
            id: 'step6',
            type: 'step',
            title: '緊急対応',
            description: '直ちに専門技術者に連絡し、指示を仰いでください。',
            message: '直ちに専門技術者に連絡し、指示を仰いでください。',
            nextStep: 'complete'
          },
          {
            id: 'step7',
            type: 'step',
            title: '専門家への相談',
            description: '判断が困難な場合は、専門技術者に連絡してください。',
            message: '判断が困難な場合は、専門技術者に連絡してください。',
            nextStep: 'complete'
          },
          {
            id: 'step8',
            type: 'step',
            title: '報告',
            description: '確認した内容を記録し、関係者に報告してください。',
            message: '確認した内容を記録し、関係者に報告してください。',
            nextStep: 'complete'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 🔧 生成したフローを自動的にBLOBに保存
      const blobServiceClient = getBlobServiceClient();
      
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const fileName = `${flowId}.json`;
          const blobName = norm(`troubleshooting/${fileName}`);
          
          console.log('[api/emergency-flow/generate] Saving generated flow to BLOB:', blobName);
          
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
          
          console.log('[api/emergency-flow/generate] Flow saved successfully to BLOB');
          
          return res.json({
            success: true,
            data: flowTemplate,
            saved: true,
            blobName: blobName,
            fileName: fileName,
            message: 'フローを生成してBLOBに保存しました'
          });
        } catch (blobError) {
          console.error('[api/emergency-flow/generate] BLOB save failed:', blobError);
          // BLOB保存に失敗してもフローデータは返す
          return res.json({
            success: true,
            data: flowTemplate,
            saved: false,
            warning: 'フローを生成しましたが、保存に失敗しました',
            error: blobError.message
          });
        }
      } else {
        console.warn('[api/emergency-flow/generate] BLOB client not available');
        return res.json({
          success: true,
          data: flowTemplate,
          saved: false,
          warning: 'BLOB storage not available'
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

      // JSONをダウンロードして画像ファイル名を取得
      let imagesToDelete = [];
      try {
        const downloadResponse = await resolved.blobClient.download();
        if (downloadResponse.readableStreamBody) {
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const jsonData = JSON.parse(buffer.toString('utf-8'));
          
          // steps配列から画像を抽出
          if (Array.isArray(jsonData.steps)) {
            jsonData.steps.forEach(step => {
              if (step.imageUrl) {
                const imgFileName = step.imageUrl.split('/').pop();
                if (imgFileName && !imgFileName.startsWith('http')) {
                  imagesToDelete.push(imgFileName);
                }
              }
            });
          }
        }
      } catch (parseError) {
        console.warn('[api/emergency-flow/delete] Failed to parse images:', parseError.message);
      }

      console.log(`[api/emergency-flow/delete] Found ${imagesToDelete.length} images to delete`);

      // 関連する画像をBLOBから削除
      for (const imgFileName of imagesToDelete) {
        try {
          const imageBlobName = `knowledge-base/images/emergency-flows/${imgFileName}`;
          const imageBlob = containerClient.getBlobClient(imageBlobName);
          const exists = await imageBlob.exists();
          
          if (exists) {
            await imageBlob.delete();
            console.log(`[api/emergency-flow/delete] Deleted image: ${imageBlobName}`);
          }
        } catch (imgError) {
          console.warn(`[api/emergency-flow/delete] Failed to delete image:`, imgError.message);
          // 画像削除失敗は警告のみ、処理は継続
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

export const methods = ['get', 'post', 'delete', 'put'];
