/**
 * 管理者ユーザーを作成するスクリプト
 * 実行: node server/scripts/create-admin-user.mjs
 */

import bcrypt from 'bcryptjs';
import { dbQuery, initializeDatabase } from '../src/infra/db.mjs';

const DEFAULT_PASSWORD = 'admin123';

async function createAdminUser() {
  try {
    // データベース接続を初期化
    initializeDatabase();
    
    console.log('🔍 既存ユーザーの確認...');
    
    // 既存ユーザーを確認
    const existingUsers = await dbQuery('SELECT username, role FROM users');
    console.log(`📊 既存ユーザー数: ${existingUsers.rows.length}`);
    
    if (existingUsers.rows.length > 0) {
      console.log('📋 既存ユーザー一覧:');
      existingUsers.rows.forEach(user => {
        console.log(`  - ${user.username} (${user.role})`);
      });
    }
    
    // adminユーザーの存在確認
    const adminExists = existingUsers.rows.some(u => u.username === 'admin');
    
    if (adminExists) {
      console.log('✅ adminユーザーは既に存在します');
      console.log('\n📝 ログイン情報:');
      console.log('  ユーザー名: admin');
      console.log('  パスワード: (既存のパスワード)');
      console.log('\nパスワードをリセットする場合は、以下を実行してください:');
      console.log('  npm run reset-password');
      return;
    }
    
    console.log('🔐 新しい管理者ユーザーを作成します...');
    console.log('  ユーザー名: admin');
    console.log(`  パスワード: ${DEFAULT_PASSWORD}`);
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    // ユーザーを作成
    await dbQuery(`
      INSERT INTO users (username, password, display_name, role, department)
      VALUES ($1, $2, $3, $4, $5)
    `, ['admin', hashedPassword, '管理者', 'admin', '管理部門']);
    
    console.log('✅ 管理者ユーザーを作成しました！');
    console.log('\n📝 ログイン情報:');
    console.log('  ユーザー名: admin');
    console.log(`  パスワード: ${DEFAULT_PASSWORD}`);
    console.log('\n⚠️ セキュリティのため、初回ログイン後にパスワードを変更してください');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
