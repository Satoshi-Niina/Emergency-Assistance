const { Pool } = require('pg');

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require"
});

async function setUserPasswords() {
  const client = await pool.connect();
  try {
    console.log('データベースに接続しました');
    
    // 既存のユーザーを削除
    console.log('既存のユーザーを削除中...');
    await client.query("DELETE FROM users WHERE username IN ('niina', 'takabeni1', 'takabeni2')");
    
    // 新しいユーザーを追加
    console.log('新しいユーザーを追加中...');
    await client.query(`
      INSERT INTO users (username, password, display_name, role, department, description) VALUES
        ('niina', 'G&896845', '新納 智志', 'admin', 'システム管理部', '運用管理者'),
        ('takabeni1', 'Takabeni&1', 'タカベニ1', 'admin', 'システム管理部', '運用管理者'),
        ('takabeni2', 'Takaben&2', 'タカベニ2', 'employee', '保守部', '一般ユーザー')
    `);
    
    // 確認
    console.log('ユーザーを確認中...');
    const result = await client.query(`
      SELECT username, password, display_name, role 
      FROM users 
      WHERE username IN ('niina', 'takabeni1', 'takabeni2')
    `);
    
    console.log('設定されたユーザー:');
    result.rows.forEach(user => {
      console.log(`- ${user.username}: ${user.password} (${user.display_name}, ${user.role})`);
    });
    
    console.log('✅ パスワード設定完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setUserPasswords();
