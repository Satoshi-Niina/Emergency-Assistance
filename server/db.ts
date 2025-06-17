
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './db/schema';

// データベース接続設定
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

console.log('🔗 データベース接続中...');

// PostgreSQL接続
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, { schema });

console.log('✅ データベース接続完了');
