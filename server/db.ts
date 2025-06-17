
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatapp';

console.log('🔄 データベース接続を初期化中...');
console.log('📍 接続文字列:', connectionString.replace(/password@/, '***@'));

const client = postgres(connectionString, {
  prepare: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, { schema });

// 接続テスト
client`SELECT 1`.then(() => {
  console.log('✅ データベース接続が正常に初期化されました');
}).catch((error) => {
  console.error('❌ データベース接続エラー:', error);
});
