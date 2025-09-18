const { db } = require('../db/index.js');
const { users } = require('../../../db/schema.js');

module.exports = async function (context, req) {
    try {
        context.log('HTTP trigger function processed a request.');

        // メソッドやパス情報の取得
        const method = req.method;
        const url = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`) : null;
        const pathSegments = url ? url.pathname.split('/').filter(segment => segment) : [];

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

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://witty-river-012f39e00.1.azurestaticapps.net',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
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
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://witty-river-012f39e00.1.azurestaticapps.net',
                'Access-Control-Allow-Credentials': 'true'
            },
            body: JSON.stringify({
                success: false,
                error: 'ユーザー一覧の取得に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
