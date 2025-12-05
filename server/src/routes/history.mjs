import express from 'express';
import path from 'path';
import { getBlobServiceClient, containerName, norm, upload, streamToBuffer } from '../infra/blob.mjs';
import { AZURE_STORAGE_CONNECTION_STRING } from '../config/env.mjs';

const router = express.Router();

// Upload image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'ファイルがアップロードされていません'
        });
      }

      console.log(`[history/upload-image] Attempt ${attempt}/${maxRetries}:`, {
        fileName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOBストレージが利用できません'
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

      const uploadPromise = blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        },
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('BLOB upload timeout (30s)')), 30000);
      });

      await Promise.race([uploadPromise, timeoutPromise]);

      console.log(`[history/upload-image] Uploaded: ${blobName}`);

      const imageUrl = `/api/images/chat-exports/${fileName}`;

      return res.json({
        success: true,
        imageUrl: imageUrl,
        fileName: fileName,
        blobName: blobName,
        size: req.file.size
      });
    } catch (error) {
      lastError = error;
      console.error(`[history/upload-image] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
    }
  }

  return res.status(500).json({
    success: false,
    error: '画像のアップロードに失敗しました',
    details: lastError?.message
  });
});

// Get export file
router.get('/exports/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log(`[history/exports] Request: ${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
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
    console.error('[history/exports] Error:', error);
    res.status(404).json({
      success: false,
      error: 'ファイルが見つかりません',
      details: error.message,
    });
  }
});

// List export files
router.get('/export-files', async (req, res) => {
  try {
    console.log('[history/export-files] Fetching export files');
    const blobServiceClient = getBlobServiceClient();
    const items = [];

    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('knowledge-base/exports/');
        
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
      } catch (blobError) {
        console.error('[history/export-files] Blob error:', blobError);
      }
    }

    res.json({
      success: true,
      files: items,
      count: items.length
    });
  } catch (error) {
    console.error('[history/export-files] Error:', error);
    res.status(500).json({
      success: false,
      error: 'ファイル一覧の取得に失敗しました'
    });
  }
});

// Delete history
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[history/delete] Request: ${id}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ success: false, error: 'BLOB storage not available' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const prefix = norm('knowledge-base/exports/');
    let deleted = false;

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      if (!blob.name.endsWith('.json')) continue;

      const fileName = blob.name.split('/').pop();
      if (fileName.includes(id)) {
        const blobClient = containerClient.getBlobClient(blob.name);
        await blobClient.delete();
        deleted = true;
        console.log(`[history/delete] Deleted: ${blob.name}`);
        break;
      }
    }

    if (deleted) {
      res.json({ success: true, message: '削除しました' });
    } else {
      res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
    }
  } catch (error) {
    console.error('[history/delete] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default function registerHistoryRoutes(app) {
  app.use('/api/history', router);
}
