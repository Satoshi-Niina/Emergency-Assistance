import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';

const EXPORT_SUBDIR = 'exports';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

async function saveJsonFile(fileName, content) {
  const blobServiceClient = getBlobServiceClient();

  if (blobServiceClient) {
    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      const blobName = `knowledge-base/${EXPORT_SUBDIR}/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(content, Buffer.byteLength(content), {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      return { storage: 'blob', blobName };
    } catch (error) {
      console.warn('[api/chats] Blob upload failed, falling back to local file:', error.message);
    }
  }

  const exportDir = path.join(process.cwd(), 'knowledge-base', EXPORT_SUBDIR);
  ensureDir(exportDir);
  const filePath = path.join(exportDir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return { storage: 'local', filePath };
}

async function getLatestExport(chatId) {
  let latest = null;
  const blobServiceClient = getBlobServiceClient();

  if (blobServiceClient) {
    try {
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
      if (latest) return latest;
    } catch (error) {
      console.warn('[api/chats] Blob list failed:', error.message);
    }
  }

  // Local fallback
  const exportDir = path.join(process.cwd(), 'knowledge-base', EXPORT_SUBDIR);
  if (fs.existsSync(exportDir)) {
    const files = fs
      .readdirSync(exportDir)
      .filter((f) => f.endsWith('.json') && (!chatId || f.includes(chatId)));
    for (const file of files) {
      const stats = fs.statSync(path.join(exportDir, file));
      if (!latest || stats.mtime > latest.lastModified) {
        latest = {
          source: 'local',
          name: file,
          lastModified: stats.mtime,
        };
      }
    }
  }

  return latest;
}

async function downloadExport(fileName) {
  const blobServiceClient = getBlobServiceClient();
  if (blobServiceClient) {
    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      // Blobパスを直接指定
      const blobName = `knowledge-base/${EXPORT_SUBDIR}/${fileName}`;
      console.log('[api/chats] Downloading from Blob:', blobName);
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
    } catch (error) {
      console.warn('[api/chats] Blob download failed:', error.message);
    }
  }

  const localPath = path.join(process.cwd(), 'knowledge-base', EXPORT_SUBDIR, fileName);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  return null;
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
    const fileName = `${chatId}_${Date.now()}.json`;
    const content = JSON.stringify({ chatId, exportType: 'manual_export', ...payload, savedAt: new Date().toISOString() }, null, 2);
    const saveResult = await saveJsonFile(fileName, content);
    return res.json({ success: true, fileName, storage: saveResult.storage });
  }

  // POST /api/chats/:chatId/send or send-test
  if (req.method === 'POST' && (action === 'send' || action === 'send-test')) {
    const payload = req.body || {};
    const fileName = `${chatId}_${Date.now()}.json`;
    const content = JSON.stringify({ chatId, exportType: payload.exportType || action, ...payload, savedAt: new Date().toISOString() }, null, 2);
    const saveResult = await saveJsonFile(fileName, content);
    return res.json({
      success: true,
      fileName,
      storage: saveResult.storage,
      knowledgeUpdateScheduled: true
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
