const { Client } = require('pg');

async function fixNiina() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // 権限修正
    const result = await client.query(`
      UPDATE users 
      SET role = 'system_admin', display_name = 'Niina Administrator', updated_at = NOW()
      WHERE username = 'niina'
      RETURNING username, role, display_name;
    `);
    
    console.log('Fixed:', result.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixNiina();
