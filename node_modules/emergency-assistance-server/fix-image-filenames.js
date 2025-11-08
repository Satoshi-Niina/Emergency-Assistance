#!/usr/bin/env node

/**
 * 既存のfault_history_imagesテーブルのファイル名を修正
 * .jpg -> .jpeg に統一
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'; 
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { faultHistoryImages } from './db/schema.js';
import fs from 'fs';
import path from 'path';

async function fixImageFilenames() {
  console.log('🔧 画像ファイル名修正スクリプト開始');
  
  let db;
  let usePostgres = false;
  
  try {
    if (process.env.DATABASE_URL?.startsWith('postgres')) {
      // PostgreSQL
      const client = postgres(process.env.DATABASE_URL);
      db = drizzlePg(client);
      usePostgres = true;
      console.log('📊 PostgreSQL接続');
    } else {
      // SQLite
      const sqlite = new Database(process.env.DATABASE_URL || 'app.db');
      db = drizzle(sqlite);
      console.log('📊 SQLite接続');
    }
    
    // 既存の画像レコードを取得
    const images = await db.select().from(faultHistoryImages);
    console.log(`📷 画像レコード数: ${images.length}件`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const image of images) {
      const oldFileName = image.fileName;
      
      // .jpg を .jpeg に変更
      if (oldFileName.endsWith('.jpg')) {
        const newFileName = oldFileName.replace('.jpg', '.jpeg');
        
        // 実際のファイルが存在するかチェック
        const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR || 
          path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        const oldFilePath = path.join(imagesDir, oldFileName);
        const newFilePath = path.join(imagesDir, newFileName);
        
        if (fs.existsSync(newFilePath)) {
          // DBレコードを更新
          await db.update(faultHistoryImages)
            .set({ 
              fileName: newFileName,
              filePath: path.relative(process.cwd(), newFilePath),
              relativePath: `images/chat-exports/${newFileName}`
            })
            .where(eq(faultHistoryImages.id, image.id));
          
          console.log(`✅ 更新: ${oldFileName} -> ${newFileName}`);
          updated++;
        } else {
          console.log(`⚠️ ファイルが見つからない: ${newFileName}`);
          skipped++;
        }
      } else {
        console.log(`⏭️ スキップ: ${oldFileName} (既に.jpeg)`);
        skipped++;
      }
    }
    
    console.log(`\n📊 修正完了:`);
    console.log(`  - 更新: ${updated}件`);
    console.log(`  - スキップ: ${skipped}件`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    if (usePostgres) {
      await db.client.end();
    }
  }
}

// スクリプト実行
fixImageFilenames().then(() => {
  console.log('🎉 画像ファイル名修正完了');
  process.exit(0);
}).catch(error => {
  console.error('💥 スクリプトエラー:', error);
  process.exit(1);
});
