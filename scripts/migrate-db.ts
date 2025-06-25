#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数の読み込み
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...');
  console.log(`📡 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

  try {
    // PostgreSQL接続の作成
    const sql = postgres(databaseUrl, { max: 1 });
    const db = drizzle(sql);

    // マイグレーションの実行
    console.log('🔄 Running migrations...');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'migrations') });

    console.log('✅ Database migration completed successfully');
    
    // 接続を閉じる
    await sql.end();
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

main(); 