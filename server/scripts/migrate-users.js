#!/usr/bin/env node

/**
 * データベースマイグレーション実行スクリプト
 * ユーザーテーブルを作成し、テストユーザーを追加
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb';

async function runMigration() {
  console.log('🚀 データベースマイグレーション開始...');
  console.log('📊 データベースURL:', DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

  const sql = postgres(DATABASE_URL, {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1,
  });

  try {
    // マイグレーションファイルを読み込み
    const migrationPath = join(__dirname, '..', 'db', 'migrations', '0006_create_users_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 マイグレーションファイルを読み込み:', migrationPath);
    
    // SQLを実行
    await sql.unsafe(migrationSQL);
    
    console.log('✅ マイグレーション実行完了');
    
    // 作成されたユーザーを確認
    const users = await sql`SELECT username, display_name, role, department FROM users ORDER BY username`;
    console.log('👥 作成されたユーザー:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.display_name}) - ${user.role} - ${user.department}`);
    });
    
    console.log('\n🔐 テスト用ログイン情報:');
    console.log('  管理者: username=admin, password=password');
    console.log('  一般ユーザー: username=user, password=password');
    console.log('  テストユーザー: username=test, password=password');
    
  } catch (error) {
    console.error('❌ マイグレーション実行エラー:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// スクリプト実行
runMigration().catch(console.error);
