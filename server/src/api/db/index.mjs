import pg from 'pg';
const { Pool } = pg;

// データベース接続設定
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }, // Azure PostgreSQL用
  max: 5, // 接続プールサイズを削減
  idleTimeoutMillis: 30000, // アイドルタイムアウト
  connectionTimeoutMillis: 60000, // 接続タイムアウトを60秒
  query_timeout: 30000, // クエリタイムアウト
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  // 接続失敗時のリトライ設定
  retryDelayMs: 1000,
  maxRetries: 3,
};

let pool = null;

// データベース接続プールを初期化
function initializePool() {
  if (!pool) {
    if (!dbConfig.connectionString) {
      console.warn(
        '⚠️ DATABASE_URL または POSTGRES_CONNECTION_STRING が設定されていません。モックデータベースを使用します。'
      );
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
export const db = {
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
