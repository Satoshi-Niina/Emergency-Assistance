import { Pool } from 'pg';
import { config } from 'dotenv';

// 環境変数を読み込み
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    require: true, 
    rejectUnauthorized: false 
  },
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000, // アイドルタイムアウト
  connectionTimeoutMillis: 2000, // 接続タイムアウト
});

// 接続エラーハンドリング
pool.on('error', err => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 健康チェック関数
export async function health(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// プールをエクスポート
export { pool };

// クライアント取得のヘルパー関数
export async function getClient() {
  return await pool.connect();
}

// クエリ実行のヘルパー関数
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
