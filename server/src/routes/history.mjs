import express from 'express';
import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName, norm, upload, streamToBuffer } from '../infra/blob.mjs';
import { AZURE_STORAGE_CONNECTION_STRING, isAzureEnvironment } from '../config/env.mjs';
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

  console.log('[extractMetadata] Input JSON keys:', Object.keys(json));
  if (json.chatData) console.log('[extractMetadata] chatData keys:', Object.keys(json.chatData));
  if (json.savedImages) console.log('[extractMetadata] json.savedImages length:', json.savedImages.length);
  if (chatData.savedImages) console.log('[extractMetadata] chatData.savedImages length:', chatData.savedImages.length);

  // 機種情報の抽出（複数ソースから試行）
  let machineType = machineInfo.machineTypeName || 
                    machineInfo.selectedMachineType ||
                    json.machineType || 
                    '';
  let machineNumber = machineInfo.machineNumber || 
                      machineInfo.selectedMachineNumber ||
                      json.machineNumber || 
                      '';
  
  // 空の場合はファイル名から推測を試みる
  if (!machineType && !machineNumber) {
    // ファイル名から機種情報を抽出する試み（例: MC-300_100_xxx.json）
    const fileNameMatch = fileName.match(/([A-Z]+-\d+)[-_](\d+)/i);
    if (fileNameMatch) {
      machineType = fileNameMatch[1] || '';
      machineNumber = fileNameMatch[2] || '';
    }
  }
  
  // 最終的にも空の場合のみ"未設定"を設定
  machineType = machineType || '未設定';
  machineNumber = machineNumber || '未設定';

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

  // 画像URLからファイル名を抽出する関数
  const extractFileName = (urlOrPath) => {
    if (!urlOrPath) return '';
    // /api/images/chat-exports/xxx.jpg → xxx.jpg
    const parts = urlOrPath.split('/');
    return parts[parts.length - 1];
  };

  const mergedImages = [
    ...images,
    ...savedImages.map((img) => {
      if (typeof img === 'string') {
        const fileName = extractFileName(img);
        return { url: img, fileName: fileName };
      }
      if (img && typeof img === 'object') {
        const fileName = extractFileName(img.fileName || img.url || img.path);
        return {
          url: img.url || img.fileName || img.path,
          fileName: fileName,
          ...img,
        };
      }
      return { url: '', fileName: '' };
    }),
  ].filter((img) => img.url && img.fileName);

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
      
      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      
      console.log('[history/upload-image] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        hasStorageConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        isAzureEnvironment: useAzure
      });

      // ローカル環境: ローカルファイルシステムのみ使用
      if (!useAzure) {
        console.log('[history/upload-image] LOCAL: Using local filesystem');
        
        const localDir = path.resolve(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        const localFilePath = path.join(localDir, fileName);
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
          console.log('[history/upload-image] LOCAL: Created local directory:', localDir);
        }
        
        // ファイルを保存
        fs.writeFileSync(localFilePath, req.file.buffer);
        console.log('[history/upload-image] LOCAL: ✅ Saved to local filesystem:', localFilePath);
        
        const imageUrl = `/api/images/chat-exports/${fileName}`;
        
        return res.json({
          success: true,
          imageUrl: imageUrl,
          fileName: fileName,
          size: req.file.size,
          storage: 'local',
          verified: true,
          environment: 'local'
        });
      }

      // Azure環境: BLOBストレージのみ使用
      console.log('[history/upload-image] AZURE: Using BLOB storage');
      const blobServiceClient = getBlobServiceClient();
      
      if (!blobServiceClient) {
        console.error('[history/upload-image] AZURE: ❌ BLOB storage not configured');
        console.error('[history/upload-image] Please verify that AZURE_STORAGE_CONNECTION_STRING is properly set in Azure App Service Configuration');
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available (Azure環境)',
          hint: 'Azure App Serviceの構成でAZURE_STORAGE_CONNECTION_STRINGが設定されているか確認してください'
        });
      }

      // BLOB接続テスト
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const exists = await containerClient.exists();
        console.log('[history/upload-image] AZURE: BLOB connection test:', {
          containerName,
          exists,
          canConnect: true
        });
      } catch (testError) {
        console.error('[history/upload-image] AZURE: ❌ BLOB connection test failed:', testError);
        return res.status(503).json({
          success: false,
          error: 'BLOB storage connection failed',
          details: testError.message
        });
      }

      // BLOBに保存
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = `knowledge-base/images/chat-exports/${fileName}`;
      console.log('[history/upload-image] 📤 Starting BLOB upload:', {
        container: containerName,
        blobName: blobName,
        fullPath: `${containerName}/${blobName}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        attempt: attempt
      });
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // コンテナの存在確認と作成（確実に実行）
      console.log('[history/upload-image] Ensuring container exists...');
      try {
        await containerClient.createIfNotExists({
          access: 'container' // パブリックアクセス（必要に応じて変更）
        });
      } catch (createError) {
        console.error('[history/upload-image] ⚠️ Container creation failed (may already exist):', {
          message: createError.message,
          code: createError.code,
          statusCode: createError.statusCode,
          details: createError.details
        });
        // コンテナが既に存在する場合はエラーを無視
        if (createError.code !== 'ContainerAlreadyExists' && createError.statusCode !== 409) {
          throw createError;
        }
      }
      
      const containerExists = await containerClient.exists();
      console.log('[history/upload-image] Container status:', {
        container: containerName,
        exists: containerExists,
        confirmed: containerExists ? '✅' : '❌'
      });

      if (!containerExists) {
        throw new Error(`Container '${containerName}' does not exist and could not be created`);
      }

      // BLOB アップロード実行
      console.log('[history/upload-image] Uploading to BLOB...');
      const uploadPromise = blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype,
          blobCacheControl: 'public, max-age=31536000' // 1年キャッシュ
        },
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
          source: 'chat-camera'
        }
      });

      // タイムアウトを60秒に延長
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('BLOB upload timeout (60s)')), 60000);
      });

      await Promise.race([uploadPromise, timeoutPromise]);

      console.log(`[history/upload-image] ✅ BLOB Upload command completed:`, {
        container: containerName,
        blobName: blobName,
        fullPath: `${containerName}/${blobName}`,
        fileName: fileName,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // アップロード後に存在確認（必須）
      const uploadedBlobExists = await blockBlobClient.exists();
      console.log(`[history/upload-image] Upload verification:`, {
        exists: uploadedBlobExists,
        blobUrl: blockBlobClient.url,
        verified: uploadedBlobExists ? '✅' : '❌'
      });

      // 🔧 重要: BLOBに存在しない場合はエラー
      if (!uploadedBlobExists) {
        throw new Error(`BLOB upload failed: File does not exist after upload - ${blobName}`);
      }

      console.log(`[history/upload-image] ✅✅ BLOB Upload VERIFIED - File exists in storage`);

      const imageUrl = `/api/images/chat-exports/${fileName}`;

      return res.json({
        success: true,
        imageUrl: imageUrl,
        fileName: fileName,
        blobName: blobName,
        size: req.file.size,
        storage: 'blob',
        verified: true
      });
    } catch (error) {
      lastError = error;
      console.error(`[history/upload-image] ❌ Attempt ${attempt} failed:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name
      });

      if (attempt < maxRetries) {
        console.log(`[history/upload-image] Retrying in ${attempt}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
    }
  }

  console.error('[history/upload-image] ❌ All retry attempts failed:', {
    lastError: lastError?.message,
    stack: lastError?.stack,
    attempts: maxRetries
  });

  return res.status(500).json({
    success: false,
    error: '画像のアップロードに失敗しました',
    details: lastError?.message,
    errorCode: lastError?.code,
    errorName: lastError?.name,
    diagnostics: {
      hasStorageConnection: !!(process.env.AZURE_STORAGE_CONNECTION_STRING),
      containerName: containerName,
      isAzureEnv: isAzureEnvironment(),
      nodeEnv: process.env.NODE_ENV,
      storageMode: process.env.STORAGE_MODE,
      hasWebsiteSiteName: !!process.env.WEBSITE_SITE_NAME
    }
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
    console.log('[history/export-files] 🔍 BLOB接続診断開始');
    console.log('[history/export-files] 環境変数:', {
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '設定済み' : '未設定',
      BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || 'デフォルト'
    });
    
    const blobServiceClient = getBlobServiceClient();
    console.log('[history/export-files] BLOBクライアント:', blobServiceClient ? '取得成功' : '取得失敗');
    
    const items = [];

    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        console.log('[history/export-files] コンテナ名:', containerName);
        
        const containerExists = await containerClient.exists();
        console.log('[history/export-files] コンテナ存在確認:', containerExists ? 'あり' : 'なし');
        
        if (!containerExists) {
          console.error('[history/export-files] ❌ コンテナが存在しません:', containerName);
          return res.json({
            success: true,
            files: [],
            count: 0,
            warning: `コンテナ "${containerName}" が見つかりません`,
            diagnostics: {
              blobClientAvailable: true,
              containerExists: false,
              containerName: containerName
            }
          });
        }
        
        const prefix = 'knowledge-base/exports/';
        console.log('[history/export-files] 検索プレフィックス:', prefix);
        
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
        console.log('[history/export-files] ✅ 取得完了:', items.length, '件');
      } catch (blobError) {
        console.error('[history/export-files] ❌ BLOBエラー:', blobError);
        console.error('[history/export-files] エラー詳細:', blobError.message);
        console.error('[history/export-files] スタックトレース:', blobError.stack);
      }
    } else {
      console.error('[history/export-files] ❌ BLOBクライアントが利用できません');
    }

    res.json({
      success: true,
      files: items,
      count: items.length,
      diagnostics: {
        blobClientAvailable: !!blobServiceClient,
        containerName: containerName,
        filesFound: items.length
      }
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

    // 🔧 修正: savedImages を単一のソースに統一（jsonData.savedImagesに集約）
    if (updatePayload.savedImages) {
      console.log('[history/update] Saving images:', {
        count: updatePayload.savedImages.length,
        images: updatePayload.savedImages.map(img => img.fileName || img.url?.substring(0, 50))
      });

      // 削除された画像の検出と削除
      const oldImages = originalData.savedImages || originalData.jsonData?.savedImages || [];
      const newImages = updatePayload.savedImages || [];
      const newImageNames = new Set(newImages.map(img => img.fileName || img.url?.split('/').pop()));
      
      const deletedImages = oldImages.filter(img => {
        const fileName = img.fileName || img.url?.split('/').pop();
        return fileName && !newImageNames.has(fileName);
      });

      if (deletedImages.length > 0) {
        console.log(`[history/update] Found ${deletedImages.length} images to delete`);
        for (const img of deletedImages) {
          const fileName = img.fileName || img.url?.split('/').pop();
          if (fileName) {
            try {
              const imageBlobName = `knowledge-base/images/chat-exports/${fileName}`;
              const imageBlob = containerClient.getBlobClient(imageBlobName);
              if (await imageBlob.exists()) {
                await imageBlob.delete();
                console.log(`[history/update] 🗑️ Deleted removed image: ${fileName}`);
              }
            } catch (delErr) {
              console.warn(`[history/update] ⚠️ Failed to delete image: ${fileName}`, delErr.message);
            }
          }
        }
      }
      
      merged.savedImages = updatePayload.savedImages;
      merged.jsonData = mergeData(merged.jsonData || {}, { savedImages: updatePayload.savedImages });
      
      // chatData が送信された場合はそれを使用、なければ既存を保持
      if (updatePayload.chatData) {
        merged.jsonData.chatData = updatePayload.chatData;
      }
      
      // 他の画像フィールドは削除して単一ソースに統一
      delete merged.images;
      console.log('[history/update] Images unified to jsonData.savedImages');
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

    console.log(`[history/delete] Found ${imagesToDelete.length} images to delete from JSON`);
    console.log('[history/delete] Images to delete details:', JSON.stringify(imagesToDelete, null, 2));

    // 関連する画像をBLOBから削除
    let deletedImagesCount = 0;
    const deletedImagesList = [];
    
    for (const img of imagesToDelete) {
      try {
        // ファイル名を抽出（URL、fileName、pathのいずれかから）
        let fileName = null;
        if (img.fileName && !img.fileName.startsWith('http')) {
          fileName = img.fileName.split('/').pop();
        } else if (img.url && !img.url.startsWith('http')) {
          fileName = img.url.split('/').pop();
        } else if (img.path) {
          fileName = img.path.split('/').pop();
        }
        
        if (fileName) {
          const imageBlobName = `knowledge-base/images/chat-exports/${fileName}`;
          const imageBlob = containerClient.getBlobClient(imageBlobName);
          const exists = await imageBlob.exists();
          
          if (exists) {
            await imageBlob.delete();
            deletedImagesCount++;
            deletedImagesList.push(fileName);
            console.log(`[history/delete] ✅ Deleted image: ${imageBlobName}`);
          } else {
            console.log(`[history/delete] ⚠️ Image not found: ${imageBlobName}`);
          }
        }
      } catch (imgError) {
        console.warn(`[history/delete] ❌ Failed to delete image:`, imgError.message);
        // 画像削除失敗は警告のみ、処理は継続
      }
    }

    // JSONファイルを削除
    await containerClient.getBlobClient(found.blobName).delete();
    console.log(`[history/delete] ✅ Deleted JSON: ${found.blobName}`);

    return res.json({ 
      success: true, 
      message: '削除しました', 
      deletedFile: found.fileName,
      deletedImages: deletedImagesCount,
      deletedImagesList: deletedImagesList,
      totalImagesFound: imagesToDelete.length
    });
  } catch (error) {
    console.error('[history/delete] ❌ Error:', error);
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
