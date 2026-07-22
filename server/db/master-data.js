/**
 * Database Gateway for Drizzle ORM with Dynamic Routing
 * app_resource_routingテーブルを参照して動的にmaster_dataスキーマにアクセス
 */

import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/webappdb');

// ルーティングキャッシュ
const routingCache = new Map();
const CACHE_TTL = 60000; // 1分

/**
 * app_resource_routingテーブルから物理テーブルパスを取得
 */
async function getTablePath(logicalResourceName, appId = 'emergency-client') {
    const cacheKey = `:`;
    const cached = routingCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.path;
    }
    
    try {
        const result = await client`
            SELECT physical_schema, physical_table 
            FROM public.app_resource_routing 
            WHERE app_id = `` 
              AND logical_resource_name = ``
              AND is_active = true
            LIMIT 1
        `;
        
        if (result.length > 0) {
            const fullPath = `.`;
            routingCache.set(cacheKey, { path: fullPath, timestamp: Date.now() });
            return fullPath;
        }
        
        console.warn(`No routing found for :, using public schema`);
        return `public.`;
        
    } catch (error) {
        console.error('Error fetching table routing:', error);
        return `public.`;
    }
}

/**
 * 動的クエリ実行ヘルパー
 */
async function queryTable(logicalResourceName, whereClause = '', params = []) {
    const tablePath = await getTablePath(logicalResourceName);
    const query = whereClause 
        ? `SELECT * FROM  WHERE `
        : `SELECT * FROM `;
    return client(query, params);
}

/**
 * ユーザーマスタ取得（動的ルーティング対応）
 */
export async function getUsers() {
    return queryTable('users');
}

/**
 * 事業所マスタ取得（動的ルーティング対応）
 */
export async function getManagementOffices() {
    return queryTable('managements_offices');
}

/**
 * 保守拠点マスタ取得（動的ルーティング対応）
 */
export async function getBases() {
    return queryTable('bases');
}

/**
 * 保守用車マスタ取得（動的ルーティング対応）
 */
export async function getVehicles() {
    return queryTable('vehicles');
}

/**
 * 機種マスタ取得（動的ルーティング対応）
 */
export async function getMachineTypes() {
    return queryTable('machine_types');
}

/**
 * 機械番号マスタ取得（動的ルーティング対応）
 */
export async function getMachines() {
    return queryTable('machines');
}

/**
 * 特定IDのレコード取得
 */
export async function getUserById(id) {
    const tablePath = await getTablePath('users');
    return client`SELECT * FROM `` WHERE id = ``;
}

export async function getMachineTypeById(id) {
    const tablePath = await getTablePath('machine_types');
    return client`SELECT * FROM `` WHERE id = ``;
}

/**
 * キャッシュクリア
 */
export function clearRoutingCache() {
    routingCache.clear();
    console.log('Routing cache cleared');
}

export { client, getTablePath, queryTable };
