import express from 'express';
import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName, norm, upload, streamToBuffer } from '../infra/blob.mjs';
import { AZURE_STORAGE_CONNECTION_STRING } from '../config/env.mjs';
import { dbQuery } from '../infra/db.mjs';

const router = express.Router();

// ID正規化（.json拡張子を除去、ファイル名全体を保持）
const normalizeId = (id = '') => {
  let normalized = id;
  // .json拡張子を除去
  if (normalized.endsWith('.json')) {
    normalized = normalized.replace(/\.json$/, '');
  }
  return normalized;
};

// Blobから対象の履歴ファイルを探す
async function findHistoryBlob(containerClient, normalizedId) {
  const prefix = 'knowledge-base/exports/';
  console.log('[findHistoryBlob] Searching for:', normalizedId);
  
  // まずファイル名完全一致で検索
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.endsWith('.json')) continue;
    const fileName = blob.name.split('/').pop();
    const fileNameWithoutExt = fileName?.replace(/\.json$/, '');
    
    // ファイル名が完全一致する場合
    if (fileNameWithoutExt === normalizedId) {
      console.log('[findHistoryBlob] Found exact match:', blob.name);
      return { blobName: blob.name, fileName };
    }
  }
  
  // 完全一致しない場合は部分一致で検索（後方互換性）
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.endsWith('.json')) continue;
    const fileName = blob.name.split('/').pop();
    if (fileName && fileName.includes(normalizedId)) {
      console.log('[findHistoryBlob] Found partial match:', blob.name);
      return { blobName: blob.name, fileName };
    }
  }
  
  console.log('[findHistoryBlob] No match found for:', normalizedId);
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

  console.log('[extractMetadata] Debug:', {
    fileName,
    hasChatData: !!json.chatData,
    hasMachineInfo: !!machineInfo,
    machineTypeName: machineInfo.machineTypeName,
    jsonMachineType: json.machineType,
    machineNumber: machineInfo.machineNumber || json.machineNumber,
    extractedMachineType: machineType,
    extractedMachineNumber: machineNumber
  });

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

          // ファイル名からデフォルトのタイトルを抽出
          const defaultTitle = deriveTitleFromFileName(fileName);
          
          let meta = {
            title: defaultTitle,
            machineType: 'Unknown',
            machineNumber: 'Unknown',
            images: [],
          };

          // 可能な限りメタデータを読み出す（JSONデータから詳細情報を取得）
          try {
            const blobClient = containerClient.getBlobClient(blob.name);
            const downloadResponse = await blobClient.download();
            if (downloadResponse.readableStreamBody) {
              const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
              const json = JSON.parse(buffer.toString('utf8'));
              meta = extractMetadataFromJson(json, fileName);
              
              // titleが取得できなかった場合はファイル名から生成したタイトルを使用
              if (!meta.title || meta.title === '故障履歴') {
                meta.title = defaultTitle;
              }
              
              console.log('[history] Metadata extracted:', {
                fileName,
                title: meta.title,
                machineType: meta.machineType,
                machineNumber: meta.machineNumber,
                imageCount: meta.images.length
              });
            }
          } catch (blobMetaError) {
            console.warn('[history] Metadata read failed for:', fileName, blobMetaError.message);
            // エラー時もファイル名から生成したタイトルを使用
            meta.title = defaultTitle;
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
// CORS preflight対応
router.options('/upload-image', (req, res) => {
  res.status(200).end();
});

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
      let ext = path.extname(req.file.originalname);
      
      // 拡張子がない場合、mimetypeから推定
      if (!ext) {
        const mimeToExt = {
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp'
        };
        ext = mimeToExt[req.file.mimetype] || '.jpg'; // デフォルトは.jpg
        console.log(`[history/upload-image] No extension found, using mimetype: ${req.file.mimetype} -> ${ext}`);
      }
      
      const fileName = `chat_image_${timestamp}${ext}`;
      console.log(`[history/upload-image] Generated fileName: ${fileName}`);
      
      const blobServiceClient = getBlobServiceClient();

      // 開発環境: BLOBが利用できない場合はローカル保存
      if (!blobServiceClient) {
        console.warn('[history/upload-image] BLOB unavailable, saving locally');
        const localDir = path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        
        const localPath = path.join(localDir, fileName);
        fs.writeFileSync(localPath, req.file.buffer);
        
        console.log('[history/upload-image] Saved locally:', localPath);
        const imageUrl = `/api/images/chat-exports/${fileName}`;
        
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

    console.log('[history/update] Target:', { normalizedId, targetBlobName, found: !!found });

    let originalData = {};
    try {
      originalData = (await downloadJson(containerClient, targetBlobName)) || {};
      console.log('[history/update] Original data loaded:', Object.keys(originalData));
    } catch (downloadError) {
      console.warn('[history/update] Failed to load original data:', downloadError.message);
      // 新規作成として扱う
      originalData = {};
    }

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

    return res.json({
      success: true,
      message: '保存しました',
      updatedData: merged,
      updatedFile: targetFileName
    });
  } catch (error) {
    console.error('[history/update] Error:', {
      message: error.message,
      stack: error.stack,
      normalizedId,
      updatePayload: req.body?.updatedData || req.body
    });
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack?.split('\n').slice(0, 3).join('\n')
    });
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

    // JSONをダウンロードして画像ファイル名を取得
    const jsonData = await downloadJson(containerClient, found.blobName);
    const metadata = extractMetadataFromJson(jsonData, found.fileName);
    const imagesToDelete = metadata.images || [];

    console.log(`[history/delete] Found ${imagesToDelete.length} images to delete`);

    // 関連する画像をBLOBから削除
    for (const img of imagesToDelete) {
      try {
        const fileName = img.fileName || img.url?.split('/').pop();
        if (fileName && !fileName.startsWith('http')) {
          const imageBlobName = `knowledge-base/images/chat-exports/${fileName}`;
          const imageBlob = containerClient.getBlobClient(imageBlobName);
          const exists = await imageBlob.exists();
          
          if (exists) {
            await imageBlob.delete();
            console.log(`[history/delete] Deleted image: ${imageBlobName}`);
          }
        }
      } catch (imgError) {
        console.warn(`[history/delete] Failed to delete image:`, imgError.message);
        // 画像削除失敗は警告のみ、処理は継続
      }
    }

    // JSONファイルを削除
    await containerClient.getBlobClient(found.blobName).delete();
    console.log(`[history/delete] Deleted JSON: ${found.blobName}`);

    return res.json({ 
      success: true, 
      message: '削除しました', 
      deletedFile: found.fileName,
      deletedImages: imagesToDelete.length
    });
  } catch (error) {
    console.error('[history/delete] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 孤立画像ファイルのクリーンアップ
router.post('/cleanup-orphaned-images', async (req, res) => {
  try {
    console.log('[history/cleanup-orphaned-images] Starting cleanup...');
    
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ success: false, error: 'BLOB storage not available' });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // 1. すべてのJSONファイルから参照されている画像を収集
    const referencedImages = new Set();
    const jsonPrefix = 'knowledge-base/exports/';
    
    console.log('[cleanup] Step 1: Collecting referenced images from JSON files...');
    for await (const blob of containerClient.listBlobsFlat({ prefix: jsonPrefix })) {
      if (!blob.name.endsWith('.json')) continue;
      
      try {
        const jsonData = await downloadJson(containerClient, blob.name);
        const metadata = extractMetadataFromJson(jsonData, blob.name);
        const images = metadata.images || [];
        
        images.forEach(img => {
          const fileName = img.fileName || img.url?.split('/').pop();
          if (fileName && !fileName.startsWith('http')) {
            referencedImages.add(fileName);
          }
        });
      } catch (err) {
        console.warn(`[cleanup] Failed to parse JSON: ${blob.name}`, err.message);
      }
    }
    
    console.log(`[cleanup] Found ${referencedImages.size} referenced images`);
    
    // 2. chat-exports内のすべての画像ファイルを取得
    const imagePrefix = 'knowledge-base/images/chat-exports/';
    const allImages = [];
    
    console.log('[cleanup] Step 2: Listing all images in chat-exports...');
    for await (const blob of containerClient.listBlobsFlat({ prefix: imagePrefix })) {
      const fileName = blob.name.split('/').pop();
      if (fileName) {
        allImages.push({
          fileName,
          blobName: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified
        });
      }
    }
    
    console.log(`[cleanup] Found ${allImages.length} total images`);
    
    // 3. 孤立画像（参照されていない画像）を特定
    const orphanedImages = allImages.filter(img => !referencedImages.has(img.fileName));
    
    console.log(`[cleanup] Found ${orphanedImages.length} orphaned images`);
    
    // 4. 孤立画像を削除（dryRun モードに対応）
    const dryRun = req.body?.dryRun === true;
    let deletedCount = 0;
    let deletedSize = 0;
    const deletedList = [];
    
    if (!dryRun) {
      console.log('[cleanup] Step 3: Deleting orphaned images...');
      for (const img of orphanedImages) {
        try {
          const imageBlob = containerClient.getBlobClient(img.blobName);
          await imageBlob.delete();
          deletedCount++;
          deletedSize += img.size;
          deletedList.push(img.fileName);
          console.log(`[cleanup] Deleted: ${img.fileName} (${img.size} bytes)`);
        } catch (delErr) {
          console.error(`[cleanup] Failed to delete: ${img.fileName}`, delErr.message);
        }
      }
    }
    
    return res.json({
      success: true,
      message: dryRun ? '孤立画像の検出が完了しました' : '孤立画像のクリーンアップが完了しました',
      dryRun,
      stats: {
        totalImages: allImages.length,
        referencedImages: referencedImages.size,
        orphanedImages: orphanedImages.length,
        deletedCount: dryRun ? 0 : deletedCount,
        deletedSize: dryRun ? 0 : deletedSize,
        deletedSizeMB: dryRun ? 0 : (deletedSize / 1024 / 1024).toFixed(2)
      },
      orphanedList: orphanedImages.map(img => ({
        fileName: img.fileName,
        size: img.size,
        lastModified: img.lastModified?.toISOString()
      })),
      deletedList: dryRun ? [] : deletedList
    });
    
  } catch (error) {
    console.error('[history/cleanup-orphaned-images] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

export default function registerHistoryRoutes(app) {
  app.use('/api/history', router);
}
