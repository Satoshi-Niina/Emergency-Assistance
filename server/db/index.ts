import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// データベース接続設定 - DATABASE_URLのみを使用
function getDatabaseUrl(): string {
  // DATABASE_URLが設定されている場合は優先使用（DATABASE_URLのみ使用）
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // デフォルトの接続文字列
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// SSLオプションの設定
function getSSLOptions() {
  const url = getDatabaseUrl();
  const isAzure = url.includes('azure.com') || url.includes('sslmode=require');
  
  if (isAzure) {
    return { 
      rejectUnauthorized: false,
      ca: false,
      key: false,
      cert: false
    };
  }
  
  return false;
}

// データベース接続
const dbUrl = getDatabaseUrl();

// postgres-js specific SSL configuration for Azure
const connectionOptions: any = {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
};

// Azure環境の場合はSSL必須
if (dbUrl.includes('azure.com') || dbUrl.includes('sslmode=require')) {
  connectionOptions.ssl = true;
  console.log('🔍 DEBUG server/db/index.ts: Azure環境 - SSL有効');
} else {
  connectionOptions.ssl = false;
  console.log('🔍 DEBUG server/db/index.ts: ローカル環境 - SSL無効');
}

console.log('🔍 DEBUG server/db/index.ts: 接続オプション =', connectionOptions);

const client = postgres(dbUrl, connectionOptions);

// Drizzle ORMインスタンス
export const db = drizzle(client, { schema });

// デバッグ用ログ
console.log("🔍 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'); // 使用中: データベース接続文字列
console.log("🔍 DEBUG server/db/index.ts: 接続文字列 =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@')); // パスワードを隠して表示 