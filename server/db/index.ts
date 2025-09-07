import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// データベース接続設定
function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// SSL設定: PGSSLMODE=disable 以外は SSL有効
function getSSLConfig() {
  if (process.env.PGSSLMODE === 'disable') {
    return undefined;
  }
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTH !== 'false' // デフォルトtrue
  };
}

// 遅延生成のクライアント
let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getClient(): postgres.Sql {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      ssl: getSSLConfig(),
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    console.log("🔌 DB client initialized with SSL:", getSSLConfig() ? 'enabled' : 'disabled');
  }
  return client;
}

export function getDB() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

// 下位互換のためのエクスポート
export const db = getDB();

// DB接続ping（リトライ機能付き）
export async function ping(maxRetries = 3): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await getClient()`SELECT 1 as test`;
      console.log("✅ DB ping successful");
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`❌ DB ping failed (attempt ${i + 1}/${maxRetries}):`, lastError.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
      }
    }
  }
  
  console.error("❌ DB ping failed after", maxRetries, "attempts");
  return false;
}

// デバッグ用ログ
console.log("🔍 DB config:", {
  url: getDatabaseUrl().replace(/\/\/.*@/, '//***:***@'),
  ssl: getSSLConfig() ? 'enabled' : 'disabled'
});