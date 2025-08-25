import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

console.log('🔍 データベース接続テスト開始');
console.log('📝 環境変数確認:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]');

async function testDatabaseConnection() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URLが設定されていません');
      return;
    }

    console.log('🔗 データベース接続試行中...');
    const client = postgres(process.env.DATABASE_URL, {
      ssl: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log('✅ データベースクライアント作成成功');

    const db = drizzle(client);
    console.log('✅ Drizzle ORMインスタンス作成成功');

    console.log('🔍 データベース接続テスト実行中...');
    const result = await db.execute(sql`SELECT NOW() as db_time, version() as db_version`);
    
    console.log('✅ データベース接続テスト成功:');
    console.log('  データベース時刻:', result[0].db_time);
    console.log('  データベースバージョン:', result[0].db_version);

    await client.end();
    console.log('✅ データベース接続終了成功');

  } catch (error) {
    console.error('❌ データベース接続テスト失敗:', error);
    console.error('❌ エラー詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

testDatabaseConnection();
