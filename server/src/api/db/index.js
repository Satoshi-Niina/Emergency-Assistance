"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const { Pool } = require('pg');

// データベース接続設定
const dbConfig = {
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }, // Azure PostgreSQL用
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // タイムアウトを10秒に延長
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
};

let pool = null;

// データベース接続プールを初期化
function initializePool() {
    if (!pool) {
        if (!dbConfig.connectionString) {
            console.warn('⚠️ DATABASE_URL または POSTGRES_CONNECTION_STRING が設定されていません。モックデータベースを使用します。');
            return null;
        }
        
        try {
            pool = new Pool(dbConfig);
            console.log('✅ データベース接続プールを初期化しました');
            
            // 接続テスト
            pool.query('SELECT NOW()', (err, result) => {
                if (err) {
                    console.error('❌ データベース接続テストに失敗:', err.message);
                } else {
                    console.log('✅ データベース接続テスト成功:', result.rows[0]);
                }
            });
        } catch (error) {
            console.error('❌ データベース接続プールの初期化に失敗:', error.message);
            return null;
        }
    }
    return pool;
}

// データベース実行関数
exports.db = {
    execute: async function(query, params = []) {
        const pool = initializePool();
        
        if (!pool) {
            console.log('🔍 モックデータベースを使用:', query);
            // モックデータを返す
            if (query.includes('SELECT') && query.includes('users')) {
                return [{
                    id: 'default-user-id',
                    username: 'admin',
                    display_name: '管理者',
                    role: 'admin',
                    department: 'システム管理部',
                    description: 'システム管理者',
                    created_at: new Date().toISOString()
                }];
            }
            return [];
        }
        
        try {
            console.log('🔍 データベースクエリ実行:', query);
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ データベースクエリエラー:', error.message);
            throw error;
        }
    },
    
    // 接続プールを閉じる
    close: async function() {
        if (pool) {
            await pool.end();
            pool = null;
            console.log('✅ データベース接続プールを閉じました');
        }
    }
};

// プロセス終了時に接続を閉じる
process.on('SIGINT', async () => {
    await exports.db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await exports.db.close();
    process.exit(0);
});
