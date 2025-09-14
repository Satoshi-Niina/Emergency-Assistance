import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// データベース接続設定 - DATABASE_URLのみを使用
function getDatabaseUrl(): string {
  // DATABASE_URLが設定されている場合は優先使用（DATABASE_URLのみ使用）
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // .env未設定時は空文字を返す（安全対策）
  return '';
}

// 本番環境でのSSL設定を改善
function getSSLConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isAzure = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;
  
  if (isProduction || isAzure) {
    return { rejectUnauthorized: false };
  }
  
  return false;
}

// データベース接続
const client = postgres(getDatabaseUrl(), {
  ssl: getSSLConfig(),
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Azure PostgreSQL対応
});

// Drizzle ORMインスタンス
export const db = drizzle(client, { schema });

// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log("🔍 DEBUG server/db/index.ts: 接続文字列 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@')); // パスワードを隠して表示
console.log("🔍 DEBUG server/db/index.ts: SSL設定 =", getSSLConfig());
console.log("🔍 DEBUG server/db/index.ts: 環境 =", {
  NODE_ENV: process.env.NODE_ENV,
  WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME ? '[SET]' : '[NOT SET]',
  AZURE_ENVIRONMENT: process.env.AZURE_ENVIRONMENT ? '[SET]' : '[NOT SET]'
}); 