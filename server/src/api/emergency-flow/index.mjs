// ESM形式 - 応急復旧フローエンドポイント
// /api/emergency-flow/* にマッピング

import fs from 'fs';
import { getBlobServiceClient, containerName, norm, upload } from '../../infra/blob.mjs';
import { getOpenAIClient, isOpenAIAvailable } from '../../infra/openai.mjs';
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
      console.log('[api/emergency-flow/list] 🔍 BLOB接続診断開始');
      console.log('[api/emergency-flow/list] 環境変数:', {
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '設定済み' : '未設定',
        BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || 'デフォルト'
      });
      
      const flows = [];
      const blobServiceClient = getBlobServiceClient();
      console.log('[api/emergency-flow/list] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');

      if (!blobServiceClient) {
        console.warn('[api/emergency-flow/list] ❌ BLOB client not available');
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

  // /api/emergency-flow/detail/:id - GET詳細取得（JSONパース済み）
  if (pathParts[2] === 'detail' && pathParts[3] && method === 'GET') {
    try {
      const flowId = pathParts[3].replace('.json', '');
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      console.log(`[api/emergency-flow/detail] Fetching detail: ${flowId}`);
      console.log('[api/emergency-flow/detail] 🔍 BLOB接続診断開始');
      console.log('[api/emergency-flow/detail] 環境変数:', {
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '設定済み' : '未設定',
        BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || 'デフォルト'
      });

      const blobServiceClient = getBlobServiceClient();
      console.log('[api/emergency-flow/detail] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');
      
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      console.log('[api/emergency-flow/detail] コンテナ名:', containerName);
      
      const resolved = await resolveBlobClient(containerClient, fileName);
      if (!resolved) {
        console.warn('[api/emergency-flow/detail] ❌ Blob not found for', fileName);
        return res.status(404).json({ 
          success: false, 
          error: 'フローが見つかりません',
          fileName: fileName,
          flowId: flowId
        });
      }

      console.log(`[api/emergency-flow/detail] ✅ BLOB path: ${resolved.blobName}`);
      const downloadResponse = await resolved.blobClient.download();
      
      // JSONとしてパースして返す
      const chunks = [];
      if (downloadResponse.readableStreamBody) {
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const jsonData = JSON.parse(buffer.toString('utf8'));
        
        console.log('[api/emergency-flow/detail] ✅ フロー詳細取得完了');
        console.log('[api/emergency-flow/detail] steps:', jsonData.steps?.length || 0, '件');
        
        return res.json({
          success: true,
          data: jsonData,
          ...jsonData
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'データの読み込みに失敗しました'
      });
    } catch (error) {
      console.error('[api/emergency-flow/detail] ❌ Error:', error);
      return res.status(404).json({
        success: false,
        error: 'フロー詳細の取得に失敗しました',
        details: error.message
      });
    }
  }

  // /api/emergency-flow/:fileName - GET個別取得（生データ）
  if (pathParts[2] && !pathParts[2].includes('list') && !pathParts[2].includes('detail') && !pathParts[2].includes('image') && !pathParts[2].includes('save') && !pathParts[2].includes('generate') && method === 'GET') {
    try {
      const fileName = pathParts[2];
      console.log(`[api/emergency-flow] Fetching: ${fileName}`);
      console.log('[api/emergency-flow] 🔍 BLOB接続診断開始');

      const blobServiceClient = getBlobServiceClient();
      console.log('[api/emergency-flow] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');
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
        console.error('[api/emergency-flow/save] ❌ BLOB service client not available');
        return res.status(503).json({ 
          success: false, 
          error: 'BLOB storage not available' 
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // コンテナが存在するか確認
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.log('[api/emergency-flow/save] Creating container:', containerName);
        await containerClient.create();
      }
      
      // 既存データとの互換性のため base付きとなし両方で保存を試みる
      const blobNamePrimary = norm(`troubleshooting/${flowId || 'flow-' + Date.now()}.json`);
      const blobClientPrimary = containerClient.getBlockBlobClient(blobNamePrimary);

      const content = typeof flowData === 'string' ? flowData : JSON.stringify(flowData, null, 2);

      console.log('[api/emergency-flow/save] ✅ Saving flow data to BLOB');
      console.log('[api/emergency-flow/save]   Container:', containerName);
      console.log('[api/emergency-flow/save]   BLOB path:', blobNamePrimary);
      console.log('[api/emergency-flow/save]   Flow ID:', flowId);

      await blobClientPrimary.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log(`[api/emergency-flow/save] ✅ Saved successfully to: ${blobNamePrimary}`);

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

  // /api/emergency-flow/generate - POSTフロー生成（GPT統合）
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

      const timestamp = Date.now();
      const flowId = `flow_${timestamp}`;
      let flowTemplate;

      // OpenAI APIを使用してフロー生成
      if (isOpenAIAvailable) {
        console.log('[api/emergency-flow/generate] 🤖 Using OpenAI to generate flow for keyword:', keyword);
        const openai = getOpenAIClient();

        const prompt = `建設機械の応急処置フローをJSON形式で生成してください。
キーワード: ${keyword}

以下の構造でJSONを生成してください:
{
  "title": "フローのタイトル（${keyword}に関連）",
  "description": "フローの説明",
  "triggerKeywords": ["${keyword}", "関連キーワード1", "関連キーワード2"],
  "steps": [
    {
      "id": "step1",
      "type": "step",
      "title": "ステップのタイトル",
      "description": "詳細な説明",
      "message": "作業者へのメッセージ",
      "nextStep": "step2"
    },
    {
      "id": "step2",
      "type": "decision",
      "title": "判断ポイント",
      "description": "状況判断の説明",
      "message": "判断メッセージ",
      "options": [
        { "label": "選択肢1", "nextStep": "step3" },
        { "label": "選択肢2", "nextStep": "step4" }
      ]
    }
  ]
}

注意事項:
- stepタイプ: 通常の作業ステップ（nextStepで次のステップIDを指定）
- decisionタイプ: 判断分岐ポイント（optionsで選択肢を提供）
- 最終ステップのnextStepは "complete" にする
- 安全確認、症状確認、応急処置、報告の流れを含める
- 建設機械の専門用語を使用し、実践的な内容にする`;

        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'あなたは建設機械の保守・メンテナンスの専門家です。安全で実践的な応急処置フローを生成してください。'
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
          console.log('[api/emergency-flow/generate] ✅ GPT response received');
          
          const parsedFlow = JSON.parse(gptResponse);
          
          flowTemplate = {
            id: flowId,
            title: parsedFlow.title || keyword,
            description: parsedFlow.description || `キーワード「${keyword}」から自動生成された応急処置フロー`,
            triggerKeywords: parsedFlow.triggerKeywords || [keyword],
            steps: parsedFlow.steps || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedBy: 'GPT-4'
          };

          console.log('[api/emergency-flow/generate] ✅ Flow generated with', flowTemplate.steps.length, 'steps');
        } catch (gptError) {
          console.error('[api/emergency-flow/generate] ❌ GPT generation failed:', gptError.message);
          // GPT失敗時はフォールバック
          flowTemplate = createFallbackTemplate(flowId, keyword);
        }
      } else {
        console.warn('[api/emergency-flow/generate] ⚠️ OpenAI not available, using fallback template');
        flowTemplate = createFallbackTemplate(flowId, keyword);
      }

      // 🔧 生成したフローを自動的にBLOBに保存
      console.log('[api/emergency-flow/generate] 🔍 BLOB保存診断開始');
      console.log('[api/emergency-flow/generate] 環境変数:', {
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '設定済み' : '未設定',
        BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || 'デフォルト'
      });
      
      const blobServiceClient = getBlobServiceClient();
      console.log('[api/emergency-flow/generate] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');
      
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          console.log('[api/emergency-flow/generate] コンテナ名:', containerName);
          
          // コンテナが存在するか確認し、なければ作成
          const containerExists = await containerClient.exists();
          console.log('[api/emergency-flow/generate] コンテナ存在確認:', containerExists ? 'あり' : 'なし');
          if (!containerExists) {
            console.log('[api/emergency-flow/generate] Creating container:', containerName);
            await containerClient.create();
          }
          
          const fileName = `${flowId}.json`;
          const blobName = norm(`troubleshooting/${fileName}`);
          
          console.log('[api/emergency-flow/generate] ✅ Saving generated flow to BLOB');
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
          
          console.log('[api/emergency-flow/generate] ✅ Flow saved successfully to BLOB:', blobName);
          
          return res.json({
            success: true,
            data: flowTemplate,
            saved: true,
            blobName: blobName,
            fileName: fileName,
            message: `フローを生成してBLOBに保存しました (${blobName})`
          });
        } catch (blobError) {
          console.error('[api/emergency-flow/generate] ❌ BLOB save failed:', blobError);
          console.error('[api/emergency-flow/generate] Error details:', blobError.stack);
          // BLOB保存に失敗してもフローデータは返す
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
        console.warn('[api/emergency-flow/generate] ⚠️ BLOB client not available');
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

  // /api/emergency-flow/:id - PUT更新（編集後の差分上書き）
  if (pathParts[2] && method === 'PUT') {
    try {
      const flowId = pathParts[2].replace('.json', '');
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      const flowData = req.body;

      console.log('[api/emergency-flow/PUT] Updating flow:', flowId);
      console.log('[api/emergency-flow/PUT] 🔍 BLOB更新診断開始');
      console.log('[api/emergency-flow/PUT] 環境変数:', {
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '設定済み' : '未設定',
        BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || 'デフォルト'
      });

      const blobServiceClient = getBlobServiceClient();
      console.log('[api/emergency-flow/PUT] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 既存のBLOBを探す
      const resolved = await resolveBlobClient(containerClient, fileName);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'フローが見つかりません'
        });
      }

      // 🔍 既存のフローデータを取得して画像の差分を確認
      let oldImageFileNames = new Set();
      try {
        const downloadResponse = await resolved.blobClient.download();
        if (downloadResponse.readableStreamBody) {
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const oldJsonData = JSON.parse(buffer.toString('utf-8'));
          
          // 既存フローの画像ファイル名を収集
          if (Array.isArray(oldJsonData.steps)) {
            oldJsonData.steps.forEach(step => {
              if (step.images && Array.isArray(step.images)) {
                step.images.forEach(image => {
                  if (image.fileName) {
                    oldImageFileNames.add(image.fileName);
                  }
                });
              }
            });
          }
          console.log(`[api/emergency-flow/PUT] 既存フローの画像数: ${oldImageFileNames.size}`);
        }
      } catch (downloadError) {
        console.warn('[api/emergency-flow/PUT] Could not download old flow for diff:', downloadError.message);
      }

      // updatedAtを更新
      const updatedFlowData = {
        ...flowData,
        updatedAt: new Date().toISOString()
      };

      // 新しいフローの画像ファイル名を収集
      const newImageFileNames = new Set();
      if (Array.isArray(updatedFlowData.steps)) {
        updatedFlowData.steps.forEach(step => {
          if (step.images && Array.isArray(step.images)) {
            step.images.forEach(image => {
              if (image.fileName) {
                newImageFileNames.add(image.fileName);
              }
            });
          }
        });
      }

      // 画像数をログ出力
      const imageCount = newImageFileNames.size;
      console.log(`[api/emergency-flow/PUT] 新しいフローの画像数: ${imageCount}`);

      // 🗑️ 削除された画像をクリーンアップ
      const imagesToDelete = [...oldImageFileNames].filter(fileName => !newImageFileNames.has(fileName));
      if (imagesToDelete.length > 0) {
        console.log(`[api/emergency-flow/PUT] 🗑️ 削除対象の画像: ${imagesToDelete.length}件`);
        console.log('[api/emergency-flow/PUT] 削除対象:', imagesToDelete);
        
        let deletedCount = 0;
        for (const imageFileName of imagesToDelete) {
          try {
            const imageBlobName = `knowledge-base/images/emergency-flows/${imageFileName}`;
            const imageBlob = containerClient.getBlockBlobClient(imageBlobName);
            const exists = await imageBlob.exists();
            if (exists) {
              await imageBlob.delete();
              deletedCount++;
              console.log(`[api/emergency-flow/PUT] ✅ 画像削除成功: ${imageFileName}`);
            } else {
              console.log(`[api/emergency-flow/PUT] ⚠️ 画像が既に存在しません: ${imageFileName}`);
            }
          } catch (imgError) {
            console.warn(`[api/emergency-flow/PUT] ❌ 画像削除失敗 ${imageFileName}:`, imgError.message);
          }
        }
        console.log(`[api/emergency-flow/PUT] 画像クリーンアップ完了: ${deletedCount}/${imagesToDelete.length}件削除`);
      } else {
        console.log('[api/emergency-flow/PUT] 削除対象の画像はありません');
      }

      const content = JSON.stringify(updatedFlowData, null, 2);

      // 差分で上書き保存（既存データを完全に置き換え）
      const blockBlobClient = containerClient.getBlockBlobClient(resolved.blobName);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
        metadata: {
          lastModified: new Date().toISOString(),
          flowId: flowId
        }
      });

      console.log(`[api/emergency-flow/PUT] ✅ Updated successfully: ${resolved.blobName}`);

      return res.json({
        success: true,
        message: 'フローを更新しました',
        data: updatedFlowData,
        blobName: resolved.blobName,
        imageCount: imageCount,
        deletedImages: imagesToDelete.length
      });
    } catch (error) {
      console.error('[api/emergency-flow/PUT] ❌ Error:', error);
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

// フォールバックテンプレート生成関数
function createFallbackTemplate(flowId, keyword) {
  return {
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
    updatedAt: new Date().toISOString(),
    generatedBy: 'Fallback Template'
  };
}
export const methods = ['get', 'post', 'put', 'delete'];
