const { app } = require('@azure/functions');

app.http('history', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'history/{action?}',
    handler: async (request, context) => {
        try {
            context.log('History HTTP trigger function processed a request.');

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
            const url = new URL(request.url);
            const searchParams = url.searchParams;
            
            context.log('History request:', { method, action, searchParams: Object.fromEntries(searchParams) });

            // GET /api/history - 履歴一覧取得
            if (method === 'GET' && !action) {
                const page = parseInt(searchParams.get('page') || '1');
                const limit = parseInt(searchParams.get('limit') || '10');
                const search = searchParams.get('search') || '';

                const mockHistory = [
                    {
                        id: 'history-1',
                        title: 'サンプル履歴1',
                        description: 'サンプルの履歴データです',
                        type: 'operation',
                        timestamp: new Date().toISOString(),
                        user: 'admin',
                        status: 'completed'
                    },
                    {
                        id: 'history-2',
                        title: 'サンプル履歴2',
                        description: '別のサンプル履歴です',
                        type: 'maintenance',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        user: 'admin',
                        status: 'completed'
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
                        data: mockHistory,
                        pagination: {
                            page: page,
                            limit: limit,
                            total: mockHistory.length,
                            totalPages: Math.ceil(mockHistory.length / limit)
                        }
                    })
                };
            }

            // GET /api/history/machine-data - マシンデータ履歴
            if (method === 'GET' && action === 'machine-data') {
                const machineData = [
                    {
                        id: 'machine-1',
                        name: 'マシン1',
                        status: 'running',
                        lastMaintenance: new Date().toISOString(),
                        nextMaintenance: new Date(Date.now() + 7 * 86400000).toISOString()
                    },
                    {
                        id: 'machine-2',
                        name: 'マシン2',
                        status: 'maintenance',
                        lastMaintenance: new Date(Date.now() - 3 * 86400000).toISOString(),
                        nextMaintenance: new Date(Date.now() + 4 * 86400000).toISOString()
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
                        data: machineData
                    })
                };
            }

            // GET /api/history/search-filters - 検索フィルター
            if (method === 'GET' && action === 'search-filters') {
                const filters = {
                    types: ['operation', 'maintenance', 'error', 'info'],
                    statuses: ['completed', 'pending', 'failed', 'cancelled'],
                    users: ['admin', 'operator', 'maintenance'],
                    dateRanges: [
                        { label: '今日', value: 'today' },
                        { label: '昨日', value: 'yesterday' },
                        { label: '今週', value: 'this_week' },
                        { label: '今月', value: 'this_month' }
                    ]
                };

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
                        data: filters
                    })
                };
            }

            // GET /api/history/file - ファイル取得
            if (method === 'GET' && action === 'file') {
                const fileName = searchParams.get('name');
                if (!fileName) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            error: 'ファイル名が指定されていません'
                        })
                    };
                }

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
                        data: {
                            fileName: fileName,
                            content: `ファイル ${fileName} の内容です`,
                            size: 1024,
                            lastModified: new Date().toISOString()
                        }
                    })
                };
            }

            // PUT /api/history/update-item/{id} - 履歴項目更新
            if (method === 'PUT' && action === 'update-item') {
                const itemId = request.params.id;
                const body = await request.json();

                const updatedItem = {
                    id: itemId,
                    title: body.title || `更新された履歴 ${itemId}`,
                    description: body.description || '',
                    type: body.type || 'operation',
                    timestamp: new Date().toISOString(),
                    user: 'admin',
                    status: body.status || 'completed'
                };

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
                        data: updatedItem
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
            context.log.error('Error in history function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '履歴データの操作に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
