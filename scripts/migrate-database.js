// Database migration script for Emergency Assistance System
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://emergencyAdmin:EmergencyApp2025!@emergency-assist-postgres.postgres.database.azure.com:5432/emergencydb?sslmode=require'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create users table (gen_random_uuid() is built-in since PostgreSQL 13)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        department TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createUsersTable);
    console.log('✅ Users table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);');
    console.log('✅ Indexes created');

    // Insert sample users with bcrypt hashes
    const insertUsers = `
      INSERT INTO users (username, password, display_name, role, department) VALUES
        ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者', 'admin', 'システム管理部'),
        ('employee1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '従業員1', 'employee', '保守部'),
        ('test', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'テストユーザー', 'employee', 'テスト部'),
        ('demo', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'デモユーザー', 'employee', 'デモ部'),
        ('niina', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '新名聡', 'admin', 'システム管理部')
      ON CONFLICT (username) DO NOTHING;
    `;
    await client.query(insertUsers);
    console.log('✅ Sample users inserted');

    // Verify users were created
    const result = await client.query('SELECT username, display_name, role FROM users;');
    console.log('📊 Users in database:');
    result.rows.forEach(user => {
      console.log(`  - ${user.username}: ${user.display_name} (${user.role})`);
    });

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
