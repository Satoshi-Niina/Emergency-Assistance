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
        saveOriginalFile,
        bufferFirst20Bytes: uploadedFile?.buffer ? Array.from(uploadedFile.buffer.slice(0, 20)) : null,
        bufferFirst20Hex: uploadedFile?.buffer ? uploadedFile.buffer.slice(0, 20).toString('hex') : null
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
      
      // ファイル名をサニタイズ（特殊文字を削除してURLセーフにする）
      const sanitizedFileName = fileName
        .normalize('NFC')  // Unicode正規化
        .replace(/[\s]+/g, '_')  // スペースをアンダースコアに
        .replace(/[^\w\.\-]/g, '')  // 英数字、ドット、ハイフン、アンダースコア以外を削除
        .replace(/\.+/g, '.')  // 連続するドットを1つに
        .trim();
      
      const safeFileName = `${timestamp}_${sanitizedFileName}`;

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
          let blobPath = null;

          // saveOriginalFileがtrueの場合のみ元ファイルを保存
          if (saveOriginalFile) {
            blobPath = `knowledge-base/imports/${safeFileName}`;
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
          } else {
            console.log('[api/files/import] ⚠️ Skipping original file save (saveOriginalFile=false)');
          }

          // 自動処理トリガー: DataProcessorを呼び出す
          // NOTE: 本来はAzure FunctionsのBlob TriggerやQueueを使うべきだが、
          // 簡易実装としてここで直接関数呼び出しか、HTTPリクエストを行う。
          // ここではimportして直接ロジックを呼ぶのは循環依存のリスクがあるため、
          // 非同期で処理を開始したログだけ残し、クライアント側で処理用エンドポイントを叩くか、
          // あるいはここで内部的に処理用の関数を呼ぶ設計にするのが良い。
          // 今回は「確認して？」とのことなので、確実に動くように、内部でfetchを使って自分自身のDataProcessorを叩くか、
          // または動的にインポートして実行する。

          // 自動処理トリガー（非同期）
          setImmediate(async () => {
            try {
              console.log('[api/files/import] 🔄 バックグラウンド処理開始:', fileName);
              const module = await import('../data-processor/index.mjs');
              
              // 重要: fileBufferはBufferインスタンスのまま渡す（JSON化しない）
              const fileBufferToPass = saveOriginalFile ? null : uploadedFile.buffer;
              
              console.log('[api/files/import] Passing buffer:', {
                hasBuffer: !!fileBufferToPass,
                isBuffer: fileBufferToPass ? Buffer.isBuffer(fileBufferToPass) : false,
                bufferLength: fileBufferToPass ? fileBufferToPass.length : 0
              });
              
              const mockReq = {
                method: 'POST',
                path: '/api/data-processor/process',
                body: {
                  filePath: blobPath,
                  fileBuffer: fileBufferToPass,
                  fileType: uploadedFile.mimetype,
                  fileName: fileName
                }
              };
              
              const mockRes = {
                set: () => {},
                status: (code) => ({
                  json: (data) => {
                    if (code === 200) {
                      console.log('[api/files/import] ✅ 処理完了:', fileName);
                    } else {
                      console.error('[api/files/import] ❌ 処理失敗:', code, data);
                    }
                  },
                  send: () => {}
                }),
                json: (data) => console.log('[api/files/import] 処理結果:', data)
              };

              await module.default(mockReq, mockRes);
            } catch (err) {
              console.error('[api/files/import] ❌ バックグラウンド処理エラー:', err);
            }
          });

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
          let localPath = null;

          // saveOriginalFileがtrueの場合のみ元ファイルを保存
          if (saveOriginalFile) {
            const uploadsDir = path.join(process.cwd(), 'knowledge-base', 'imports');
            await fs.mkdir(uploadsDir, { recursive: true });

            localPath = path.join(uploadsDir, safeFileName);
            await fs.writeFile(localPath, uploadedFile.buffer);

            console.log('[api/files/import] ✅ File saved locally:', localPath);
          } else {
            console.log('[api/files/import] ⚠️ Skipping original file save (saveOriginalFile=false)');
          }

          // 自動処理トリガー（非同期）
          setImmediate(async () => {
            try {
              console.log('[api/files/import] 🔄 バックグラウンド処理開始:', fileName);
              const module = await import('../data-processor/index.mjs');
              
              // 重要: fileBufferはBufferインスタンスのまま渡す（JSON化しない）
              const fileBufferToPass = saveOriginalFile ? null : uploadedFile.buffer;
              
              console.log('[api/files/import] Passing buffer:', {
                hasBuffer: !!fileBufferToPass,
                isBuffer: fileBufferToPass ? Buffer.isBuffer(fileBufferToPass) : false,
                bufferLength: fileBufferToPass ? fileBufferToPass.length : 0
              });
              
              const mockReq = {
                method: 'POST',
                path: '/api/data-processor/process',
                body: {
                  filePath: localPath,
                  fileBuffer: fileBufferToPass,
                  fileType: uploadedFile.mimetype,
                  fileName: fileName
                }
              };
              
              const mockRes = {
                set: () => {},
                status: (code) => ({
                  json: (data) => {
                    if (code === 200) {
                      console.log('[api/files/import] ✅ 処理完了:', fileName);
                    } else {
                      console.error('[api/files/import] ❌ 処理失敗:', code, data);
                    }
                  },
                  send: () => {}
                }),
                json: (data) => console.log('[api/files/import] 処理結果:', data)
              };

              await module.default(mockReq, mockRes);
            } catch (err) {
              console.error('[api/files/import] ❌ バックグラウンド処理エラー:', err);
            }
          });

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
