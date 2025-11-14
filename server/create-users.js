const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/webappdb_dev',
    ssl: false
});

async function createUsersTable() {
    try {
        console.log('Creating users table...');

        // ユーザーテーブル作成
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          display_name TEXT NOT NULL,
          role TEXT DEFAULT 'employee' NOT NULL,
          department TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

        console.log('Table created. Adding users...');

        // 管理者ユーザー作成（パスワード: admin123）
        const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
        await pool.query(`
      INSERT INTO users (username, password, display_name, role, department)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING;
    `, ['admin', hashedPasswordAdmin, 'Administrator', 'admin', 'System']);

        // niinaユーザー作成（既存のパスワードを使用）
        const hashedPasswordNiina = await bcrypt.hash('G&896845', 10);
        await pool.query(`
      INSERT INTO users (username, password, display_name, role, department)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING;
    `, ['niina', hashedPasswordNiina, 'Satoshi Niina', 'admin', 'IT']);

        console.log('✅ Users table created and initial users added');

        // 確認
        const result = await pool.query('SELECT username, role, display_name FROM users ORDER BY id');
        console.log('\nUsers in database:');
        result.rows.forEach(user => console.log(`- ${user.username} (${user.role}): ${user.display_name}`));

        await pool.end();
        console.log('\n✅ Setup completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createUsersTable();
