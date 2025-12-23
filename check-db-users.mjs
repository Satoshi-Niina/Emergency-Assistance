import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Takabeni@localhost:5432/webappdb'
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
