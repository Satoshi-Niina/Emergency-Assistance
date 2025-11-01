import { app } from '@azure/functions';
import { Pool } from 'pg';
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
        // 讖滓｢ｰ繧ｿ繧､繝嶺ｸ隕ｧ繧貞叙蠕・
        const result = await pool.query('SELECT id, name, description, created_at FROM machine_types ORDER BY name');
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
                message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
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
        // 讖滓｢ｰ荳隕ｧ繧貞叙蠕・
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
                message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
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
