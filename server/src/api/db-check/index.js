const { app } = require('@azure/functions');

app.http('dbCheck', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'db-check',
    handler: async (request, context) => {
        try {
            context.log('DB Check HTTP trigger function processed a request.');

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

            // データベース接続チェックのモック
            const dbCheckResult = {
                success: true,
                message: 'データベース接続は正常です',
                checks: [
                    {
                        name: 'Connection Test',
                        status: 'passed',
                        message: 'データベースへの接続が成功しました',
                        responseTime: Math.random() * 100
                    },
                    {
                        name: 'Query Test',
                        status: 'passed',
                        message: 'クエリの実行が成功しました',
                        responseTime: Math.random() * 50
                    },
                    {
                        name: 'Schema Validation',
                        status: 'passed',
                        message: 'スキーマの検証が完了しました',
                        responseTime: Math.random() * 30
                    }
                ],
                overallStatus: 'healthy',
                timestamp: new Date().toISOString(),
                database: {
                    type: 'PostgreSQL',
                    version: '14.0',
                    host: 'localhost',
                    port: 5432,
                    database: 'webappdb'
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
                body: JSON.stringify(dbCheckResult)
            };

        } catch (error) {
            context.log.error('Error in db check function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'データベースチェックに失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        };