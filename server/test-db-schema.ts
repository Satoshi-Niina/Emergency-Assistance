import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './db/schema.js';
import { eq, sql } from 'drizzle-orm';

console.log('🔍 データベーススキーマテスト開始');

async function testDatabaseSchema() {
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

    // 基本的な接続テスト
    console.log('🔍 基本的な接続テスト実行中...');
    const result = await db.execute(sql`SELECT NOW() as db_time`);
    console.log('✅ 基本的な接続テスト成功:', result[0].db_time);

    // スキーマ定義のテスト
    console.log('🔍 スキーマ定義テスト実行中...');
    console.log('📝 usersテーブル定義:', users);
    
    // テーブルアクセステスト
    console.log('🔍 テーブルアクセステスト実行中...');
    const userResult = await db.select().from(users).where(eq(users.username, 'niina')).limit(1);
    
    if (userResult.length > 0) {
      console.log('✅ テーブルアクセステスト成功:');
      console.log('  ユーザーID:', userResult[0].id);
      console.log('  ユーザー名:', userResult[0].username);
      console.log('  表示名:', userResult[0].displayName);
      console.log('  ロール:', userResult[0].role);
    } else {
      console.log('❌ ユーザーが見つかりません');
    }

    await client.end();
    console.log('✅ データベース接続終了成功');

  } catch (error) {
    console.error('❌ データベーススキーマテスト失敗:', error);
    console.error('❌ エラー詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

testDatabaseSchema();
