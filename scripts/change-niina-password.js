#!/usr/bin/env node

/**
 * niinaユーザーのパスワードを0077に強制変更
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

console.log('🔐 niinaユーザー パスワード強制変更 → 0077');
console.log('==========================================');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

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

async function changeNiinaPassword() {
  const client = await createDbClient();
  
  try {
    // 1. 現在のパスワードテスト
    console.log('\n🔍 現在のパスワードテスト...');
    const userResult = await client.query('SELECT password FROM users WHERE username = $1', ['niina']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ niinaユーザーが存在しません');
      return;
    }
    
    const currentPassword = userResult.rows[0].password;
    
    // 既知のパスワードでテスト
    const testPasswords = ['0077', 'G&896845'];
    let workingPassword = null;
    
    for (const testPwd of testPasswords) {
      const isMatch = await bcrypt.compare(testPwd, currentPassword);
      console.log(`🔐 パスワード "${testPwd}" テスト: ${isMatch ? '✅ 成功' : '❌ 失敗'}`);
      if (isMatch) {
        workingPassword = testPwd;
        break;
      }
    }
    
    // 2. 新しいパスワード（0077）のハッシュを生成
    console.log('\n🔧 新しいパスワード (0077) のハッシュを生成中...');
    const newPasswordHash = await bcrypt.hash('0077', 10);
    console.log('✅ ハッシュ生成完了');
    
    // 3. パスワードを更新
    console.log('🔧 データベースのパスワードを更新中...');
    await client.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [newPasswordHash, 'niina']
    );
    console.log('✅ パスワード更新完了');
    
    // 4. 新しいパスワードでテスト
    console.log('\n🔐 新しいパスワード (0077) でテスト...');
    const updatedUserResult = await client.query('SELECT password FROM users WHERE username = $1', ['niina']);
    const updatedPassword = updatedUserResult.rows[0].password;
    
    const isNewPasswordWorking = await bcrypt.compare('0077', updatedPassword);
    console.log(`🔐 新しいパスワードテスト: ${isNewPasswordWorking ? '✅ 成功' : '❌ 失敗'}`);
    
    // 5. ユーザー情報確認
    console.log('\n📊 最終確認 - niinaユーザー情報:');
    const finalResult = await client.query(
      'SELECT username, role, display_name, department FROM users WHERE username = $1',
      ['niina']
    );
    console.table(finalResult.rows);
    
    console.log('\n🎉 パスワード変更完了！');
    console.log('💡 ログイン情報:');
    console.log('   Username: niina');
    console.log('   Password: 0077');
    console.log('   Role: system_admin');
    console.log('\n💡 フロントエンドで以下を実行してください:');
    console.log('   1. 現在ログインしている場合はログアウト');
    console.log('   2. ブラウザのキャッシュクリア (Ctrl+Shift+R)');
    console.log('   3. niina / 0077 でログイン');
    console.log('   4. system_admin権限でアクセスできることを確認');
    
  } catch (error) {
    console.error('❌ パスワード変更エラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
if (require.main === module) {
  changeNiinaPassword().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { changeNiinaPassword };
