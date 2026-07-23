import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:CHANGE_ME@localhost:5432/webappdb';

const pool = new Pool({
  connectionString
});

try {
  console.log('Connecting to database...');
  const result = await pool.query('SELECT username, display_name, role FROM users');
  console.log('\n📊 Users in webappdb:');
  console.table(result.rows);
  console.log(`\nTotal users: ${result.rows.length}`);
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await pool.end();
}
