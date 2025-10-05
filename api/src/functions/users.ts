import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';

// PostgreSQL接続プール（環境変数から設定）
let dbPool: Pool | null = null;

// データベース接続の初期化
function initializeDatabase() {
    if (dbPool) return dbPool;
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL環境変数が設定されていません');
        return null;
    }
    
    dbPool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false }
            : { rejectUnauthorized: false }
    });
    
    return dbPool;
}

export async function usersHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Users request received');

    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }

    if (request.method !== 'GET') {
        return {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // データベース接続
        const pool = initializeDatabase();
        if (!pool) {
            context.error('Database connection failed');
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'database_unavailable',
                    message: 'データベース接続が利用できません'
                })
            };
        }

        // ユーザー一覧を取得
        const result = await pool.query(
            'SELECT id, username, role, display_name, department, created_at FROM users ORDER BY username'
        );

        context.log(`Found ${result.rows.length} users`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                users: result.rows
            })
        };

    } catch (error) {
        context.error('Users fetch error:', error);
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: false,
                error: 'internal_server_error',
                message: 'サーバーエラーが発生しました'
            })
        };
    }
}

app.http('users', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users',
    handler: usersHandler
});