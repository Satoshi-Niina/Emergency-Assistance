#!/usr/bin/env node

/**
 * niinaユーザーの権限状況を確認し、必要に応じて修正するスクリプト
 */

const { Pool } = require('pg');

// Azure環境変数から接続情報を取得
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnoseNiinaUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 データベースに接続しました');
    
    // 1. niinaユーザーの現在の状況を確認
    console.log('\n📊 niinaユーザーの現在の状況:');
    const userQuery = `
      SELECT 
        id,
        username,
        role,
        display_name,
        department,
        created_at::timestamp(0) as created_at,
        updated_at::timestamp(0) as updated_at
      FROM users 
      WHERE username = 'niina';
    `;
    
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ niinaユーザーが見つかりません');
      return;
    }
    
    console.table(userResult.rows);
    
    const user = userResult.rows[0];
    
    // 2. 権限レベルの確認
    console.log('\n🔍 権限レベルチェック:');
    if (user.role === 'system_admin') {
      console.log('✅ データベース上では system_admin 権限が設定されています');
    } else {
      console.log(`❌ 権限レベルが間違っています: ${user.role} (期待値: system_admin)`);
      
      // 権限を修正
      console.log('🔧 権限をsystem_adminに修正中...');
      await client.query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE username = $2',
        ['system_admin', 'niina']
      );
      console.log('✅ 権限を修正しました');
    }
    
    // 3. 全システム管理者の一覧を表示
    console.log('\n👑 全システム管理者一覧:');
    const adminQuery = `
      SELECT 
        username, 
        role, 
        display_name, 
        department,
        created_at::timestamp(0) as created_at
      FROM users 
      WHERE role = 'system_admin' 
      ORDER BY created_at;
    `;
    
    const adminResult = await client.query(adminQuery);
    console.table(adminResult.rows);
    
    // 4. 権限別ユーザー数の統計
    console.log('\n📈 権限別ユーザー数統計:');
    const statsQuery = `
      SELECT 
        role,
        COUNT(*) as user_count
      FROM users 
      GROUP BY role 
      ORDER BY 
        CASE role 
          WHEN 'system_admin' THEN 1 
          WHEN 'operator' THEN 2 
          WHEN 'user' THEN 3 
          ELSE 4 
        END;
    `;
    
    const statsResult = await client.query(statsQuery);
    console.table(statsResult.rows);
    
    // 5. niinaユーザーの最終確認
    console.log('\n🎯 niinaユーザーの最終確認:');
    const finalCheck = await client.query(userQuery);
    console.table(finalCheck.rows);
    
    const finalUser = finalCheck.rows[0];
    if (finalUser.role === 'system_admin') {
      console.log('✅ niinaユーザーは正常にsystem_admin権限が設定されています');
      console.log('💡 フロントエンドでメニューが表示されない場合は、ブラウザを再読み込みしてください');
      console.log('💡 セッションをクリアするため、一度ログアウトしてから再ログインしてください');
    } else {
      console.log('❌ まだ権限の問題があります');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 データベース接続を終了しました');
  }
}

// メイン実行
if (require.main === module) {
  console.log('🚀 niinaユーザー権限診断スクリプト開始');
  console.log('📍 環境:', process.env.NODE_ENV || 'production');
  
  diagnoseNiinaUser().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { diagnoseNiinaUser };
