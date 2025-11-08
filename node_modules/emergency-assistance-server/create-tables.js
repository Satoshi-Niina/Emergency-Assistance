#!/usr/bin/env node

/**
 * SQLite用テーブル作成スクリプト
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

async function createTables() {
  try {
    const db = new Database('app.db');
    
    console.log('📊 SQLiteデータベース接続');
    
    // SQLファイルを読み込み
    const sqlFile = path.join(process.cwd(), 'create-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // SQLを実行
    db.exec(sql);
    
    console.log('✅ テーブル作成完了');
    
    // テーブル一覧を確認
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 作成されたテーブル:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ テーブル作成エラー:', error);
  }
}

createTables().then(() => {
  console.log('🎉 テーブル作成完了');
  process.exit(0);
}).catch(error => {
  console.error('💥 スクリプトエラー:', error);
  process.exit(1);
});
