import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';


// データベース接続設定 - DATABASE_URLのみを使用
function getDatabaseUrl(): string {
  // ?sslmode=require は環境変数側で付与する前提
  return process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// 本番はTLS緩和 (rejectUnauthorized: false)
const isProd = process.env.NODE_ENV === 'production';
const client = postgres(getDatabaseUrl(), {
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORMインスタンス
export const db = drizzle(client, { schema });

// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'); // 使用中: データベース接続文字列
console.log("🔍 DEBUG server/db/index.ts: 接続文字列 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@')); // パスワードを隠して表示 