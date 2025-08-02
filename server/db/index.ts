import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// データベース接続設定 - DATABASE_URLのみを使用
function getDatabaseUrl(): string {
  // DATABASE_URLが設定されている場合は優先使用（DATABASE_URLのみ使用）
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // デフォルトの接続文字列
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// データベース接続
const client = postgres(getDatabaseUrl(), {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // 使用中: 環境判別
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORMインスタンス
export const db = drizzle(client, { schema });

// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'); // 使用中: データベース接続文字列
console.log("🔍 DEBUG server/db/index.ts: 接続文字列 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@')); // パスワードを隠して表示 