import { getBlobServiceClient, containerName } from '../../infra/blob.mjs';
import { AUTO_INGEST_CHAT_EXPORTS, isAzureEnvironment } from '../../config/env.mjs';

const EXPORT_SUBDIR = 'exports';

async function saveJsonFile(fileName, content) {
  const useAzure = isAzureEnvironment();
  const fs = await import('fs');
  const path = await import('path');

  // ローカルモード: knowledge-base/exports/ へ保存
  if (!useAzure) {
    console.log('[saveJsonFile] LOCAL: Using local filesystem:', fileName);
    const localDir = path.join(process.cwd(), '..', 'knowledge-base', EXPORT_SUBDIR);
    await fs.promises.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    await fs.promises.writeFile(localPath, content, 'utf8');
    console.log(`[saveJsonFile] LOCAL: Successfully saved to: ${localPath}`);
    return { storage: 'local', path: localPath };
  }

  // Azureモード: BLOBストレージへ保存
  console.log('[saveJsonFile] AZURE: Using BLOB storage:', fileName);
  const blobServiceClient = getBlobServiceClient();
  
  if (!blobServiceClient) {
    throw new Error('BLOB storage is not configured in production. Please check AZURE_STORAGE_CONNECTION_STRING environment variable.');
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blobName = `knowledge-base/${EXPORT_SUBDIR}/${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
  console.log(`[saveJsonFile] AZURE: Successfully saved to BLOB: ${blobName}`);
  return { storage: 'blob', blobName };
}

async function getLatestExport(chatId) {
  let latest = null;
  const useAzure = isAzureEnvironment();
  const fs = await import('fs');
  const path = await import('path');

  // ローカルモード: knowledge-base/exports/ から最新ファイルを検索
  if (!useAzure) {
    const localDir = path.join(process.cwd(), '..', 'knowledge-base', EXPORT_SUBDIR);
    try {
      const files = await fs.promises.readdir(localDir);
      for (const fileName of files) {
        if (!fileName.endsWith('.json')) continue;
        if (!chatId || fileName.includes(chatId)) {
          const filePath = path.join(localDir, fileName);
          const stats = await fs.promises.stat(filePath);
          if (!latest || stats.mtime > latest.lastModified) {
            latest = {
              source: 'local',
              name: fileName,
              lastModified: stats.mtime,
            };
          }
        }
      }
    } catch (error) {
      console.warn('[api/chats] LOCAL: Error reading exports:', error.message);
    }
    return latest;
  }

  // Azureモード: BLOBから最新ファイルを検索
  const blobServiceClient = getBlobServiceClient();
  if (!blobServiceClient) {
    console.warn('[api/chats] BLOB storage not configured');
    return null;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const prefix = `knowledge-base/${EXPORT_SUBDIR}/`;
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.endsWith('.json')) continue;
    if (!chatId || blob.name.includes(chatId)) {
      if (!latest || (blob.properties.lastModified && blob.properties.lastModified > latest.lastModified)) {
        latest = {
          source: 'blob',
          name: blob.name,
          lastModified: blob.properties.lastModified,
        };
      }
    }
  }

  return latest;
}

async function downloadExport(fileName) {
  const useAzure = isAzureEnvironment();
  const fs = await import('fs');
  const path = await import('path');

  // ローカルモード: knowledge-base/exports/ から読み取り
  if (!useAzure) {
    const localPath = path.join(process.cwd(), '..', 'knowledge-base', EXPORT_SUBDIR, fileName);
    console.log('[api/chats] LOCAL: Downloading from local:', localPath);
    try {
      if (await fs.promises.access(localPath).then(() => true).catch(() => false)) {
        return await fs.promises.readFile(localPath);
      }
    } catch (error) {
      console.warn('[api/chats] LOCAL: Error reading file:', error.message);
    }
    return null;
  }

  // Azureモード: BLOBから読み取り
  const blobServiceClient = getBlobServiceClient();
  if (!blobServiceClient) {
    console.warn('[api/chats] BLOB storage not configured');
    return null;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `knowledge-base/${EXPORT_SUBDIR}/${fileName}`;
  console.log('[api/chats] AZURE: Downloading from Blob:', blobName);
  const blobClient = containerClient.getBlobClient(blobName);
  
  if (await blobClient.exists()) {
    const downloadResponse = await blobClient.download();
    const chunks = [];
    if (downloadResponse.readableStreamBody) {
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
  }
  
  return null;
}

// エクスポートファイル名に事象名（タイトル）を含めるためのヘルパー
function deriveExportTitle(payload = {}) {
  const fallback = 'chat';
  const chatData = payload.chatData || {};
  const messages = Array.isArray(chatData.messages) ? chatData.messages : [];
  const machineInfo = chatData.machineInfo || {};

  let title = '';

  // まず最初のユーザーメッセージをタイトルにする（優先）
  const firstUserMessage = messages.find(
    (m) => m && m.isAiResponse === false && typeof m.content === 'string' && m.content.trim()
  );
  if (firstUserMessage) {
    title = firstUserMessage.content.split(/\r?\n/)[0].slice(0, 80);
  }

  // フォールバック: 機種名と機械番号
  if (!title) {
    const machineType =
      machineInfo.machineTypeName ||
      machineInfo.selectedMachineType ||
      machineInfo.machineType ||
      '';
    const machineNumber =
      machineInfo.machineNumber ||
      machineInfo.selectedMachineNumber ||
      '';

    if (machineType || machineNumber) {
      title = `${machineType || ''}${machineNumber ? `_${machineNumber}` : ''}`;
    }
  }

  if (!title) title = fallback;

  // ファイル名に使えない文字を除去し、空白はトリム
  title = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  if (!title) title = fallback;
  if (title.length > 80) title = title.slice(0, 80);
  return title;
}

export default async function chatsHandler(req, res) {
  const parts = req.path.split('/').filter(Boolean); // ["api","chats",":chatId", ...]
  const chatId = parts[2];
  const action = parts[3];

  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.status(200).send('');
  }

  // /api/chats/exports/:fileName
  if (parts[2] === 'exports' && parts.length >= 4 && req.method === 'GET') {
    const fileName = parts.slice(3).join('/');
    const buffer = await downloadExport(fileName);
    if (!buffer) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(buffer);
  }

  if (!chatId) {
    return res.status(400).json({ success: false, error: 'chatId is required' });
  }

  // POST /api/chats/:chatId/export
  if (req.method === 'POST' && action === 'export') {
    const payload = req.body || {};
    const title = deriveExportTitle(payload);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${title}_${chatId}_${timestamp}.json`;
    
    // 画像データのログ出力
    const savedImages = payload.savedImages || [];
    console.log('[chats/export] Export request:', {
      chatId,
      title,
      savedImagesCount: savedImages.length,
      savedImages: savedImages.map(img => ({
        fileName: img.fileName,
        url: img.url?.substring(0, 50)
      }))
    });
    
    const content = JSON.stringify({ chatId, exportType: 'manual_export', ...payload, savedAt: new Date().toISOString(), title }, null, 2);
    const saveResult = await saveJsonFile(fileName, content);
    
    console.log('[chats/export] Saved to:', saveResult.storage, fileName);
    
    return res.json({ success: true, fileName, storage: saveResult.storage });
  }

  // POST /api/chats/:chatId/send or send-test
  if (req.method === 'POST' && (action === 'send' || action === 'send-test')) {
    const payload = req.body || {};
    const title = deriveExportTitle(payload);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${title}_${chatId}_${timestamp}.json`;
    const content = JSON.stringify({ chatId, exportType: payload.exportType || action, ...payload, savedAt: new Date().toISOString(), title }, null, 2);
    const saveResult = await saveJsonFile(fileName, content);
    return res.json({
      success: true,
      fileName,
      storage: saveResult.storage,
      knowledgeUpdateScheduled: AUTO_INGEST_CHAT_EXPORTS === true
    });
  }

  // GET /api/chats/:chatId/formatted-export
  if (req.method === 'GET' && action === 'formatted-export') {
    const latest = await getLatestExport(chatId);
    return res.json({
      success: true,
      chatId,
      lastExport: latest?.name || null,
      lastModified: latest?.lastModified || null
    });
  }

  // GET /api/chats/:chatId/last-export
  if (req.method === 'GET' && action === 'last-export') {
    const latest = await getLatestExport(chatId);
    if (!latest) {
      return res.json({ success: true, exists: false });
    }
    return res.json({ success: true, exists: true, fileName: latest.name, timestamp: latest.lastModified });
  }

  return res.status(404).json({ success: false, error: 'not_found' });
}

export const methods = ['get', 'post', 'options'];
