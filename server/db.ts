
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
console.log('📍 接続先:', connectionString.replace(/password@/, '***@'));

// PostgreSQL接続設定
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  onnotice: () => {}, // 接続通知を無効化
  prepare: false // プリペアドステートメントを無効化
});

export const db = drizzle(client, { schema });

// 接続テスト
(async () => {
  try {
    console.log('🔍 データベース接続テスト実行中...');
    await client`SELECT 1 as test`;
    console.log('✅ データベース接続テスト成功');
  } catch (error) {
    console.error('❌ データベース接続テストエラー:', error);
  }
})();

console.log('✅ データベース接続設定完了');
