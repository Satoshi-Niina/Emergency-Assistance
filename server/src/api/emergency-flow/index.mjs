// ESM形式 - 応急復旧フローエンドポイント
// /api/emergency-flow/* にマッピング

import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';

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
        // norm関数は環境変数を考慮してプレフィックスを付与するため、ここでは相対パスのみ指定する
        // 元: norm('knowledge-base/troubleshooting/') -> 二重付与の可能性
        // 修正: norm('troubleshooting/')
        const prefix = norm('troubleshooting/');

        console.log(`[api/emergency-flow/list] BLOB prefix: ${prefix}`);

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

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (blob.name.endsWith('.json')) {
            const fileName = blob.name.split('/').pop();
            flows.push({
              id: fileName.replace('.json', ''),
              name: fileName,
              blobName: blob.name,
              lastModified: blob.properties.lastModified,
              size: blob.properties.contentLength,
            });
          }
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
      // norm関数は環境変数を考慮してプレフィックスを付与するため、ここでは相対パスのみ指定する
      // 元: norm('knowledge-base/troubleshooting/${fileName}') -> 二重付与の可能性
      // 修正: norm('troubleshooting/${fileName}')
      const blobName = norm(`troubleshooting/${fileName}`);
      console.log(`[api/emergency-flow] BLOB path: ${blobName}`);
      
      const blobClient = containerClient.getBlobClient(blobName);

      const downloadResponse = await blobClient.download();
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
      // norm関数は環境変数を考慮してプレフィックスを付与するため、ここでは相対パスのみ指定する
      // 元: norm('knowledge-base/troubleshooting/${flowId || ...}') -> 二重付与の可能性
      // 修正: norm('troubleshooting/${flowId || ...}')
      const blobName = norm(`troubleshooting/${flowId || 'flow-' + Date.now()}.json`);
      const blobClient = containerClient.getBlockBlobClient(blobName);

      const content = typeof flowData === 'string' ? flowData : JSON.stringify(flowData, null, 2);

      await blobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log(`[api/emergency-flow/save] Saved to: ${blobName}`);

      return res.json({
        success: true,
        message: 'Flow data saved successfully',
        blobName: blobName,
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
