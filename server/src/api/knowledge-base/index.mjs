import fs from 'fs';
import { join } from 'path';
import { dbQuery } from '../../infra/db.mjs';

export default async function (req, res) {
  try {
    console.log('Knowledge base HTTP trigger function processed a request.');

    let rows = [];

    try {
      // 生のSQLクエリで直接データを取得
      const result = await dbQuery(`
              SELECT id, title, content, category, created_at
              FROM base_documents
              ORDER BY created_at DESC
          `);

      rows = result.rows;
      console.log('Knowledge base query result:', { count: rows.length });
    } catch (dbError) {
      console.warn('Knowledge base DB query failed, falling back to Blob documents:', dbError.message);
      try {
        const { getBlobServiceClient, containerName } = await import('../../infra/blob.mjs');
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
              console.warn(`Failed to load blob ${blob.name}:`, blobError.message);
            }
          }
          console.log(`Loaded ${rows.length} documents from Blob storage`);
        } else {
          // Blobも利用不可の場合はローカルファイルフォールバック
          const localPath = join(process.cwd(), 'knowledge-base', 'index.json');
          if (fs.existsSync(localPath)) {
            const raw = fs.readFileSync(localPath, 'utf8');
            const fallbackData = JSON.parse(raw);
            rows = Array.isArray(fallbackData) ? fallbackData : [];
          }
        }
      } catch (fileError) {
        console.error('Knowledge base fallback load failed:', fileError.message);
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
    }).json({
      success: false,
      error: 'ナレッジデータの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
