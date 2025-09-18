const { app } = require('@azure/functions');

app.http('authMe', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/me',
    handler: async (request, context) => {
        try {
            context.log('Auth me HTTP trigger function processed a request.');

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

            // セッション情報を取得
            const sessionId = request.headers.get('cookie')?.match(/sessionId=([^;]+)/)?.[1];
            const authHeader = request.headers.get('authorization');
            
            context.log('Auth headers:', { 
                hasSessionId: !!sessionId, 
                hasAuthHeader: !!authHeader,
                cookies: request.headers.get('cookie')
            });

            // 簡易認証：セッションIDまたはAuthorizationヘッダーがあれば認証済みとする
            if (!sessionId && !authHeader) {
                return {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: '未認証',
                        message: 'セッションまたは認証情報が必要です'
                    })
                };
            }

            // デフォルトユーザーを返す（データベース接続を一時的に無効化）
            const user = {
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
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                },
                body: JSON.stringify({
                    success: true,
                    user: user,
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
