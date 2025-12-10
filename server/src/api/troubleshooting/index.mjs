// ESM形式 - トラブルシューティングエンドポイント
// /api/troubleshooting/* にマッピング

import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';
import { isAzureEnvironment } from '../../config/env.mjs';

export default async function troubleshootingHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(Boolean);

  // /api/troubleshooting/list
  if (pathParts[2] === 'list' && method === 'GET') {
    try {
      console.log('[api/troubleshooting/list] Fetching list');

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[api/troubleshooting/list] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        hasStorageConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        isAzureEnvironment: useAzure
      });

      const troubleshootingList = [];

      // ローカル環境: ローカルファイルシステムから取得
      if (!useAzure) {
        console.log('[api/troubleshooting/list] LOCAL: Using local filesystem');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

        if (fs.existsSync(localDir)) {
          const files = fs.readdirSync(localDir);
          console.log(`[api/troubleshooting/list] LOCAL: Found ${files.length} files`);

          for (const fileName of files) {
            if (!fileName.endsWith('.json')) continue;

            try {
              const filePath = path.join(localDir, fileName);
              const stats = fs.statSync(filePath);
              const content = fs.readFileSync(filePath, 'utf-8');
              const jsonData = JSON.parse(content);

              troubleshootingList.push({
                id: jsonData.id || fileName.replace('.json', ''),
                title: jsonData.title || 'Untitled',
                description: jsonData.description || '',
                lastModified: stats.mtime,
                fileName: fileName,
                storage: 'local'
              });
            } catch (error) {
              console.error(`[api/troubleshooting/list] LOCAL: Error parsing ${fileName}:`, error);
            }
          }
        } else {
          console.log('[api/troubleshooting/list] LOCAL: Directory does not exist:', localDir);
        }

        console.log(`[api/troubleshooting/list] LOCAL: Found ${troubleshootingList.length} items`);

        return res.json({
          success: true,
          data: troubleshootingList,
          message: `トラブルシューティングリスト取得成功: ${troubleshootingList.length}件`,
          storage: 'local',
          timestamp: new Date().toISOString()
        });
      }

      // Azure環境: BLOBストレージから取得
      console.log('[api/troubleshooting/list] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const listOptions = {
        // norm()を使用してBLOB_PREFIXを自動適用（knowledge-base/は重複するので除外）
        prefix: norm('troubleshooting/')
      };

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
                blobName: blob.name,
                storage: 'azure'
              });
            }
          } catch (error) {
            console.error(`[api/troubleshooting/list] AZURE: Error parsing: ${blob.name}`, error);
          }
        }
      }

      console.log(`[api/troubleshooting/list] AZURE: Found ${troubleshootingList.length} items`);

      return res.json({
        success: true,
        data: troubleshootingList,
        message: `トラブルシューティングリスト取得成功: ${troubleshootingList.length}件`,
        storage: 'azure',
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

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[api/troubleshooting/:id] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        isAzureEnvironment: useAzure
      });

      // ローカル環境: ローカルファイルシステムから取得
      if (!useAzure) {
        console.log('[api/troubleshooting/:id] LOCAL: Using local filesystem');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath = path.join(localDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
          console.warn(`[api/troubleshooting/:id] LOCAL: Not found: ${filePath}`);
          return res.status(404).json({
            success: false,
            message: `トラブルシューティングが見つかりません: ${id}`
          });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(content);

        console.log(`[api/troubleshooting/:id] LOCAL: ✅ Found: ${id}`);
        return res.json({
          success: true,
          data: jsonData,
          storage: 'local',
          timestamp: new Date().toISOString()
        });
      }

      // Azure環境: BLOBストレージから取得
      console.log('[api/troubleshooting/:id] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(404).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // norm()を使用してBLOB_PREFIXを自動適用（knowledge-base/は重複するので除外）
      const blobName = norm(`troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        console.warn(`[api/troubleshooting/:id] AZURE: Not found: ${blobName}`);
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

        console.log(`[api/troubleshooting/:id] AZURE: ✅ Found: ${id}`);
        return res.json({
          success: true,
          data: jsonData,
          storage: 'azure',
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

      flowData.createdAt = flowData.createdAt || new Date().toISOString();
      flowData.updatedAt = new Date().toISOString();

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[api/troubleshooting POST] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        isAzureEnvironment: useAzure
      });

      const jsonContent = JSON.stringify(flowData, null, 2);

      // ローカル環境: ローカルファイルシステムに保存
      if (!useAzure) {
        console.log('[api/troubleshooting POST] LOCAL: Using local filesystem');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath = path.join(localDir, `${flowData.id}.json`);

        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }

        fs.writeFileSync(filePath, jsonContent, 'utf-8');
        console.log(`[api/troubleshooting POST] LOCAL: ✅ Created: ${flowData.id}`);

        return res.json({
          success: true,
          message: 'トラブルシューティングを保存しました',
          data: flowData,
          storage: 'local',
          timestamp: new Date().toISOString()
        });
      }

      // Azure環境: BLOBストレージに保存
      console.log('[api/troubleshooting POST] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // norm()を使用してBLOB_PREFIXを自動適用（knowledge-base/は重複するので除外）
      const blobName = norm(`troubleshooting/${flowData.id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const buffer = Buffer.from(jsonContent, 'utf-8');

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });

      console.log(`[api/troubleshooting POST] AZURE: ✅ Created: ${flowData.id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを保存しました',
        data: flowData,
        storage: 'azure',
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

      flowData.updatedAt = new Date().toISOString();

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[api/troubleshooting PUT] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        isAzureEnvironment: useAzure
      });

      const jsonContent = JSON.stringify(flowData, null, 2);

      // ローカル環境: ローカルファイルシステムで更新
      if (!useAzure) {
        console.log('[api/troubleshooting PUT] LOCAL: Using local filesystem');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath = path.join(localDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            success: false,
            message: `トラブルシューティングが見つかりません: ${id}`
          });
        }

        fs.writeFileSync(filePath, jsonContent, 'utf-8');
        console.log(`[api/troubleshooting PUT] LOCAL: ✅ Updated: ${id}`);

        return res.json({
          success: true,
          message: 'トラブルシューティングを更新しました',
          data: flowData,
          storage: 'local',
          timestamp: new Date().toISOString()
        });
      }

      // Azure環境: BLOBストレージで更新
      console.log('[api/troubleshooting PUT] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // norm()を使用してBLOB_PREFIXを自動適用（knowledge-base/は重複するので除外）
      const blobName = norm(`troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const buffer = Buffer.from(jsonContent, 'utf-8');

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });

      console.log(`[api/troubleshooting PUT] AZURE: ✅ Updated: ${id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを更新しました',
        data: flowData,
        storage: 'azure',
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

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[api/troubleshooting DELETE] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        isAzureEnvironment: useAzure
      });

      // ローカル環境: ローカルファイルシステムから削除
      if (!useAzure) {
        console.log('[api/troubleshooting DELETE] LOCAL: Using local filesystem');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath = path.join(localDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            success: false,
            message: `トラブルシューティングが見つかりません: ${id}`
          });
        }

        fs.unlinkSync(filePath);
        console.log(`[api/troubleshooting DELETE] LOCAL: ✅ Deleted: ${id}`);

        return res.json({
          success: true,
          message: 'トラブルシューティングを削除しました',
          id: id,
          storage: 'local',
          timestamp: new Date().toISOString()
        });
      }

      // Azure環境: BLOBストレージから削除
      console.log('[api/troubleshooting DELETE] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          message: 'BLOB service client unavailable'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // norm()を使用してBLOB_PREFIXを自動適用（knowledge-base/は重複するので除外）
      const blobName = norm(`troubleshooting/${id}.json`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: `トラブルシューティングが見つかりません: ${id}`
        });
      }

      await blockBlobClient.delete();
      console.log(`[api/troubleshooting DELETE] AZURE: ✅ Deleted: ${id}`);

      return res.json({
        success: true,
        message: 'トラブルシューティングを削除しました',
        id: id,
        storage: 'azure',
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
