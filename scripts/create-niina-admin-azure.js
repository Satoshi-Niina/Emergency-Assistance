#!/usr/bin/env node

/**
 * Azure App Service環境でniinaユーザーを作成するスクリプト
 * 使用方法: node create-niina-admin-azure.js
 */

const { Pool } = require('pg');

// Azure環境変数から接続情報を取得
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createNiinaAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Azure PostgreSQLに接続しました');
    
    // UPSERTクエリでユーザーを作成/更新
    const upsertQuery = `
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
      ) 
      ON CONFLICT (username) 
      DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        display_name = EXCLUDED.display_name,
        department = EXCLUDED.department,
        updated_at = EXCLUDED.updated_at
      RETURNING username, role, display_name, department;
    `;
    
    console.log('👤 niinaユーザーを作成/更新中...');
    const result = await client.query(upsertQuery);
    
    console.log('✅ ユーザー処理完了:');
    console.table(result.rows);
    
    // 全システム管理者を確認
    const adminQuery = `
      SELECT username, role, display_name, department 
      FROM users 
      WHERE role = 'system_admin' 
      ORDER BY created_at;
    `;
    
    console.log('🔍 システム管理者一覧:');
    const adminResult = await client.query(adminQuery);
    console.table(adminResult.rows);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('🔌 データベース接続を終了しました');
  }
}

// メイン実行
if (require.main === module) {
  console.log('🚀 Azure: niinaシステム管理者作成スクリプト開始');
  console.log('📍 環境:', process.env.NODE_ENV || 'production');
  
  createNiinaAdmin().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { createNiinaAdmin };
