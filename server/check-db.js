#!/usr/bin/env node

/**
 * データベースの状況を確認
 */

import Database from 'better-sqlite3';

try {
  const db = new Database('app.db');
  
  console.log('📊 データベースファイル:', 'app.db');
  
  // テーブル一覧を取得
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 テーブル一覧:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });
  
  // fault_history_imagesテーブルの存在確認
  const hasImagesTable = tables.some(table => table.name === 'fault_history_images');
  console.log(`\n🖼️ fault_history_imagesテーブル: ${hasImagesTable ? '存在' : '不存在'}`);
  
  if (hasImagesTable) {
    // 画像レコード数を確認
    const count = db.prepare("SELECT COUNT(*) as count FROM fault_history_images").get();
    console.log(`📷 画像レコード数: ${count.count}件`);
    
    // サンプルレコードを表示
    const samples = db.prepare("SELECT fileName FROM fault_history_images LIMIT 5").all();
    console.log('📄 サンプルファイル名:');
    samples.forEach(sample => {
      console.log(`  - ${sample.fileName}`);
    });
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ エラー:', error);
}
