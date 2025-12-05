// ESM形式 - 履歴管理エンドポイント
// /api/history/* にマッピング

import path from 'path';
import { getBlobServiceClient, containerName, norm, upload } from '../shared/blob.mjs';

// アップロード用のミドルウェアラッパー
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[history/upload] Multer error:', err);
      return res.status(400).json({
        success: false,
        error: 'ファイルアップロードエラー',
        details: err.message
      });
    }
    next();
  });
}

export default async function historyHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(Boolean);
  
  // /api/history/export-files
  if (pathParts[2] === 'export-files' && method === 'GET') {
    try {
      console.log('[api/history/export-files] Fetching export files');
      const blobServiceClient = getBlobServiceClient();
      const items = [];

      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const prefix = norm('knowledge-base/exports/');
          console.log(`[api/history/export-files] BLOB prefix: ${prefix}`);

          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (blob.name.endsWith('.json')) {
              const fileName = blob.name.split('/').pop();
              items.push({
                id: fileName.replace('.json', ''),
                fileName: fileName,
                blobName: blob.name,
                lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
                size: blob.properties.contentLength || 0
              });
            }
          }
          console.log(`[api/history/export-files] Found ${items.length} export files`);
        } catch (blobError) {
          console.error('[api/history/export-files] BLOB error:', blobError);
        }
      } else {
        console.warn('[api/history/export-files] BLOB client not available');
      }

      return res.json({
        success: true,
        data: items,
        total: items.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/history/export-files] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'エクスポートファイル一覧の取得に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // /api/history/exports/:fileName - JSON取得
  if (pathParts[2] === 'exports' && pathParts[3] && method === 'GET') {
    try {
      const fileName = pathParts[3];
      console.log(`[api/history/exports] Fetching: ${fileName}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/exports/${fileName}`);
      const blobClient = containerClient.getBlobClient(blobName);

      const downloadResponse = await blobClient.download();
      const contentType = downloadResponse.contentType || 'application/json';

      res.setHeader('Content-Type', contentType);
      downloadResponse.readableStreamBody.pipe(res);
    } catch (error) {
      console.error('[api/history/exports] Error:', error);
      return res.status(404).json({
        success: false,
        error: 'ファイルが見つかりません',
        details: error.message
      });
    }
    return;
  }

  // /api/history/upload-image - 画像アップロード
  if (pathParts[2] === 'upload-image' && method === 'POST') {
    // multerミドルウェアを手動実行
    return handleUpload(req, res, async () => {
      try {
        if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '画像ファイルが指定されていません'
        });
      }

      console.log('[api/history/upload-image] Uploading:', {
        fileName: req.file.originalname,
        size: req.file.size
      });

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const fileName = `chat_image_${timestamp}${ext}`;

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/images/chat-exports/${fileName}`);
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

      console.log('[api/history/upload-image] Uploaded:', blobName);

      return res.json({
        success: true,
        imageUrl: `/api/images/chat-exports/${fileName}`,
        fileName: fileName,
        blobName: blobName,
        size: req.file.size
      });
      } catch (error) {
        console.error('[api/history/upload-image] Error:', error);
        return res.status(500).json({
          success: false,
          error: '画像のアップロードに失敗しました',
          details: error.message
        });
      }
    });
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

export const methods = ['get', 'post'];
