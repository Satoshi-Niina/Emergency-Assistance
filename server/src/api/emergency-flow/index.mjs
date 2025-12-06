// ESM形式 - 応急復旧フローエンドポイント
// /api/emergency-flow/* にマッピング

import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';

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

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

export const methods = ['get', 'post'];
