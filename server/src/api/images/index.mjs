// ESM形式 - 画像取得エンドポイント
// /api/images/* にマッピング

import fs from 'fs';
import path from 'path';
import { getBlobServiceClient, containerName } from '../../infra/blob.mjs';

export default async function imagesHandler(req, res) {
  const method = req.method;
  
  // OPTIONS preflight対応
  if (method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.status(200).end();
  }
  
  // GETリクエスト: 画像取得
  if (method === 'GET') {
    // パスから category と fileName を抽出
    // /api/images/chat-exports/xxx.jpg → category: chat-exports, fileName: xxx.jpg
    // /api/images/emergency-flows/xxx.jpg → category: emergency-flows, fileName: xxx.jpg
    const pathParts = req.path.split('/').filter(Boolean);
    
    console.log('[api/images] DEBUG: Full path:', req.path);
    console.log('[api/images] DEBUG: pathParts:', pathParts);
    
    // pathParts = ['api', 'images', 'chat-exports', 'xxx.jpg']
    // index 0: 'api'
    // index 1: 'images'
    // index 2: 'chat-exports' (category)
    // index 3+: 'xxx.jpg' (fileName)
    
    if (pathParts.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Invalid path format. Expected: /api/images/{category}/{fileName}',
        receivedPath: req.path,
        pathParts: pathParts
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
    const contentType = mimeTypes[extension] || 'image/jpeg'; // デフォルトをimage/jpegに変更
    
    console.log('[api/images] Content-Type determination:', {
      fileName,
      extension,
      contentType
    });
    
    try {
      const blobServiceClient = getBlobServiceClient();
      const isProduction = process.env.NODE_ENV === 'production';
      
      // 本番環境: BLOB必須
      if (isProduction && !blobServiceClient) {
        console.error('[api/images] PRODUCTION: BLOB service client not available');
        return res.status(503).json({
          success: false,
          error: 'ストレージサービスが利用できません（本番環境）'
        });
      }
      
      // BLOBサービスが利用可能な場合: BLOBから取得
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const blobName = `knowledge-base/images/${category}/${fileName}`;
          console.log('[api/images] Looking for blob:', blobName);
          
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const exists = await blockBlobClient.exists();
          
          if (!exists) {
            console.log('[api/images] BLOB not found:', blobName);
            // 本番環境ではBLOBに存在しない場合は404
            if (isProduction) {
              return res.status(404).json({
                success: false,
                error: '画像が見つかりません（本番環境）',
                fileName: fileName,
                blobName: blobName
              });
            }
            // 開発環境のみローカルファイルシステムにフォールバック
          } else {
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
            if (isProduction) {
              return res.status(500).json({
                success: false,
                error: '画像データの読み込みに失敗しました'
              });
            }
          }
        } catch (blobError) {
          console.error('[api/images] BLOB error:', blobError.message);
          // 本番環境ではBLOBエラーは致命的
          if (isProduction) {
            return res.status(500).json({
              success: false,
              error: 'BLOB取得エラー（本番環境）',
              details: blobError.message
            });
          }
          // 開発環境のみローカルファイルシステムにフォールバック
        }
      }
      
      // 開発環境のみ: ローカルファイルシステムからの取得
      if (!isProduction) {
        console.log('[api/images] DEV: Trying local filesystem fallback');
        const localBasePath = path.resolve(process.cwd(), 'knowledge-base', 'images', category);
        const localFilePath = path.join(localBasePath, fileName);
        
        console.log('[api/images] DEV: Local file path:', localFilePath);
        
        if (fs.existsSync(localFilePath)) {
          console.log('[api/images] DEV: Local file found:', localFilePath);
          const fileBuffer = fs.readFileSync(localFilePath);
          setImageHeaders(contentType);
          return res.status(200).send(fileBuffer);
        }
        
        console.log('[api/images] DEV: File not found in local filesystem:', localFilePath);
        return res.status(404).json({
          success: false,
          error: '画像が見つかりません（開発環境）',
          fileName: fileName,
          searchedPaths: {
            blob: blobServiceClient ? `knowledge-base/images/${category}/${fileName}` : 'BLOB not configured',
            local: localFilePath
          }
        });
      }
      
      // 本番環境でBLOBから取得できなかった場合
      return res.status(404).json({
        success: false,
        error: '画像が見つかりません',
        fileName: fileName
      });
      
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
