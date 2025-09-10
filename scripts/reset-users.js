const { Pool } = require('pg');
const bcrypt = require('bcrypt');

/**
 * データベースユーザーリセットスクリプト
 * 指定されたユーザーでデータベースを初期化
 */

async function resetUsers() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 データベースに接続中...');
    
    // 既存のユーザーを全削除
    console.log('🗑️ 既存ユーザーを削除中...');
    await pool.query('DELETE FROM users');
    
    // パスワードをハッシュ化
    console.log('🔐 パスワードをハッシュ化中...');
    const niinaPassword = await bcrypt.hash('G&896845', 10);
    const takabeni1Password = await bcrypt.hash('takabeni&1', 10);
    const takabeni2Password = await bcrypt.hash('takabeni&2', 10);

    // 新しいユーザーを挿入
    console.log('👥 新しいユーザーを作成中...');
    
    const users = [
      {
        username: 'niina',
        password: niinaPassword,
        role: 'system_admin',
        display_name: '新名 聡',
        department: 'システム管理'
      },
      {
        username: 'takabeni1',
        password: takabeni1Password,
        role: 'operations_admin',
        display_name: '高橋 運用',
        department: '運用管理'
      },
      {
        username: 'takabeni2',
        password: takabeni2Password,
        role: 'general_user',
        display_name: '高橋 一般',
        department: '一般利用'
      }
    ];

    for (const user of users) {
      const result = await pool.query(`
        INSERT INTO users (id, username, password, role, display_name, department, created_at)
        VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (username) 
        DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          display_name = EXCLUDED.display_name,
          department = EXCLUDED.department
        RETURNING id, username, role
      `, [
        user.username,
        user.password,
        user.role,
        user.display_name,
        user.department
      ]);
      
      console.log(`✅ ユーザー作成完了: ${result.rows[0].username} (${result.rows[0].role})`);
    }

    console.log('🎉 ユーザーリセット完了');
    
    // 作成されたユーザーを確認
    const allUsers = await pool.query('SELECT id, username, role, display_name, department, created_at FROM users ORDER BY username');
    console.log('\n📋 作成済みユーザー一覧:');
    console.table(allUsers.rows);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetUsers();
