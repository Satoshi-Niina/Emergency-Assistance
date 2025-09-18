const { app } = require('@azure/functions');
const { db } = require('../../db/index.js');

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

            // データベースからユーザー情報を取得
            let user;
            try {
                const users = await db.execute(`
                    SELECT id, username, display_name, role, department, description, created_at
                    FROM users
                    WHERE role = 'admin'
                    LIMIT 1
                `);
                
                if (users.length > 0) {
                    user = {
                        id: users[0].id,
                        username: users[0].username,
                        displayName: users[0].display_name,
                        role: users[0].role,
                        department: users[0].department
                    };
                } else {
                    // デフォルトユーザー
                    user = {
                        id: 'default-user-id',
                        username: 'admin',
                        displayName: '管理者',
                        role: 'admin',
                        department: 'システム管理部'
                    };
                }
            } catch (dbError) {
                context.log.warn('Database query failed, using default user:', dbError.message);
                // データベースエラーの場合はデフォルトユーザーを返す
                user = {
                    id: 'default-user-id',
                    username: 'admin',
                    displayName: '管理者',
                    role: 'admin',
                    department: 'システム管理部'
                };
            }

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
