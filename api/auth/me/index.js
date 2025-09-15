const { app } = require('@azure/functions');
const { db } = require('../../../server/db/index.js');
const { users } = require('../../../server/db/schema.js');
const { eq } = require('drizzle-orm');

app.http('authMe', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'auth/me',
    handler: async (request, context) => {
        try {
            context.log('Auth me HTTP trigger function processed a request.');

            // セッション情報を取得（簡易実装）
            const sessionId = request.headers.get('cookie')?.match(/sessionId=([^;]+)/)?.[1];
            
            if (!sessionId) {
                return {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: '未認証'
                    })
                };
            }

            // デフォルトユーザーを返す（簡易実装）
            const defaultUser = {
                id: 'default-user-id',
                username: 'admin',
                displayName: '管理者',
                role: 'admin',
                department: 'システム管理部'
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: JSON.stringify({
                    success: true,
                    user: defaultUser,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in auth me function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '認証確認に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
