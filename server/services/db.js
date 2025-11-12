"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.health = health;
exports.getClient = getClient;
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = require("dotenv");
// 環境変数を読み込み
(0, dotenv_1.config)();
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
// PostgreSQL接続プールを作成
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    max: 20, // 最大接続数
    idleTimeoutMillis: 30000, // アイドルタイムアウト
    connectionTimeoutMillis: 2000, // 接続タイムアウト
});
exports.pool = pool;
// 接続エラーハンドリング
pool.on('error', err => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// 健康チェック関数
async function health() {
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            return true;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
// クライアント取得のヘルパー関数
async function getClient() {
    return await pool.connect();
}
// クエリ実行のヘルパー関数
async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
}
