#!/usr/bin/env node

/**
 * Azure環境でniinaユーザー修正（テーブル構造対応版）
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

console.log('🚀 niinaユーザー修正（テーブル構造対応版）');
console.log('===============================================');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

console.log('✅ DATABASE_URL確認完了');

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

async function fixNiinaUserAdvanced() {
  const client = await createDbClient();
  
  try {
    // 1. テーブル構造確認
    console.log('\n🔍 usersテーブル構造確認...');
    const tableInfoResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 usersテーブルの構造:');
    console.table(tableInfoResult.rows);
    
    // 2. 現在のniinaユーザー確認
    console.log('\n🔍 現在のniinaユーザー情報確認...');
    const userResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['niina']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ niinaユーザーが存在しません');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('📊 現在のniinaユーザー情報:');
    console.table([{
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
      department: user.department,
      password_length: user.password ? user.password.length : 0,
      is_bcrypt: user.password ? (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) : false,
      created_at: user.created_at
    }]);
    
    // 3. 利用可能なカラムに基づいてUPDATE文を構築
    const columns = tableInfoResult.rows.map(row => row.column_name);
    
    let updateFields = [];
    let updateValues = [];
    let paramIndex = 2; // $1はWHERE句のusernameで使用
    
    // roleを修正
    if (user.role !== 'system_admin') {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push('system_admin');
      paramIndex++;
      console.log('🔧 role: admin → system_admin に修正');
    }
    
    // display_nameを修正
    if (user.display_name !== 'Niina Administrator') {
      updateFields.push(`display_name = $${paramIndex}`);
      updateValues.push('Niina Administrator');
      paramIndex++;
      console.log('🔧 display_name: Niina Administrator に修正');
    }
    
    // departmentを修正
    if (user.department !== 'システム管理部') {
      updateFields.push(`department = $${paramIndex}`);
      updateValues.push('システム管理部');
      paramIndex++;
      console.log('🔧 department: システム管理部 に修正');
    }
    
    // updated_atカラムが存在する場合は更新
    if (columns.includes('updated_at')) {
      updateFields.push(`updated_at = NOW()`);
      console.log('🔧 updated_at: NOW() で更新');
    }
    
    // パスワードをbcryptハッシュに修正（'0077'に設定）
    const isBcryptHash = user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'));
    if (!isBcryptHash) {
      console.log('🔧 パスワードをbcryptハッシュ化中... (0077)');
      const hashedPassword = await bcrypt.hash('0077', 10);
      updateFields.push(`password = $${paramIndex}`);
      updateValues.push(hashedPassword);
      paramIndex++;
      console.log('🔧 password: bcryptハッシュに修正');
    }
    
    // UPDATE実行
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE username = $1
        RETURNING *;
      `;
      
      console.log('\n🔧 UPDATE文:', updateQuery);
      console.log('🔧 パラメータ:', ['niina', ...updateValues]);
      
      const updateResult = await client.query(updateQuery, ['niina', ...updateValues]);
      console.log('✅ ユーザー情報更新完了');
      
      // 4. 更新後確認
      console.log('\n📊 更新後のniinaユーザー情報:');
      console.table([{
        username: updateResult.rows[0].username,
        role: updateResult.rows[0].role,
        display_name: updateResult.rows[0].display_name,
        department: updateResult.rows[0].department
      }]);
    } else {
      console.log('✅ 修正の必要なし - すべて正しく設定済み');
    }
    
    // 5. パスワードテスト
    console.log('\n🔐 パスワードテスト (0077)...');
    const finalUserResult = await client.query(
      'SELECT password FROM users WHERE username = $1',
      ['niina']
    );
    
    if (finalUserResult.rows.length > 0) {
      const isValidPassword = await bcrypt.compare('0077', finalUserResult.rows[0].password);
      console.log('🔐 パスワードテスト結果:', isValidPassword ? '✅ 成功 (0077で認証可能)' : '❌ 失敗');
    }
    
    // 6. 全システム管理者一覧
    console.log('\n👑 全システム管理者一覧:');
    const adminResult = await client.query(
      'SELECT username, role, display_name, department FROM users WHERE role = $1 ORDER BY username',
      ['system_admin']
    );
    console.table(adminResult.rows);
    
    console.log('\n🎉 niinaユーザー修正完了！');
    console.log('💡 ログイン情報:');
    console.log('   Username: niina');
    console.log('   Password: 0077');
    console.log('   Role: system_admin');
    console.log('💡 フロントエンドでログアウト→再ログインしてください');
    
  } catch (error) {
    console.error('❌ niinaユーザー修正エラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
if (require.main === module) {
  fixNiinaUserAdvanced().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { fixNiinaUserAdvanced };
