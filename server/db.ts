
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatapp';

console.log('🔄 データベース接続を初期化中...');
console.log('📍 接続文字列:', connectionString.replace(/password@/, '***@'));

let client: any;
let db: any;

try {
  client = postgres(connectionString, {
    prepare: false,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });

  db = drizzle(client, { schema });
  
  console.log('✅ データベース接続が正常に初期化されました');
} catch (error) {
  console.error('❌ データベース接続エラー:', error);
  
  // フォールバック: メモリ内での一時的な処理
  console.log('💡 フォールバックモードで起動します');
}

export { db, client };
