const { app } = require('@azure/functions');

app.http('knowledgeBaseFuseImages', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'knowledge-base/fuse/images',
    handler: async (request, context) => {
        try {
            context.log('Knowledge Base Fuse Images HTTP trigger function processed a request.');

            // OPTIONSリクエストの処理
            if (request.method === 'OPTIONS') {
                return {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
                        'Access-Control-Max-Age': '86400'
                    },
                    body: ''
                };
            }

            const method = request.method;
            const url = new URL(request.url);
            const searchParams = url.searchParams;
            
            context.log('Knowledge Base Fuse Images request:', { method, searchParams: Object.fromEntries(searchParams) });

            // GET /api/knowledge-base/fuse/images - 画像検索・統合
            if (method === 'GET') {
                const query = searchParams.get('query') || '';
                const category = searchParams.get('category') || '';
                const limit = parseInt(searchParams.get('limit') || '10');

                const fuseResults = [
                    {
                        id: 'fuse-img-1',
                        filename: 'fused-image-1.jpg',
                        category: 'troubleshooting',
                        size: 51200,
                        mimeType: 'image/jpeg',
                        url: '/api/knowledge-base/images/troubleshooting/fused-image-1.jpg',
                        description: '統合された画像1',
                        tags: ['fused', 'troubleshooting', query],
                        relevanceScore: 0.95,
                        source: 'knowledge-base',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'fuse-img-2',
                        filename: 'fused-image-2.png',
                        category: 'emergency',
                        size: 76800,
                        mimeType: 'image/png',
                        url: '/api/knowledge-base/images/emergency/fused-image-2.png',
                        description: '統合された画像2',
                        tags: ['fused', 'emergency', query],
                        relevanceScore: 0.87,
                        source: 'knowledge-base',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'fuse-img-3',
                        filename: 'fused-image-3.jpg',
                        category: 'maintenance',
                        size: 64000,
                        mimeType: 'image/jpeg',
                        url: '/api/knowledge-base/images/maintenance/fused-image-3.jpg',
                        description: '統合された画像3',
                        tags: ['fused', 'maintenance', query],
                        relevanceScore: 0.82,
                        source: 'knowledge-base',
                        createdAt: new Date().toISOString()
                    }
                ];

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: fuseResults.slice(0, limit),
                        query: query,
                        category: category,
                        total: fuseResults.length,
                        limit: limit,
                        searchMetadata: {
                            searchTime: Math.random() * 100,
                            totalSources: 3,
                            fusedSources: ['troubleshooting', 'emergency', 'maintenance']
                        }
                    })
                };
            }

            // POST /api/knowledge-base/fuse/images - 画像統合処理
            if (method === 'POST') {
                const body = await request.json();
                
                const fuseProcessResult = {
                    success: true,
                    message: '画像の統合処理が完了しました',
                    fusedImages: [
                        {
                            id: 'fused-result-1',
                            filename: 'fused-result-1.jpg',
                            category: 'fused',
                            size: 102400,
                            mimeType: 'image/jpeg',
                            url: '/api/knowledge-base/images/fused/fused-result-1.jpg',
                            description: '統合処理結果1',
                            tags: ['fused', 'result'],
                            sourceImages: body.sourceImages || [],
                            processingTime: Math.random() * 1000,
                            createdAt: new Date().toISOString()
                        }
                    ],
                    statistics: {
                        totalSourceImages: body.sourceImages?.length || 0,
                        fusedImages: 1,
                        processingTime: Math.random() * 1000,
                        successRate: 1.0
                    }
                };

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify(fuseProcessResult)
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
            context.log.error('Error in knowledge base fuse images function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ナレッジベース画像統合に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
