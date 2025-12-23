import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Takabeni@localhost:5432/webappdb'
});

try {
  console.log('Creating user niina...');
  
  const password = 'G&896845';
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  await pool.query(
    'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role',
    ['niina', hashedPassword, 'Satoshi Niina', 'admin', 'IT']
  );
  
  console.log('✅ User niina created/updated successfully');
  console.log('   Username: niina');
  console.log('   Password: G&896845');
  console.log('   Role: admin');
  
  // 確認
  const result = await pool.query('SELECT username, display_name, role FROM users WHERE username = $1', ['niina']);
  console.log('\n📊 User details:', result.rows[0]);
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await pool.end();
}
