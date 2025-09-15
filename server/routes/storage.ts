import express from 'express';
import { BlobServiceClient } from '@azure/storage-blob';

const router = express.Router();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.BLOB_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
const blobPrefix = process.env.BLOB_PREFIX || '';

router.get('/list', async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const out: string[] = [];
    for await (const b of containerClient.listBlobsFlat({ prefix: blobPrefix })) {
      out.push(b.name.substring(blobPrefix.length));
    }
    res.type('application/json').json(out);
  } catch (err) {
    console.error('ストレージ一覧取得エラー:', err);
    res.status(500).type('application/json').json({ error: 'storage_list_error', message: err.message });
  }
});

export default router;
