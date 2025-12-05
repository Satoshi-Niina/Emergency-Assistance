// ESM形式 - 画像取得エンドポイント
// /api/images/* にマッピング

import path from 'path';
import { fileURLToPath } from 'url';
import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function imagesHandler(req, res) {
  const method = req.method;
  
  // GETリクエスト: 画像取得
  if (method === 'GET') {
    // パスから category と fileName を抽出
    // /api/images/chat-exports/xxx.jpg → category: chat-exports, fileName: xxx.jpg
    // /api/images/emergency-flows/xxx.jpg → category: emergency-flows, fileName: xxx.jpg
    const pathParts = req.path.split('/').filter(Boolean);
    
    if (pathParts.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid path format. Expected: /api/images/{category}/{fileName}'
      });
    }
    
    const category = pathParts[2]; // 'chat-exports' or 'emergency-flows'
    const fileName = pathParts.slice(3).join('/'); // ファイル名（サブフォルダ対応）
    
    console.log(`[api/images] Fetching image: category=${category}, fileName=${fileName}`);
    
    const setImageHeaders = (contentType) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    };
    
    const extension = path.extname(fileName || '').toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    try {
      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        console.warn('[api/images] BLOB service client not available');
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }
      
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`knowledge-base/images/${category}/${fileName}`);
      console.log('[api/images] Looking for blob:', blobName);
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      if (await blockBlobClient.exists()) {
        console.log('[api/images] BLOB found:', blobName);
        const downloadResponse = await blockBlobClient.download();
        const chunks = [];
        
        if (downloadResponse.readableStreamBody) {
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          setImageHeaders(contentType);
          return res.status(200).send(buffer);
        }
        
        console.warn('[api/images] readableStreamBody is null');
      } else {
        console.log('[api/images] BLOB not found:', blobName);
      }
      
      return res.status(404).json({
        success: false,
        error: '画像が見つかりません',
        fileName: fileName
      });
      
    } catch (error) {
      console.error('[api/images] Error:', error);
      return res.status(500).json({
        success: false,
        error: '画像の取得に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return res.status(405).json({
    success: false,
    error: `Method ${method} not allowed`
  });
}

export const methods = ['get'];
