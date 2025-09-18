module.exports = async (context, request) => {
        try {
            context.log('Files HTTP trigger function processed a request.');

            // OPTIONSリクエストの処理
            if (request.method === 'OPTIONS') {
                return {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
                        'Access-Control-Max-Age': '86400'
                    },
                    body: ''
                };
            }

            const action = request.params.action;
            const method = request.method;
            
            context.log('Files request:', { method, action });

            // POST /api/files/import - ファイルインポート
            if (method === 'POST' && action === 'import') {
                const body = await request.json();
                
                const importResult = {
                    success: true,
                    message: 'ファイルのインポートが完了しました',
                    importedFiles: [
                        {
                            id: 'imported-1',
                            name: body.fileName || 'imported-file.txt',
                            size: body.fileSize || 1024,
                            type: body.fileType || 'text/plain',
                            importedAt: new Date().toISOString()
                        }
                    ],
                    totalFiles: 1,
                    processedFiles: 1,
                    errors: []
                };

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify(importResult)
                };
            }

            // GET /api/files - ファイル一覧
            if (method === 'GET' && !action) {
                const files = [
                    {
                        id: 'file-1',
                        name: 'sample-file-1.txt',
                        size: 1024,
                        type: 'text/plain',
                        uploadedAt: new Date().toISOString(),
                        status: 'ready'
                    },
                    {
                        id: 'file-2',
                        name: 'sample-file-2.pdf',
                        size: 2048,
                        type: 'application/pdf',
                        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
                        status: 'ready'
                    }
                ];

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: files
                    })
                };
            }

            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Not found'
                })
            };

        } catch (error) {
            context.log.error('Error in files function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ファイル操作に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        };