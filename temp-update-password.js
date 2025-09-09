const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function updatePassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    const hashedPassword = await bcrypt.hash('G&896845', 10);
    console.log('Hashed password:', hashedPassword);
    
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING username, role',
      [hashedPassword, 'niina']
    );
    
    console.log('Password updated:', result.rows[0]);
    
    // 検証
    const verifyResult = await client.query(
      'SELECT password FROM users WHERE username = $1',
      ['niina']
    );
    
    const isValid = await bcrypt.compare('G&896845', verifyResult.rows[0].password);
    console.log('Verification result:', isValid);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updatePassword();
