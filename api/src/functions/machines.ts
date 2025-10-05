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

export async function machineTypesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
        const result = await pool.query(
            'SELECT id, name, description, created_at FROM machine_types ORDER BY name'
        );

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

    } catch (error) {
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
                message: 'サーバーエラーが発生しました'
            })
        };
    }
}

export async function machinesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
        const result = await pool.query(`
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

    } catch (error) {
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
                message: 'サーバーエラーが発生しました'
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