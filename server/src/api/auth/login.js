import { app } from '@azure/functions';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
// PostgreSQL接続プールの初期化（環境変数から設定）
let dbPool = null;
// データベース接続プールの初期化（db/index.jsと同じ設定に統一）
function initializeDatabase() {
    if (dbPool)
        return dbPool;
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING;
    if (!connectionString) {
        console.error('DATABASE_URLまたはPOSTGRES_CONNECTION_STRINGが設定されていません');
        return null;
    }
    try {
        dbPool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : { rejectUnauthorized: false },
            max: 5, // 接続プールサイズ
            idleTimeoutMillis: 30000, // アイドルタイムアウト
            connectionTimeoutMillis: 60000, // 接続タイムアウトを60秒
            query_timeout: 30000, // クエリタイムアウト
        });
        console.log('✅ データベース接続プールを初期化しました（login）');
        return dbPool;
    }
    catch (error) {
        console.error('❌ データベース接続プールの初期化に失敗:', error);
        return null;
    }
}
export async function loginHandler(request, context) {
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
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        }
        catch (parseError) {
            context.error('JSON parse error:', parseError);
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'bad_request',
                    message: 'リクエストボディの解析に失敗しました'
                })
            };
        }
        const { username, password } = parsedBody;
        context.log(`Login attempt for user: ${username}`);
        // バリデーション
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
                    message: 'ユーザー名またはパスワードが指定されていません'
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
        let result;
        try {
            result = await pool.query('SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1', [username]);
        }
        catch (queryError) {
            context.error('Database query error:', queryError);
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'database_query_error',
                    message: 'データベースクエリの実行に失敗しました'
                })
            };
        }
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
        if (!foundUser || !foundUser.password) {
            context.error('User data is invalid');
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'internal_server_error',
                    message: 'ユーザーデータが無効です'
                })
            };
        }
        context.log(`User found: ${foundUser.username}, role: ${foundUser.role}`);
        // パスワード検証
        let isPasswordValid;
        try {
            isPasswordValid = await bcrypt.compare(password, foundUser.password);
        }
        catch (bcryptError) {
            context.error('Password comparison error:', bcryptError);
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'internal_server_error',
                    message: 'パスワード検証中にエラーが発生しました'
                })
            };
        }
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
    }
    catch (error) {
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
                message: 'サーバー内部でエラーが発生しました'
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
