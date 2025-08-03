import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM対応の __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データベース接続設定
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

async function applyMigration() {
  const client = postgres(getDatabaseUrl(), {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('🔍 マイグレーションファイルを読み込み中...');
    
    // マイグレーションファイルのパス（最新版を使用）
    const migrationPath = path.join(__dirname, '../../migrations/0003_fix_schema_final.sql');
    
    // usersテーブル用のマイグレーションファイルのパス
    const usersMigrationPath = path.join(__dirname, '../../migrations/0004_add_users_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`マイグレーションファイルが見つかりません: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔍 メインマイグレーションを実行中...');
    
    // メインマイグレーションを実行
    await client.unsafe(migrationSQL);
    
    // usersテーブル用マイグレーションを実行
    if (fs.existsSync(usersMigrationPath)) {
        console.log('🔍 usersテーブル用マイグレーションを実行中...');
        const usersMigrationSQL = fs.readFileSync(usersMigrationPath, 'utf-8');
        await client.unsafe(usersMigrationSQL);
    } else {
        console.log('⚠️ usersテーブル用マイグレーションファイルが見つかりません');
    }
    
    console.log('✅ マイグレーションが正常に完了しました');
    
    // 確認用クエリ
    console.log('🔍 テーブル構造を確認中...');
    
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('machines', 'machine_types', 'history_items', 'users')
      ORDER BY table_name
    `;
    
    console.log('📋 存在するテーブル:', tables.map(t => t.table_name));
    
    // machines テーブルのカラム確認
    const machineColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'machines' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 machines テーブルのカラム:');
    machineColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // history_items テーブルのカラム確認
    const historyColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'history_items' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 history_items テーブルのカラム:');
    historyColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // サンプルデータの確認
    const machineCount = await client`SELECT COUNT(*) as count FROM machines`;
    const machineTypeCount = await client`SELECT COUNT(*) as count FROM machine_types`;
    const historyCount = await client`SELECT COUNT(*) as count FROM history_items`;
    const userCount = await client`SELECT COUNT(*) as count FROM users`;
    
    console.log('📊 データ件数:');
    console.log(`  - machines: ${machineCount[0].count}件`);
    console.log(`  - machine_types: ${machineTypeCount[0].count}件`);
    console.log(`  - history_items: ${historyCount[0].count}件`);
    console.log(`  - users: ${userCount[0].count}件`);
    
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigration()
    .then(() => {
      console.log('🎉 マイグレーション処理が完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 マイグレーション処理でエラーが発生しました:', error);
      process.exit(1);
    });
} 