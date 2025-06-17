import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PostgreSQL接続の設定 - 暗号化とセキュリティ強化
const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 30,
  socket_timeout: 60,
  onnotice: () => {},
  onparameter: () => {},
  retry_delay: 1000,
  max_lifetime: 60 * 30,
  // SSL設定 - 本番環境では必須
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // 接続プールの最適化
  connection: {
    application_name: 'knowledge-base-app',
  },
  // デバッグ用（開発環境のみ）
  debug: process.env.NODE_ENV === 'development' ? false : false,
});

console.log('🔗 データベース接続を初期化中...');

export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// 接続テスト
sql`SELECT 1`.then(() => {
  console.log('✅ データベース接続成功');
}).catch((error) => {
  console.error('❌ データベース接続エラー:', error);
});