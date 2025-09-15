const { app } = require('@azure/functions');
const { db } = require('../../server/db/index.js');
const { users } = require('../../server/db/schema.js');

app.http('users', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'users',
    handler: async (request, context) => {
        try {
            context.log('HTTP trigger function processed a request.');

            const method = request.method;
            const url = new URL(request.url);
            const pathSegments = url.pathname.split('/').filter(segment => segment);

            // 生のSQLクエリで直接データを取得
            const allUsers = await db.execute(`
                SELECT id, username, display_name, role, department, description, created_at
                FROM users
                ORDER BY created_at DESC
            `);

            context.log('Users query result:', {
                count: allUsers.length,
                users: allUsers.map(u => ({ id: u.id, username: u.username, role: u.role }))
            });

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: JSON.stringify({
                    success: true,
                    data: allUsers,
                    total: allUsers.length,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in users function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ユーザー一覧の取得に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
