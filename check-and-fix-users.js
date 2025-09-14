const { Pool } = require('pg');

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require"
});

async function checkAndFixUsers() {
  const client = await pool.connect();
  try {
    console.log('🔍 データベースに接続しました');
    
    // 全ユーザーを確認
    console.log('📋 全ユーザー一覧:');
    const allUsers = await client.query(`
      SELECT username, display_name, role, department, description, created_at
      FROM users 
      ORDER BY username
    `);
    
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.display_name}) - ${user.role} - ${user.department}`);
    });
    
    // niinaユーザーが存在するかチェック
    const niinaUser = await client.query(`
      SELECT username, display_name, role, department, description 
      FROM users 
      WHERE username = 'niina'
    `);
    
    if (niinaUser.rows.length === 0) {
      console.log('❌ niinaユーザーが見つかりません。新規作成します...');
      
      // niinaユーザーを新規作成
      await client.query(`
        INSERT INTO users (username, password, display_name, role, department, description) 
        VALUES ('niina', 'G&896845', '新納 智志', 'admin', 'システム管理部', '運用管理者')
      `);
      
      console.log('✅ niinaユーザーを新規作成しました');
    } else {
      console.log('🔧 niinaユーザーが見つかりました。権限を更新します...');
      
      // niinaユーザーの権限を更新
      await client.query(`
        UPDATE users 
        SET role = 'admin', 
            department = 'システム管理部',
            description = '運用管理者'
        WHERE username = 'niina'
      `);
      
      console.log('✅ niinaユーザーの権限を更新しました');
    }
    
    // 最終確認
    console.log('📋 更新後のniinaユーザー:');
    const finalUser = await client.query(`
      SELECT username, display_name, role, department, description, created_at
      FROM users 
      WHERE username = 'niina'
    `);
    
    if (finalUser.rows.length > 0) {
      console.log('✅ 最終状態:', finalUser.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixUsers();
