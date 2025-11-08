#!/usr/bin/env node

/**
 * SQLite用機種・機械番号テーブル作成スクリプト
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

async function createMachineTables() {
  try {
    const db = new Database('app.db');
    
    console.log('📊 SQLiteデータベース接続');
    
    // SQLファイルを読み込み
    const sqlFile = path.join(process.cwd(), 'create-machine-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // SQLを実行
    db.exec(sql);
    
    console.log('✅ 機種・機械番号テーブル作成完了');
    
    // テーブル一覧を確認
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 作成されたテーブル:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // 機種データを確認
    const machineTypes = db.prepare("SELECT * FROM machine_types").all();
    console.log('🔧 機種データ:');
    machineTypes.forEach(type => {
      console.log(`  - ${type.machine_type_name} (ID: ${type.id})`);
    });
    
    // 機械番号データを確認
    const machines = db.prepare(`
      SELECT m.machine_number, mt.machine_type_name 
      FROM machines m 
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id 
      ORDER BY mt.machine_type_name, m.machine_number
    `).all();
    console.log('🔩 機械番号データ:');
    machines.forEach(machine => {
      console.log(`  - ${machine.machine_number} (${machine.machine_type_name})`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ テーブル作成エラー:', error);
  }
}

createMachineTables().then(() => {
  console.log('🎉 機種・機械番号テーブル作成完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ スクリプト実行エラー:', error);
  process.exit(1);
});
