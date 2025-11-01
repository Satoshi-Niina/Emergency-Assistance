import { app } from '@azure/functions';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
// PostgreSQL謗･邯壹・繝ｼ繝ｫ・育腸蠅・､画焚縺九ｉ險ｭ螳夲ｼ・
let dbPool = null;
// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹・蛻晄悄蛹・
function initializeDatabase() {
    if (dbPool)
        return dbPool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL迺ｰ蠅・､画焚縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
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
        const { username, password } = JSON.parse(body);
        context.log(`Login attempt for user: ${username}`);
        // 蜈･蜉帶､懆ｨｼ
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
                    message: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・
                })
            };
        }
        // 繝・・繧ｿ繝吶・繧ｹ謗･邯・
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
                    message: '繝・・繧ｿ繝吶・繧ｹ謗･邯壹′蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ'
                })
            };
        }
        // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ讀懃ｴ｢
        const result = await pool.query('SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1', [username]);
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
                    message: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ'
                })
            };
        }
        const foundUser = result.rows[0];
        context.log(`User found: ${foundUser.username}, role: ${foundUser.role}`);
        // 繝代せ繝ｯ繝ｼ繝画ｯ碑ｼ・
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
                    message: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ'
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
                message: '繝ｭ繧ｰ繧､繝ｳ縺ｫ謌仙粥縺励∪縺励◆'
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
                message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
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
