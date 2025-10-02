#!/usr/bin/env node

// データベースマイグレーション実行スクリプト
// Docker環境用

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - skipping migrations');
    return;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PG_SSL === 'require' ? { rejectUnauthorized: false } : false,
      max: 1,
    });

    const client = await pool.connect();
    
    // マイグレーションテーブルを作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 実行済みマイグレーションを取得
    const executedResult = await client.query('SELECT filename FROM schema_migrations');
    const executedFilenames = executedResult.rows.map(row => row.filename);

    // マイグレーションファイルを読み込み
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    for (const filename of migrationFiles) {
      if (executedFilenames.includes(filename)) {
        console.log(`⏭️ Skipping already executed migration: ${filename}`);
        continue;
      }

      console.log(`🔄 Executing migration: ${filename}`);
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      
      console.log(`✅ Migration completed: ${filename}`);
    }

    await client.release();
    await pool.end();
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
}

// 直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}
