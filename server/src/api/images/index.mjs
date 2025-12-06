// ESM形式 - 画像取得エンドポイント
// /api/images/* にマッピング

import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName } from '../../infra/blob.mjs';

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
      
      // BLOB専用アーキテクチャ: BLOBが利用できない場合はエラー
      if (!blobServiceClient) {
        console.error('[api/images] BLOB service client not available');
        return res.status(503).json({
          success: false,
          error: 'ストレージサービスが利用できません'
        });
      }

      // 本番環境: BLOBから取得
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = `knowledge-base/images/${category}/${fileName}`;
        console.log('[api/images] Looking for blob:', blobName);
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const exists = await blockBlobClient.exists();
        
        if (!exists) {
          console.log('[api/images] BLOB not found:', blobName);
          return res.status(404).json({
            success: false,
            error: '画像が見つかりません',
            fileName: fileName
          });
        }
        
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
        
        console.error('[api/images] readableStreamBody is null');
        return res.status(500).json({
          success: false,
          error: '画像データの読み込みに失敗しました'
        });
      } catch (blobError) {
        console.error('[api/images] BLOB error:', blobError.message);
        
        // BLOB専用: フォールバックなし
        return res.status(500).json({
          success: false,
          error: 'BLOB取得エラー',
          details: blobError.message
        });
      }
      
    } catch (error) {
      console.error('[api/images] Error (falling back to 404):', error);
      return res.status(404).json({
        success: false,
        error: '画像が見つかりません',
        fileName: fileName,
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
