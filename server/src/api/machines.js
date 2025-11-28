import { app } from '@azure/functions';
import { Pool } from 'pg';
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
        console.log('✅ データベース接続プールを初期化しました（machines）');
        return dbPool;
    }
    catch (error) {
        console.error('❌ データベース接続プールの初期化に失敗:', error);
        return null;
    }
}
export async function machineTypesHandler(request, context) {
    context.log('Machine types request received');
    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        // 機械タイプ一覧を取得
        let result;
        try {
            result = await pool.query('SELECT id, name, description, created_at FROM machine_types ORDER BY name');
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
        context.log(`Found ${result.rows.length} machine types`);
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                machineTypes: result.rows
            })
        };
    }
    catch (error) {
        context.error('Machine types fetch error:', error);
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
export async function machinesHandler(request, context) {
    context.log('Machines request received');
    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        // 機械一覧を取得
        let result;
        try {
            result = await pool.query(`
                SELECT
                    m.id,
                    m.name,
                    m.model,
                    m.serial_number,
                    m.location,
                    m.status,
                    m.created_at,
                    mt.name as machine_type_name
                FROM machines m
                LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
                ORDER BY m.name
            `);
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
        context.log(`Found ${result.rows.length} machines`);
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                machines: result.rows
            })
        };
    }
    catch (error) {
        context.error('Machines fetch error:', error);
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
app.http('machine-types', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'machines/machine-types',
    handler: machineTypesHandler
});
app.http('machines', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'machines/machines',
    handler: machinesHandler
});
