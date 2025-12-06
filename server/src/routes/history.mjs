import express from 'express';
import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName, norm, upload, streamToBuffer } from '../infra/blob.mjs';
import { AZURE_STORAGE_CONNECTION_STRING } from '../config/env.mjs';
import { dbQuery } from '../infra/db.mjs';

const router = express.Router();

// ID正規化（export_ プレフィックスや拡張子を除去）
const normalizeId = (id = '') => {
  let normalized = id;
  if (normalized.startsWith('export_')) {
    normalized = normalized.replace('export_', '');
  }
  if (normalized.endsWith('.json')) {
    normalized = normalized.replace(/\.json$/, '');
  }
  const parts = normalized.split('_');
  if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
    normalized = parts[1];
  }
  return normalized;
};

// Blobから対象の履歴ファイルを探す
async function findHistoryBlob(containerClient, normalizedId) {
  const prefix = 'knowledge-base/exports/';
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.endsWith('.json')) continue;
    const fileName = blob.name.split('/').pop();
    if (fileName && fileName.includes(normalizedId)) {
      return { blobName: blob.name, fileName };
    }
  }
  return null;
}

// ファイル名やJSONからタイトル・機種情報を抽出
function deriveTitleFromFileName(fileName = '') {
  const nameWithoutExt = fileName.replace(/\.json$/, '');
  const match = nameWithoutExt.match(/^(.+?)_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_/);
  if (match) return match[1];
  const simple = nameWithoutExt.split('_')[0];
  return simple || nameWithoutExt || '故障履歴';
}

function extractMetadataFromJson(json = {}, fileName = '') {
  const chatData = json.chatData || {};
  const machineInfo = chatData.machineInfo || json.machineInfo || {};

  const machineType =
    machineInfo.machineTypeName || json.machineType || 'Unknown';
  const machineNumber =
    machineInfo.machineNumber || json.machineNumber || 'Unknown';

  // 画像抽出: chatData.messages[].media[].url, savedImages 配列
  const images = [];
  const messages = Array.isArray(chatData.messages) ? chatData.messages : [];
  messages.forEach((msg) => {
    const media = Array.isArray(msg.media) ? msg.media : [];
    media.forEach((m) => {
      if (m && (m.url || m.fileName || m.path)) {
        images.push({
          url: m.url || m.fileName || m.path,
          fileName: m.fileName || m.url || m.path,
        });
      }
    });
  });

  const savedImages = Array.isArray(json.savedImages)
    ? json.savedImages
    : Array.isArray(chatData.savedImages)
      ? chatData.savedImages
      : [];

  const mergedImages = [
    ...images,
    ...savedImages.map((img) => {
      if (typeof img === 'string') return { url: img, fileName: img };
      if (img && typeof img === 'object') {
        return {
          url: img.url || img.fileName || img.path,
          fileName: img.fileName || img.url || img.path,
          ...img,
        };
      }
      return { url: '', fileName: '' };
    }),
  ].filter((img) => img.url);

  const title = json.title || chatData.title || deriveTitleFromFileName(fileName);

  return {
    title,
    machineType,
    machineNumber,
    images: mergedImages,
  };
}

// BlobからJSONを取得
async function downloadJson(containerClient, blobName) {
  const blobClient = containerClient.getBlobClient(blobName);
  if (!(await blobClient.exists())) return null;
  const downloadResponse = await blobClient.download();
  const chunks = [];
  if (downloadResponse.readableStreamBody) {
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }
  const buffer = Buffer.concat(chunks);
  return JSON.parse(buffer.toString('utf8'));
}

// オブジェクトをマージ（undefinedは無視）
function mergeData(original, updates) {
  const result = { ...original };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeData(original[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Get history list
router.get('/', async (req, res) => {
  try {
    console.log('[history] Fetching history list');
    const items = [];
    
    // 1. Blobから取得 (優先)
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Blob一覧取得: knowledge-base/exports/
        const prefix = 'knowledge-base/exports/';

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json')) continue;

          const fileName = blob.name.split('/').pop();
          const id = fileName.replace('.json', '');

          let meta = {
            title: deriveTitleFromFileName(fileName),
            machineType: 'Unknown',
            machineNumber: 'Unknown',
            images: [],
          };

          // 可能な限りメタデータを読み出す（軽量化のため読み出し成功時のみ）
          try {
            const blobClient = containerClient.getBlobClient(blob.name);
            const downloadResponse = await blobClient.download();
            if (downloadResponse.readableStreamBody) {
              const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
              const json = JSON.parse(buffer.toString('utf8'));
              meta = extractMetadataFromJson(json, fileName);
            }
          } catch (blobMetaError) {
            console.warn('[history] Metadata read skipped:', fileName, blobMetaError.message);
          }

          items.push({
            id,
            fileName,
            title: meta.title,
            machineType: meta.machineType,
            machineNumber: meta.machineNumber,
            imageCount: meta.images.length,
            images: meta.images,
            createdAt: blob.properties.lastModified,
            lastModified: blob.properties.lastModified,
            source: 'blob'
          });
        }
        console.log(`[history] Found ${items.length} items in Blob`);
      } catch (blobError) {
        console.error('[history] Blob list failed:', blobError.message);
      }
    }

    // 2. DBから取得 (バックアップ/フォールバック) - Blobが空の場合やエラー時のみ、またはマージする
    // ユーザー要望によりファイル優先。DB読み込みは一旦スキップするか、Blobがない場合のみにする
    if (items.length === 0 && dbQuery) {
      try {
        console.log('[history] Blob empty, trying Database...');
        const result = await dbQuery(`
          SELECT id, title, machine_type, machine_number, created_at, user_id
          FROM chat_history
          ORDER BY created_at DESC
          LIMIT 100
        `);
        
        if (result.rows.length > 0) {
           return res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
            source: 'database',
            timestamp: new Date().toISOString()
          });
        }
      } catch (dbError) {
        console.warn('[history] Database query failed:', dbError.message);
      }
    }

    res.json({
      success: true,
      data: items,
      total: items.length,
      source: 'blob',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[history] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get machine data
router.get('/machine-data', async (req, res) => {
  try {
    console.log('[history/machine-data] Fetching machine data');
    const result = await dbQuery(`
      SELECT m.id, m.machine_number, mt.machine_type_name
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      ORDER BY m.machine_number
    `);
    
    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[history/machine-data] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const fileName = `chat_image_${timestamp}${ext}`;
      const blobServiceClient = getBlobServiceClient();

      // Blobが使えない場合はローカルに保存してレスポンスする
      if (!blobServiceClient) {
        const localDir = path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        fs.mkdirSync(localDir, { recursive: true });
        const localPath = path.join(localDir, fileName);
        fs.writeFileSync(localPath, req.file.buffer);

        console.warn('[history/upload-image] Blob unavailable. Saved locally:', localPath);

        return res.json({
          success: true,
          imageUrl: `/api/images/chat-exports/${fileName}`,
          fileName,
          storage: 'local'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      // Blob保存先: knowledge-base/images/chat-exports/ (直接指定)
      const blobName = `knowledge-base/images/chat-exports/${fileName}`;
      console.log('[history/upload-image] Uploading to Blob:', blobName);
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
        size: req.file.size,
        storage: 'blob'
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
    // Blobファイル取得: knowledge-base/exports/
    const blobName = `knowledge-base/exports/${fileName}`;
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
        const prefix = 'knowledge-base/exports/';
        
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (blob.name.endsWith('.json')) {
            const fileName = blob.name.split('/').pop();
            
            // ファイル名からタイトルを抽出（UUID部分を除去）
            let title = fileName.replace('.json', '');
            const titleMatch = title.match(/^(.+?)_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_/);
            if (titleMatch) {
              title = titleMatch[1];
            }
            
            items.push({
              id: fileName.replace('.json', ''),
              fileName: fileName,
              title: title,
              blobName: blob.name,
              createdAt: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
              lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
              exportTimestamp: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
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

// Get history detail by id
async function getHistoryDetail(normalizedId) {
  const blobServiceClient = getBlobServiceClient();
  if (!blobServiceClient) return { status: 503, error: 'BLOB storage not available' };

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const found = await findHistoryBlob(containerClient, normalizedId);
  if (!found) return { status: 404, error: 'ファイルが見つかりません' };

  const blobClient = containerClient.getBlobClient(found.blobName);
  const downloadResponse = await blobClient.download();
  if (!downloadResponse.readableStreamBody) return { status: 500, error: 'ファイル読込に失敗しました' };

  const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
  const json = JSON.parse(buffer.toString('utf8'));

  const meta = extractMetadataFromJson(json, found.fileName);

  return {
    status: 200,
    data: {
      id: normalizedId,
      fileName: found.fileName,
      blobName: found.blobName,
      ...meta,
      json,
    },
  };
}

router.get(['/detail/:id', '/item/:id', '/:id'], async (req, res, next) => {
  // 既存のルート（/exports, /export-files など）より後に解決しないように、パスが数値や既存プレフィックスと衝突する場合はスキップ
  const id = req.params.id;
  if (!id || id === 'export-files' || id === 'exports' || id === 'upload-image' || id === 'machine-data') {
    return next();
  }

  try {
    const normalizedId = normalizeId(id);
    const result = await getHistoryDetail(normalizedId);
    if (result.status !== 200) {
      return res.status(result.status).json({ success: false, error: result.error });
    }

    return res.json({ success: true, ...result.data });
  } catch (error) {
    console.error('[history/detail] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 共通の更新処理
async function handleUpdateHistory(req, res, rawId) {
  try {
    const normalizedId = normalizeId(rawId);
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ success: false, error: 'BLOB storage not available' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const found = await findHistoryBlob(containerClient, normalizedId);
    const targetBlobName = found?.blobName || `knowledge-base/exports/${normalizedId}.json`;
    const targetFileName = found?.fileName || `${normalizedId}.json`;

    const originalData = (await downloadJson(containerClient, targetBlobName)) || {};

    const updatePayload = req.body?.updatedData || req.body || {};
    const merged = mergeData(originalData, {
      ...updatePayload,
      lastModified: new Date().toISOString(),
    });

    // savedImages を jsonData にも保持
    if (updatePayload.savedImages) {
      merged.savedImages = updatePayload.savedImages;
      merged.jsonData = mergeData(merged.jsonData || {}, { savedImages: updatePayload.savedImages });
    }

    // 更新履歴を追加
    merged.updateHistory = Array.isArray(merged.updateHistory) ? merged.updateHistory : [];
    merged.updateHistory.push({
      timestamp: new Date().toISOString(),
      updatedBy: req.body?.updatedBy || 'user',
      updatedFields: Object.keys(updatePayload || {}).filter(k => updatePayload[k] !== undefined),
    });

    const content = JSON.stringify(merged, null, 2);
    const blockBlobClient = containerClient.getBlockBlobClient(targetBlobName);
    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: 'application/json' }
    });

    // DBもベストエフォートで更新
    try {
      if (dbQuery) {
        await dbQuery(
          `UPDATE fault_history SET json_data = $1, updated_at = NOW() WHERE chat_id = $2`,
          [JSON.stringify(merged), normalizedId]
        );
      }
    } catch (dbError) {
      console.warn('[history/update] DB update skipped:', dbError.message);
    }

    return res.json({
      success: true,
      message: '保存しました',
      updatedData: merged,
      updatedFile: targetFileName
    });
  } catch (error) {
    console.error('[history/update] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Update history item (Save edited JSON)
router.put('/update-item/:id', async (req, res) => {
  await handleUpdateHistory(req, res, req.params.id);
});

// Backward compatible update endpoint
router.put('/:id', async (req, res) => {
  await handleUpdateHistory(req, res, req.params.id);
});

// Delete history
router.delete('/:id', async (req, res) => {
  try {
    const normalizedId = normalizeId(req.params.id);
    console.log(`[history/delete] Request: ${normalizedId}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ success: false, error: 'BLOB storage not available' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const found = await findHistoryBlob(containerClient, normalizedId);

    if (!found) {
      return res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
    }

    await containerClient.getBlobClient(found.blobName).delete();
    console.log(`[history/delete] Deleted: ${found.blobName}`);

    // DB削除はベストエフォート
    try {
      if (dbQuery) {
        await dbQuery('DELETE FROM fault_history WHERE chat_id = $1', [normalizedId]);
      }
    } catch (dbError) {
      console.warn('[history/delete] DB delete skipped:', dbError.message);
    }

    return res.json({ success: true, message: '削除しました', deletedFile: found.fileName });
  } catch (error) {
    console.error('[history/delete] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default function registerHistoryRoutes(app) {
  app.use('/api/history', router);
}
