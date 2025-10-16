'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.db = void 0;
const { Pool } = require('pg');

let pool = null;

// データベース接続プールを初期化
function initializePool() {
  if (!pool) {
    // 環境変数はモジュールロード時ではなく初期化時に動的に参照する
    const connectionString =
      process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING;

    if (!connectionString) {
      // 明示的にバイパスが有効でない限り、モックを自動で返さない
      if (process.env.BYPASS_DB_FOR_LOGIN === 'true') {
        console.warn('⚠️ DATABASE_URL が設定されていません。BYPASS_DB_FOR_LOGIN=true のためモックデータベースを使用します。');
        return null;
      }
      throw new Error('DATABASE_URL が設定されていません。データベース接続を確認してください。');
    }

    // ローカル Postgres は通常 SSL をサポートしないため、
    // 本番 (production) の場合のみ SSL を有効にする
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const sslConfig = isLocalhost ? false : isProduction ? { require: true, rejectUnauthorized: false } : { rejectUnauthorized: false };

    const dbConfig = {
      connectionString,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    };

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
  execute: async function (query, params = []) {
    const pool = initializePool();

    if (!pool) {
      console.log('🔍 モックデータベースを使用:', query);
      // モックデータを返す
      if (query.includes('SELECT') && query.includes('users')) {
        return [
          {
            id: 'default-user-id',
            username: 'admin',
            display_name: '管理者',
            role: 'admin',
            department: 'システム管理部',
            description: 'システム管理者',
            created_at: new Date().toISOString(),
          },
        ];
      }
      return [];
    }

    try {
      console.log('🔍 データベースクエリ実行:', query);

      // タイムアウト付きでクエリを実行
      const queryPromise = pool.query(query, params);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 3000); // 3秒でタイムアウト
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      return result.rows;
    } catch (error) {
      console.error('❌ データベースクエリエラー:', error.message);

      // タイムアウトの場合はモックデータを返す
      if (
        error.message.includes('timeout') ||
        error.message.includes('Connection terminated')
      ) {
        console.log('⚠️ データベース接続タイムアウト、モックデータを返します');
        if (query.includes('SELECT') && query.includes('users')) {
          return [
            {
              id: 'mock-user-id',
              username: 'niina',
              display_name: '新納 智志',
              role: 'admin',
              department: 'システム管理部',
              description: 'システム管理者',
              created_at: new Date().toISOString(),
            },
          ];
        }
        return [];
      }

      throw error;
    }
  },

  // 接続プールを閉じる
  close: async function () {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('✅ データベース接続プールを閉じました');
    }
  },
};

// プロセス終了時に接続を閉じる（競合回避のため無効化）
// process.on('SIGINT', async () => {
//   await exports.db.close();
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   await exports.db.close();
//   process.exit(0);
// });
