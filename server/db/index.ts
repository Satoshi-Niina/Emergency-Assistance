import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// データベース接続設定
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // webappdbに接続（DBeaverで確認済み）
  return 'postgresql://postgres@localhost:5432/webappdb';
}

// 本番環境でのSSL設定
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
  prepare: false,
});

// Drizzle ORMインスタンス
export const db = drizzle(client, { schema });

// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: データベース接続を有効化");
console.log("🔍 DEBUG server/db/index.ts: 接続先 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@'));
console.log("🔍 DEBUG server/db/index.ts: 環境 =", {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME ? '[SET]' : '[NOT SET]',
  AZURE_ENVIRONMENT: process.env.AZURE_ENVIRONMENT ? '[SET]' : '[NOT SET]'
}); 