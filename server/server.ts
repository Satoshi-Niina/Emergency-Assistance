import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { BlobServiceClient } from '@azure/storage-blob';

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS設定
const FRONT_ORIGIN = 'https://<your-frontend-domain>'; // 例: https://yourapp.azurestaticapps.net
app.use(cors({
  origin: [FRONT_ORIGIN],
  credentials: true,
}));

// DB接続
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Blob設定
const BLOB_CONTAINER = process.env.BLOB_CONTAINER_NAME!;
const BLOB_PREFIX = process.env.BLOB_PREFIX || 'knowledge-base/';
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING!;

// /api/health
app.get('/api/health', async (req, res) => {
  let dbStatus = 'ng';
  let blobStatus = 'ng';

  // DBチェック
  try {
    const result = await pool.query('SELECT 1');
    if (result && result.rows && result.rows.length > 0) dbStatus = 'ok';
  } catch (e) {
    dbStatus = 'ng';
  }

  // Blobチェック
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER);
    const exists = await containerClient.exists();
    if (exists) {
      // prefix配下に1つでもblobがあればok
      for await (const blob of containerClient.listBlobsFlat({ prefix: BLOB_PREFIX })) {
        blobStatus = 'ok';
        break;
      }
      // blobがなくてもコンテナ存在でok
      if (blobStatus !== 'ok') blobStatus = 'ok';
    }
  } catch (e) {
    blobStatus = 'ng';
  }

  res.json({ ok: true, db: dbStatus, blob: blobStatus });
});

// 必要な他のAPIルートもここに追加

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
