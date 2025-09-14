const { Pool } = require('pg');

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require"
});

async function fixNiinaRole() {
  const client = await pool.connect();
  try {
    console.log('データベースに接続しました');
    
    // niinaユーザーの現在の状態を確認
    console.log('niinaユーザーの現在の状態を確認中...');
    const currentUser = await client.query(`
      SELECT username, display_name, role, department, description 
      FROM users 
      WHERE username = 'niina'
    `);
    
    if (currentUser.rows.length > 0) {
      console.log('現在の状態:', currentUser.rows[0]);
    } else {
      console.log('niinaユーザーが見つかりません');
    }
    
    // niinaユーザーの権限を更新
    console.log('niinaユーザーの権限を更新中...');
    const updateResult = await client.query(`
      UPDATE users 
      SET role = 'admin', 
          department = 'システム管理部',
          description = '運用管理者'
      WHERE username = 'niina'
    `);
    
    console.log(`更新された行数: ${updateResult.rowCount}`);
    
    // 更新後の状態を確認
    console.log('更新後の状態を確認中...');
    const updatedUser = await client.query(`
      SELECT username, display_name, role, department, description, created_at
      FROM users 
      WHERE username = 'niina'
    `);
    
    if (updatedUser.rows.length > 0) {
      console.log('更新後の状態:', updatedUser.rows[0]);
      console.log('✅ niinaユーザーの権限更新完了！');
    } else {
      console.log('❌ niinaユーザーが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixNiinaRole();
