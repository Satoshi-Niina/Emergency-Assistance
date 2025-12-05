// ESM形式 - トラブルシューティングエンドポイント
// /api/troubleshooting/* にマッピング

import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';

export default async function troubleshootingHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(Boolean);

  // /api/troubleshooting/list
  if (pathParts[2] === 'list' && method === 'GET') {
    try {
      console.log('[api/troubleshooting/list] Fetching list');

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const listOptions = {
        prefix: norm('knowledge-base/troubleshooting/')
      };

      const troubleshootingList = [];
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        if (blob.name.endsWith('.json')) {
          try {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const downloadResponse = await blockBlobClient.download();
            const chunks = [];
            
            if (downloadResponse.readableStreamBody) {
              for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              const buffer = Buffer.concat(chunks);
              const jsonData = JSON.parse(buffer.toString('utf-8'));
              
              troubleshootingList.push({
                id: jsonData.id || blob.name.split('/').pop().replace('.json', ''),
                title: jsonData.title || 'Untitled',
                description: jsonData.description || '',
                lastModified: blob.properties.lastModified,
                blobName: blob.name
              });
            }
          } catch (error) {
            console.error(`[api/troubleshooting/list] Error parsing: ${blob.name}`, error);
          }
        }
      }

      console.log(`[api/troubleshooting/list] Found: ${troubleshootingList.length} items`);

      return res.json({
        success: true,
        data: troubleshootingList,
        message: `トラブルシューティングリスト取得成功: ${troubleshootingList.length}件`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/troubleshooting/list] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'リストの取得に失敗しました',
        details: error.message
      });
    }
  }

  // /api/troubleshooting/:id - GET個別取得
  if (pathParts[2] && pathParts[2] !== 'list' && method === 'GET') {
    try {
      const id = pathParts[2];
      console.log(`[api/troubleshooting/:id] Fetching: ${id}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(404).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        console.warn(`[api/troubleshooting/:id] Not found: ${blobName}`);
        return res.status(404).json({
          success: false,
          message: `トラブルシューティングが見つかりません: ${id}`
        });
      }

      const downloadResponse = await blockBlobClient.download();
      if (downloadResponse.readableStreamBody) {
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const jsonData = JSON.parse(buffer.toString('utf-8'));

        console.log(`[api/troubleshooting/:id] Found: ${id}`);
        return res.json({
          success: true,
          data: jsonData,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'データの読み込みに失敗しました'
      });
    } catch (error) {
      console.error(`[api/troubleshooting/:id] Error:`, error);
      return res.status(500).json({
        success: false,
        error: 'データの取得に失敗しました',
        details: error.message
      });
    }
  }

  // /api/troubleshooting - POST新規作成
  if (!pathParts[2] && method === 'POST') {
    try {
      const flowData = req.body;
      console.log('[api/troubleshooting POST] Creating:', flowData.id || 'new');

      if (!flowData || !flowData.id) {
        return res.status(400).json({
          success: false,
          message: 'flowDataまたはidが必要です'
        });
      }

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      flowData.createdAt = flowData.createdAt || new Date().toISOString();
      flowData.updatedAt = new Date().toISOString();

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/troubleshooting/${flowData.id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const jsonContent = JSON.stringify(flowData, null, 2);
      const buffer = Buffer.from(jsonContent, 'utf-8');

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });

      console.log(`[api/troubleshooting POST] Created: ${flowData.id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを保存しました',
        data: flowData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/troubleshooting POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: '保存に失敗しました',
        details: error.message
      });
    }
  }

  // /api/troubleshooting/:id - PUT更新
  if (pathParts[2] && method === 'PUT') {
    try {
      const id = pathParts[2];
      const flowData = req.body;
      console.log(`[api/troubleshooting PUT] Updating: ${id}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      flowData.updatedAt = new Date().toISOString();

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const jsonContent = JSON.stringify(flowData, null, 2);
      const buffer = Buffer.from(jsonContent, 'utf-8');

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });

      console.log(`[api/troubleshooting PUT] Updated: ${id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを更新しました',
        data: flowData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[api/troubleshooting PUT] Error:`, error);
      return res.status(500).json({
        success: false,
        error: '更新に失敗しました',
        details: error.message
      });
    }
  }

  // /api/troubleshooting/:id - DELETE削除
  if (pathParts[2] && method === 'DELETE') {
    try {
      const id = pathParts[2];
      console.log(`[api/troubleshooting DELETE] Deleting: ${id}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: `トラブルシューティングが見つかりません: ${id}`
        });
      }

      await blockBlobClient.delete();
      console.log(`[api/troubleshooting DELETE] Deleted: ${id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを削除しました',
        id: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[api/troubleshooting DELETE] Error:`, error);
      return res.status(500).json({
        success: false,
        error: '削除に失敗しました',
        details: error.message
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

export const methods = ['get', 'post', 'put', 'delete'];
