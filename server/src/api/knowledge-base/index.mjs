import fs from 'fs';
import { join } from 'path';
import { dbQuery } from '../../infra/db.mjs';
import { isAzureEnvironment } from '../../config/env.mjs';
import { getBlobServiceClient, containerName } from '../../infra/blob.mjs';

export default async function (req, res) {
  try {
    console.log('[api/knowledge-base] Request:', { method: req.method, path: req.path });

    // 統計エンドポイント: /api/knowledge-base/stats
    // 統計エンドポイント: /api/knowledge-base/stats
    // Azure Functionsでは /api/knowledge-base 部分でトリガーされるため、
    // 相対パスが /stats または stats であるか、もしくはクエリパラメータ等も考慮
    const isStatsRequest = req.path.endsWith('/stats') || req.url.includes('/stats');

    if (isStatsRequest) {
      console.log('[api/knowledge-base] Serving stats endpoint');
      try {
        // BlobとDBの両方から統計を取得するのは重いため、一旦簡易的な応答を返す
        // 必要であればここでDBカウントなどを実施
        return res.json({
          success: true,
          stats: {
            documents: rows.length || 0, // rowsはこの時点では空だが、構造を維持
            lastUpdated: new Date().toISOString(),
            status: 'online'
          },
          timestamp: new Date().toISOString(),
        });
      } catch (statsError) {
        console.error('[api/knowledge-base/stats] Error generating stats:', statsError);
        return res.status(500).json({ error: 'Stats generation failed' });
      }
    }

    console.log('Knowledge base HTTP trigger function processed a request.');

    let rows = [];

    try {
      // 生のSQLクエリで直接データを取得
      // base_documentsテーブルにはcontentカラムがないため、file_pathを使用
      const result = await dbQuery(`
              SELECT id, title, file_path, created_at
              FROM base_documents
              ORDER BY created_at DESC
          `);

      rows = result.rows.map(row => ({
        ...row,
        content: row.file_path, // file_pathをcontentとして扱う（互換性のため）
        category: 'base_document'
      }));
      console.log('Knowledge base query result:', { count: rows.length });
    } catch (dbError) {
      console.warn('Knowledge base DB query failed, falling back to storage:', dbError.message);

      // Azure環境かどうかを判定
      const useAzure = isAzureEnvironment();
      console.log('[knowledge-base] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_MODE: process.env.STORAGE_MODE,
        hasStorageConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        isAzureEnvironment: useAzure
      });

      // ローカル環境: ローカルファイルシステムから取得
      if (!useAzure) {
        console.log('[knowledge-base] LOCAL: Using local filesystem');
        const localPath = join(process.cwd(), 'knowledge-base', 'index.json');

        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, 'utf8');
          const fallbackData = JSON.parse(raw);
          rows = Array.isArray(fallbackData) ? fallbackData : [];
          console.log(`[knowledge-base] LOCAL: Loaded ${rows.length} documents from local file`);
        } else {
          console.log('[knowledge-base] LOCAL: No local file found:', localPath);
        }
      } else {
        // Azure環境: BLOBストレージから取得
        console.log('[knowledge-base] AZURE: Using BLOB storage');
        try {
          const blobServiceClient = getBlobServiceClient();

          if (blobServiceClient) {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const prefix = 'knowledge-base/documents/';

            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
              if (!blob.name.endsWith('.json')) continue;

              try {
                const blobClient = containerClient.getBlobClient(blob.name);
                const downloadResponse = await blobClient.download();
                const chunks = [];

                if (downloadResponse.readableStreamBody) {
                  for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                  }
                  const buffer = Buffer.concat(chunks);
                  const data = JSON.parse(buffer.toString('utf8'));

                  if (Array.isArray(data)) {
                    rows.push(...data);
                  } else if (data.title && data.content) {
                    rows.push(data);
                  }
                }
              } catch (blobError) {
                console.warn(`[knowledge-base] AZURE: Failed to load blob ${blob.name}:`, blobError.message);
              }
            }
            console.log(`[knowledge-base] AZURE: ✅ Loaded ${rows.length} documents from Blob storage`);
          } else {
            console.warn('[knowledge-base] AZURE: BLOB service client unavailable');
          }
        } catch (fileError) {
          console.error('[knowledge-base] AZURE: Fallback load failed:', fileError.message);
        }
      }
    }

    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    res.json({
      success: true,
      data: rows,
      total: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in knowledge base function:', error);
    res.status(500).set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }).json({
      success: false,
      error: 'ナレッジデータの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export const methods = ['get', 'post'];
