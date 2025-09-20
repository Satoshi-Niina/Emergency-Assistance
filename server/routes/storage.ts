import express from 'express';
import { BlobServiceClient } from '@azure/storage-blob';

const router = express.Router();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.BLOB_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
const blobPrefix = process.env.BLOB_PREFIX || 'Azure-knowledge/knowledge-base/';

router.get('/list', async (req, res) => {
  try {
    console.log('🔍 ストレージ一覧取得リクエスト:', { connectionString: !!connectionString, containerName, blobPrefix });
    
    if (!connectionString) {
      console.warn('⚠️ Azure Storage接続文字列が設定されていません。空のリストを返します。');
      return res.status(200).type('application/json').json([]);
    }
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const list: string[] = [];
    
    for await (const b of containerClient.listBlobsFlat({ prefix: blobPrefix })) {
      list.push(b.name.substring(blobPrefix.length));
    }
    
    console.log(`✅ ストレージ一覧取得完了: ${list.length}件`);
    
    // 本番環境用ログ出力
    console.log({ route: '/api/storage/list', count: list.length });
    
    res.type('application/json').json(list);
  } catch (err) {
    console.error('❌ ストレージ一覧取得エラー:', err);
    res.status(500).type('application/json').json({ 
      error: 'storage_list_error', 
      message: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

export default router;
