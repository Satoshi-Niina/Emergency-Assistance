import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

export async function loginHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Login request received');

    // Handle CORS
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

    if (request.method !== 'POST') {
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
        const body = await request.text();
        const { username, password } = JSON.parse(body);

        context.log(`Login attempt for user: ${username}`);

        // 入力検証
        if (!username || !password) {
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'bad_request',
                    message: 'ユーザー名とパスワードが必要です'
                })
            };
        }

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

        // データベースからユーザー検索
        const result = await pool.query(
            'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
            [username]
        );

        if (result.rows.length === 0) {
            context.log('User not found');
            return {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'invalid_credentials',
                    message: 'ユーザー名またはパスワードが正しくありません'
                })
            };
        }

        const foundUser = result.rows[0];
        context.log(`User found: ${foundUser.username}, role: ${foundUser.role}`);

        // パスワード比較
        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        
        if (!isPasswordValid) {
            context.log('Password validation failed');
            return {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'invalid_credentials',
                    message: 'ユーザー名またはパスワードが正しくありません'
                })
            };
        }

        context.log(`Login successful for user: ${username}`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    role: foundUser.role,
                    displayName: foundUser.display_name,
                    display_name: foundUser.display_name,
                    department: foundUser.department
                },
                message: 'ログインに成功しました'
            })
        };

    } catch (error) {
        context.error('Login error:', error);
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

app.http('login', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: loginHandler
});