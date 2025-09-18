const { app } = require('@azure/functions');

app.http('settings', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'settings/{action?}',
    handler: async (request, context) => {
        try {
            context.log('Settings HTTP trigger function processed a request.');

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
            
            context.log('Settings request:', { method, action });

            // GET /api/settings/rag - RAG設定取得
            if (method === 'GET' && action === 'rag') {
                const ragSettings = {
                    enabled: true,
                    model: 'gpt-3.5-turbo',
                    temperature: 0.7,
                    maxTokens: 1000,
                    knowledgeBase: {
                        enabled: true,
                        sources: ['documents', 'troubleshooting', 'knowledge-base'],
                        similarityThreshold: 0.8
                    },
                    searchSettings: {
                        maxResults: 10,
                        includeMetadata: true,
                        filterByCategory: false
                    }
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
                        data: ragSettings
                    })
                };
            }

            // POST /api/settings/rag - RAG設定更新
            if (method === 'POST' && action === 'rag') {
                const body = await request.json();
                
                const updatedSettings = {
                    enabled: body.enabled !== undefined ? body.enabled : true,
                    model: body.model || 'gpt-3.5-turbo',
                    temperature: body.temperature || 0.7,
                    maxTokens: body.maxTokens || 1000,
                    knowledgeBase: {
                        enabled: body.knowledgeBase?.enabled !== undefined ? body.knowledgeBase.enabled : true,
                        sources: body.knowledgeBase?.sources || ['documents', 'troubleshooting', 'knowledge-base'],
                        similarityThreshold: body.knowledgeBase?.similarityThreshold || 0.8
                    },
                    searchSettings: {
                        maxResults: body.searchSettings?.maxResults || 10,
                        includeMetadata: body.searchSettings?.includeMetadata !== undefined ? body.searchSettings.includeMetadata : true,
                        filterByCategory: body.searchSettings?.filterByCategory || false
                    },
                    updatedAt: new Date().toISOString()
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
                        data: updatedSettings,
                        message: 'RAG設定が更新されました'
                    })
                };
            }

            // GET /api/settings - 全設定取得
            if (method === 'GET' && !action) {
                const allSettings = {
                    rag: {
                        enabled: true,
                        model: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: 1000
                    },
                    system: {
                        maintenanceMode: false,
                        debugMode: false,
                        logLevel: 'info'
                    },
                    notifications: {
                        email: true,
                        push: false,
                        sms: false
                    }
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
                        data: allSettings
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
            context.log.error('Error in settings function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '設定の操作に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
