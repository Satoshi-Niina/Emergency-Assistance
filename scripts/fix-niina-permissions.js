#!/usr/bin/env node

/**
 * niinaユーザーの権限を強制的にsystem_adminに設定する緊急修正スクリプト
 * 使用方法: node fix-niina-permissions.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixNiinaPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 niinaユーザー権限強制修正スクリプト開始');
    console.log('🔗 データベース接続完了');
    
    // 1. 現在の状況確認
    console.log('\n📊 修正前の状況:');
    const beforeQuery = `
      SELECT 
        username,
        role,
        display_name,
        department,
        updated_at::timestamp(0) as updated_at
      FROM users 
      WHERE username = 'niina';
    `;
    
    const beforeResult = await client.query(beforeQuery);
    
    if (beforeResult.rows.length === 0) {
      console.log('❌ niinaユーザーが見つかりません');
      console.log('🔧 新規ユーザーを作成します...');
      
      // ユーザーが存在しない場合は作成
      await client.query(`
        INSERT INTO users (
          id,
          username,
          password,
          role,
          display_name,
          department,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          'niina',
          '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS',
          'system_admin',
          'Niina Administrator',
          'システム管理',
          NOW(),
          NOW()
        );
      `);
      
      console.log('✅ niinaユーザーを新規作成しました');
      
    } else {
      console.table(beforeResult.rows);
      
      // 2. 権限を強制的にsystem_adminに修正
      console.log('\n🔧 権限をsystem_adminに強制修正中...');
      
      const updateResult = await client.query(`
        UPDATE users 
        SET 
          role = 'system_admin',
          display_name = 'Niina Administrator',
          department = 'システム管理',
          updated_at = NOW()
        WHERE username = 'niina'
        RETURNING username, role, display_name, department;
      `);
      
      console.log('✅ 権限修正完了:');
      console.table(updateResult.rows);
    }
    
    // 3. 修正後の確認
    console.log('\n📊 修正後の確認:');
    const afterResult = await client.query(beforeQuery);
    console.table(afterResult.rows);
    
    // 4. システム管理者一覧を表示
    console.log('\n👑 現在のシステム管理者一覧:');
    const adminResult = await client.query(`
      SELECT 
        username, 
        display_name, 
        department,
        created_at::timestamp(0) as created_at
      FROM users 
      WHERE role = 'system_admin' 
      ORDER BY created_at;
    `);
    console.table(adminResult.rows);
    
    console.log('\n🎯 修正完了！');
    console.log('💡 フロントエンドで以下を実行してください:');
    console.log('   1. ログアウト');
    console.log('   2. ブラウザの再読み込み（Ctrl+F5またはCmd+R）');
    console.log('   3. niinaアカウントで再ログイン');
    console.log('   4. システム管理者メニューの確認');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('📍 詳細:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 データベース接続を終了しました');
  }
}

// メイン実行
if (require.main === module) {
  fixNiinaPermissions().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { fixNiinaPermissions };
