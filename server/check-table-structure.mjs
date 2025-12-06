import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTableStructure() {
  try {
    console.log('🔍 chat_historyテーブル構造確認');
    console.log('=====================================\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'chat_history'
      ORDER BY ordinal_position
    `);
    
    console.log(`📋 カラム一覧:\n`);
    
    for (const row of result.rows) {
      console.log(`  ${row.column_name}`);
      console.log(`    型: ${row.data_type}`);
      console.log(`    NULL可: ${row.is_nullable}`);
      console.log(`    デフォルト: ${row.column_default || '(なし)'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
