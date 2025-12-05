import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { DATABASE_URL, PG_SSL } from '../config/env.mjs';

export let dbPool = null;

export function initializeDatabase() {
  if (!DATABASE_URL) {
    console.warn('[DB] No DATABASE_URL provided. Running without database.');
    return false;
  }

  try {
    const sslConfig = PG_SSL === 'require'
      ? { rejectUnauthorized: false }
      : PG_SSL === 'disable'
        ? false
        : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: sslConfig,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false,
    });

    console.log('[DB] Pool initialized.');
    
    // Warmup
    dbPool.connect().then(client => {
      console.log('[DB] Connection test successful');
      client.release();
    }).catch(err => {
      console.error('[DB] Connection test failed:', err.message);
    });

    return true;
  } catch (error) {
    console.error('[DB] Initialization failed:', error);
    return false;
  }
}

export async function dbQuery(sql, params = [], retries = 3) {
  if (!dbPool) {
    throw new Error('No database connection available');
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      const connectPromise = dbPool.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );

      client = await Promise.race([connectPromise, timeoutPromise]);
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[DB] Query attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt < retries && (error.message.includes('timeout') || error.message.includes('connect'))) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw error;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (e) {
          console.error('[DB] Error releasing client:', e.message);
        }
      }
    }
  }
  throw lastError;
}

// 初期データ投入などのロジックも必要ならここに移動するか、別ファイルにする
// 今回は簡略化のため、initializeDatabase 内でのテーブル作成ロジックは省略し、
// 必要であれば startupSequence から呼び出す形にするか、マイグレーションツールに任せるべきだが、
// azure-server.mjs にあったテーブル作成ロジックも移植しておくのが安全。

export async function ensureTables() {
  if (!dbPool) return;
  
  try {
    const client = await dbPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          display_name TEXT,
          role TEXT DEFAULT 'user',
          department TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS machine_types (
          id SERIAL PRIMARY KEY,
          machine_type_name TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS machines (
          id SERIAL PRIMARY KEY,
          machine_number TEXT NOT NULL,
          machine_type_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_history (
          id SERIAL PRIMARY KEY,
          title TEXT,
          machine_type TEXT,
          machine_number TEXT,
          content TEXT,
          conversation_history TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS base_documents (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          category TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          category TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          category TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
        CREATE INDEX IF NOT EXISTS idx_chat_history_machine_number ON chat_history(machine_number);
        CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
      `);
      
      // Admin user check
      const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
      if (adminCheck.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin', 10);
        await client.query(
          'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5)',
          ['admin', hashedPassword, 'System Admin', 'admin', 'IT']
        );
        console.log('[DB] Default admin user created');
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[DB] Table creation failed:', err);
  }
}
