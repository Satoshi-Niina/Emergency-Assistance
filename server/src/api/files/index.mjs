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

    console.log('Files request:', { method, action });

    // POST /api/files/import - ファイルインポート
    if (method === 'POST' && (action === 'import' || req.path.endsWith('/import'))) {
      const body = req.body;

      const importResult = {
        success: true,
        message: 'ファイルのインポートが完了しました',
        importedFiles: [
          {
            id: 'imported-1',
            name: body.fileName || 'imported-file.txt',
            size: body.fileSize || 1024,
            type: body.fileType || 'text/plain',
            importedAt: new Date().toISOString(),
          },
        ],
        totalFiles: 1,
        processedFiles: 1,
        errors: [],
      };

      return res.status(200).json(importResult);
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
