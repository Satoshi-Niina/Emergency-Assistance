import { Pool } from 'pg';
import { config } from 'dotenv';

// 迺ｰ蠅・､画焚繧定ｪｭ縺ｿ霎ｼ縺ｿ
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL謗･邯壹・繝ｼ繝ｫ繧剃ｽ懈・
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 譛螟ｧ謗･邯壽焚
  idleTimeoutMillis: 30000, // 繧｢繧､繝峨Ν繧ｿ繧､繝繧｢繧ｦ繝・
  connectionTimeoutMillis: 2000, // 謗･邯壹ち繧､繝繧｢繧ｦ繝・
});

// 謗･邯壹お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 蛛･蠎ｷ繝√ぉ繝・け髢｢謨ｰ
export async function health(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// 繝励・繝ｫ繧偵お繧ｯ繧ｹ繝昴・繝・
export { pool };

// 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥叙蠕励・繝倥Ν繝代・髢｢謨ｰ
export async function getClient() {
  return await pool.connect();
}

// 繧ｯ繧ｨ繝ｪ螳溯｡後・繝倥Ν繝代・髢｢謨ｰ
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
