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
      console.log('[api/files/import] File upload request received:', {
        hasFile: !!req.file,
        hasFiles: !!req.files,
        bodyKeys: Object.keys(req.body || {}),
        contentType: req.headers['content-type']
      });

      // Multerでファイルをパースする必要があるため、multerミドルウェアが適用されているかチェック
      if (!req.file && !req.files) {
        console.error('[api/files/import] No file uploaded. Request details:', {
          headers: req.headers,
          body: req.body
        });
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'ファイルが選択されていません。ファイルサイズが制限（100MB）を超えている可能性があります。'
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
          // ファイルインポートは知識ベースとは別の場所に保存する
          const blobPath = `imports/${safeFileName}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

          console.log('[api/files/import] Uploading to blob:', {
            container: containerName,
            blobPath,
            fileSize: uploadedFile.size
          });

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

          // 自動処理トリガー: DataProcessorを呼び出す
          // NOTE: 本来はAzure FunctionsのBlob TriggerやQueueを使うべきだが、
          // 簡易実装としてここで直接関数呼び出しか、HTTPリクエストを行う。
          // ここではimportして直接ロジックを呼ぶのは循環依存のリスクがあるため、
          // 非同期で処理を開始したログだけ残し、クライアント側で処理用エンドポイントを叩くか、
          // あるいはここで内部的に処理用の関数を呼ぶ設計にするのが良い。
          // 今回は「確認して？」とのことなので、確実に動くように、内部でfetchを使って自分自身のDataProcessorを叩くか、
          // または動的にインポートして実行する。

          try {
            // 自身のAPIを呼び出す (非同期でFire-and-forget)
            const processorUrl = `http://localhost:${process.env.PORT || 3000}/api/data-processor/process`;
            // Node fetch or global fetch if available (Node 18+)
            // If not, we can use dynamic import of the processor function logic if refactored.
            // For robustness in this monolith:

            // Dynamic import of the handler to execute in-process (but async)
            import('../data-processor/index.mjs').then(async (module) => {
              console.log('[api/files/import] Triggering async processing...');
              const processorHeaders = { 'Content-Type': 'application/json' };
              const processorBody = {
                filePath: blobPath,
                fileType: uploadedFile.mimetype,
                fileName: fileName
              };

              // Mock req/res objects for the internal call
              const mockReq = {
                method: 'POST',
                path: '/api/data-processor/process',
                body: processorBody
              };
              const mockRes = {
                set: () => { },
                status: (code) => ({
                  json: (data) => console.log(`[Processor Internal] Finished with ${code}:`, data),
                  send: () => { }
                }),
                json: (data) => console.log('[Processor Internal] JSON:', data)
              };

              await module.default(mockReq, mockRes);
            }).catch(err => console.error('[api/files/import] Failed to trigger processing:', err));

          } catch (triggerError) {
            console.warn('[api/files/import] Processing trigger warning:', triggerError);
          }

          return res.status(200).json({
            success: true,
            message: 'ファイルのインポートが完了しました（バックグラウンド処理開始）',
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
