import { upload } from '../../infra/blob.mjs';
import { isAzureEnvironment } from '../../config/env.mjs';
import { getBlobServiceClient, norm, containerName } from '../../infra/blob.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (req, res) {
  try {
    console.log('[api/files] Request:', { method: req.method, path: req.path, url: req.url });

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    // パスパラメータの取得
    const parts = req.path.split('/');
    const action = parts[parts.length - 1];
    const method = req.method;

    console.log('[api/files] Request details:', { method, action, path: req.path });

    // POST /api/files/import - ファイルインポート
    if (method === 'POST' && (action === 'import' || req.path.endsWith('/import'))) {
      // Multerでファイルをパースする必要があるため、multerミドルウェアが適用されているかチェック
      if (!req.file && !req.files) {
        console.log('[api/files/import] No file uploaded, checking body:', req.body);
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'ファイルが選択されていません'
        });
      }

      const uploadedFile = req.file;
      const saveOriginalFile = req.body.saveOriginalFile === 'true';

      console.log('[api/files/import] File upload:', {
        fileName: uploadedFile?.originalname,
        fileSize: uploadedFile?.size,
        mimetype: uploadedFile?.mimetype,
        saveOriginalFile
      });

      const useAzure = isAzureEnvironment();
      console.log('[api/files/import] Environment:', {
        useAzure,
        STORAGE_MODE: process.env.STORAGE_MODE,
        NODE_ENV: process.env.NODE_ENV
      });

      // 保存先を決定
      const fileName = uploadedFile.originalname;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFileName = `${timestamp}_${fileName}`;

      if (useAzure) {
        // Azure Blob Storage に保存
        console.log('[api/files/import] Saving to Azure Blob Storage');

        try {
          const blobServiceClient = getBlobServiceClient();
          if (!blobServiceClient) {
            console.error('[api/files/import] ❌ Failed to initialize Blob Service Client');
            return res.status(503).json({
              success: false,
              error: 'Storage service unavailable (Configuration Error)',
              message: 'ストレージサービスへの接続に失敗しました。管理者に連絡してください。',
              code: 'BLOB_CLIENT_INIT_FAILED'
            });
          }

          const containerClient = blobServiceClient.getContainerClient(containerName);
          const blobPath = norm(`imports/${safeFileName}`);
          const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

          // コンテナの存在確認と作成
          const containerExists = await containerClient.exists();
          if (!containerExists) {
            console.log('[api/files/import] Creating container:', containerName);
            await containerClient.create();
          }

          await blockBlobClient.upload(uploadedFile.buffer, uploadedFile.size, {
            blobHTTPHeaders: {
              blobContentType: uploadedFile.mimetype
            }
          });

          console.log('[api/files/import] ✅ File uploaded to Blob:', blobPath);

          return res.status(200).json({
            success: true,
            message: 'ファイルのインポートが完了しました（Blob Storage）',
            importedFiles: [{
              id: `blob-${timestamp}`,
              name: fileName,
              path: blobPath,
              size: uploadedFile.size,
              type: uploadedFile.mimetype,
              importedAt: new Date().toISOString(),
              storage: 'blob'
            }],
            totalFiles: 1,
            processedFiles: 1,
            errors: []
          });
        } catch (error) {
          console.error('[api/files/import] Blob upload error:', error);
          throw error;
        }
      } else {
        // ローカルファイルシステムに保存
        console.log('[api/files/import] Saving to local filesystem');

        try {
          const uploadsDir = path.join(process.cwd(), 'uploads', 'imports');
          await fs.mkdir(uploadsDir, { recursive: true });

          const localPath = path.join(uploadsDir, safeFileName);
          await fs.writeFile(localPath, uploadedFile.buffer);

          console.log('[api/files/import] ✅ File saved locally:', localPath);

          return res.status(200).json({
            success: true,
            message: 'ファイルのインポートが完了しました（ローカルストレージ）',
            importedFiles: [{
              id: `local-${timestamp}`,
              name: fileName,
              path: localPath,
              size: uploadedFile.size,
              type: uploadedFile.mimetype,
              importedAt: new Date().toISOString(),
              storage: 'local'
            }],
            totalFiles: 1,
            processedFiles: 1,
            errors: []
          });
        } catch (error) {
          console.error('[api/files/import] Local save error:', error);
          throw error;
        }
      }
    }

    // GET /api/files - ファイル一覧
    // action が空、または /api/files そのものへのアクセス
    if (method === 'GET' && (req.path === '/api/files' || req.path === '/api/files/')) {
      const files = [
        {
          id: 'file-1',
          name: 'sample-file-1.txt',
          size: 1024,
          type: 'text/plain',
          uploadedAt: new Date().toISOString(),
          status: 'ready',
        },
        {
          id: 'file-2',
          name: 'sample-file-2.pdf',
          size: 2048,
          type: 'application/pdf',
          uploadedAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'ready',
        },
      ];

      return res.status(200).json({
        success: true,
        data: files,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path
    });

  } catch (error) {
    console.error('[api/files] Error:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      path: req.path
    });
  }
}

export const methods = ['get', 'post', 'put', 'delete', 'options'];
export { upload };
