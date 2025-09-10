#!/usr/bin/env node

/**
 * Azure本番環境でniinaユーザー権限問題を修正するスクリプト
 * システム管理者権限の設定とパスワード確認
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

console.log('🚀 Azure環境でniinaユーザー修正スクリプト開始');
console.log('===========================================');

// 環境変数の確認
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  console.log('🔧 .envファイルまたはAzure App Serviceの環境変数を確認してください');
  process.exit(1);
}

console.log('✅ DATABASE_URL確認完了');

// データベース接続
async function createDbClient() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000
  });
  
  await client.connect();
  console.log('✅ データベース接続成功');
  return client;
}

// niinaユーザー権限修正
async function fixNiinaUser() {
  const client = await createDbClient();
  
  try {
    console.log('\n🔍 現在のniinaユーザー情報を確認中...');
    
    // 1. niinaユーザーの現在の状態確認
    const userResult = await client.query(
      'SELECT id, username, role, display_name, department, password FROM users WHERE username = $1',
      ['niina']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ niinaユーザーが存在しません');
      
      // niinaユーザーを作成
      console.log('🔧 niinaユーザーを作成中...');
      const hashedPassword = await bcrypt.hash('0077', 10);
      
      await client.query(`
        INSERT INTO users (
          id, username, password, role, display_name, department, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'niina', $1, 'system_admin', 'Niina Administrator', 'システム管理部', NOW(), NOW()
        )
      `, [hashedPassword]);
      
      console.log('✅ niinaユーザーを作成しました');
    } else {
      const user = userResult.rows[0];
      console.log('📊 現在のniinaユーザー情報:');
      console.table([{
        username: user.username,
        role: user.role,
        display_name: user.display_name,
        department: user.department,
        password_exists: !!user.password,
        password_length: user.password ? user.password.length : 0,
        is_bcrypt: user.password ? (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) : false
      }]);
      
      // 権限がsystem_adminでない場合は修正
      if (user.role !== 'system_admin') {
        console.log('🔧 権限をsystem_adminに修正中...');
        await client.query(`
          UPDATE users 
          SET role = 'system_admin', 
              display_name = 'Niina Administrator',
              department = 'システム管理部',
              updated_at = NOW()
          WHERE username = 'niina'
        `);
        console.log('✅ 権限を修正しました');
      } else {
        console.log('✅ 権限は既にsystem_adminに設定済み');
      }
      
      // パスワードがbcryptハッシュでない場合は再設定
      const isBcryptHash = user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'));
      if (!isBcryptHash) {
        console.log('🔧 パスワードをbcryptハッシュに修正中...');
        const hashedPassword = await bcrypt.hash('0077', 10);
        await client.query(`
          UPDATE users 
          SET password = $1, updated_at = NOW()
          WHERE username = 'niina'
        `, [hashedPassword]);
        console.log('✅ パスワードを修正しました');
      } else {
        console.log('✅ パスワードは既にbcryptハッシュ形式');
      }
    }
    
    // 2. 修正後の確認
    console.log('\n📊 修正後のniinaユーザー確認:');
    const finalResult = await client.query(
      'SELECT username, role, display_name, department, created_at FROM users WHERE username = $1',
      ['niina']
    );
    console.table(finalResult.rows);
    
    // 3. 全システム管理者の一覧
    console.log('\n👑 全システム管理者一覧:');
    const adminResult = await client.query(
      'SELECT username, role, display_name, department FROM users WHERE role = $1 ORDER BY username',
      ['system_admin']
    );
    console.table(adminResult.rows);
    
    // 4. パスワードテスト
    console.log('\n🔐 パスワードテスト実行中...');
    const testResult = await client.query(
      'SELECT password FROM users WHERE username = $1',
      ['niina']
    );
    
    if (testResult.rows.length > 0) {
      const isValidPassword = await bcrypt.compare('0077', testResult.rows[0].password);
      console.log('🔐 パスワードテスト結果:', isValidPassword ? '✅ 成功' : '❌ 失敗');
    }
    
    console.log('\n🎉 niinaユーザー修正完了！');
    console.log('💡 フロントエンドでログアウト→再ログインして権限を確認してください');
    
  } catch (error) {
    console.error('❌ niinaユーザー修正エラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
if (require.main === module) {
  fixNiinaUser().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { fixNiinaUser };
