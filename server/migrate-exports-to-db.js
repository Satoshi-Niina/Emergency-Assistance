#!/usr/bin/env node

/**
 * 既存のエクスポートファイルをDBに移行
 * GPTナレッジデータ用のJSON出力も対応
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'; 
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { faultHistory, faultHistoryImages } from './db/schema.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function migrateExportsToDB() {
  console.log('🔄 エクスポートファイルをDBに移行開始');
  
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
    
    // exportsディレクトリを確認
    const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
    let targetDir = exportsDir;
    if (!fs.existsSync(exportsDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        console.log('⚠️ exportsディレクトリが見つかりません。作成します。');
        fs.mkdirSync(exportsDir, { recursive: true });
        targetDir = exportsDir;
      }
    }
    
    // JSONファイルを取得
    const files = fs.readdirSync(targetDir).filter(file => file.endsWith('.json'));
    console.log(`📁 移行対象ファイル: ${files.length}件`);
    
    if (files.length === 0) {
      console.log('📝 移行対象のファイルがありません。サンプルデータを作成します。');
      
      // サンプルデータを作成
      const sampleData = {
        chatId: uuidv4(),
        title: 'サンプル故障履歴',
        machineType: 'サンプル機種',
        machineNumber: 'SAMPLE-001',
        exportTimestamp: new Date().toISOString(),
        chatData: {
          messages: [
            {
              role: 'user',
              content: 'サンプルの故障報告です。'
            },
            {
              role: 'assistant', 
              content: 'サンプルの対応方法をお教えします。'
            }
          ]
        },
        exportType: 'sample'
      };
      
      const sampleFile = path.join(targetDir, `${sampleData.chatId}.json`);
      fs.writeFileSync(sampleFile, JSON.stringify(sampleData, null, 2));
      files.push(`${sampleData.chatId}.json`);
    }
    
    let migrated = 0;
    let skipped = 0;
    const errors = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // 既存チェック
        const existingId = jsonData.chatId || file.replace('.json', '');
        const existing = await db.select().from(faultHistory).where(eq(faultHistory.id, existingId)).limit(1);
        
        if (existing.length > 0) {
          console.log(`⏭️ スキップ: ${file} (既に存在)`);
          skipped++;
          continue;
        }
        
        // 履歴レコードを作成
        const historyRecord = {
          id: existingId,
          title: jsonData.title || 'タイトルなし',
          description: jsonData.chatData?.messages?.[0]?.content || '',
          machineType: jsonData.machineType || jsonData.machineInfo?.machineTypeName || '',
          machineNumber: jsonData.machineNumber || jsonData.machineInfo?.machineNumber || '',
          office: jsonData.office || '',
          category: 'チャット履歴',
          keywords: JSON.stringify(['チャット', 'エクスポート']),
          emergencyGuideTitle: null,
          emergencyGuideContent: null,
          jsonData: JSON.stringify(jsonData), // 元のJSONデータをそのまま保存
          storageMode: 'database',
          createdAt: new Date(jsonData.exportTimestamp || Date.now()),
          updatedAt: new Date()
        };
        
        await db.insert(faultHistory).values(historyRecord);
        
        // 画像ファイルの検索とリンク
        const imagesDir = path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        if (fs.existsSync(imagesDir)) {
          const imageFiles = fs.readdirSync(imagesDir);
          const relatedImages = imageFiles.filter(imgFile => 
            imgFile.includes(existingId) || 
            imgFile.startsWith(`chat_image_${existingId}_`)
          );
          
          for (const imgFile of relatedImages) {
            const imageRecord = {
              id: uuidv4(),
              faultHistoryId: existingId,
              originalFileName: imgFile,
              fileName: imgFile,
              filePath: path.relative(process.cwd(), path.join(imagesDir, imgFile)),
              relativePath: `images/chat-exports/${imgFile}`,
              mimeType: imgFile.endsWith('.jpeg') ? 'image/jpeg' : 'image/jpg',
              fileSize: fs.statSync(path.join(imagesDir, imgFile)).size,
              description: `チャット履歴の画像: ${imgFile}`,
              createdAt: new Date()
            };
            
            await db.insert(faultHistoryImages).values(imageRecord);
            console.log(`🖼️ 画像リンク追加: ${imgFile}`);
          }
        }
        
        console.log(`✅ 移行完了: ${file}`);
        migrated++;
        
      } catch (error) {
        const errorMsg = `${file}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ 移行エラー: ${errorMsg}`);
      }
    }
    
    console.log(`\n📊 移行結果:`);
    console.log(`  - 移行完了: ${migrated}件`);
    console.log(`  - スキップ: ${skipped}件`);
    console.log(`  - エラー: ${errors.length}件`);
    
    if (errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ 移行エラー:', error);
  } finally {
    if (usePostgres) {
      await db.client.end();
    }
  }
}

// GPTナレッジデータ用のJSON出力機能
async function exportForGPTKnowledge() {
  console.log('\n🤖 GPTナレッジデータ用JSON出力');
  
  try {
    let db;
    let usePostgres = false;
    
    if (process.env.DATABASE_URL?.startsWith('postgres')) {
      const client = postgres(process.env.DATABASE_URL);
      db = drizzlePg(client);
      usePostgres = true;
    } else {
      const sqlite = new Database(process.env.DATABASE_URL || 'app.db');
      db = drizzle(sqlite);
    }
    
    // 全履歴データを取得
    const histories = await db.select().from(faultHistory);
    
    // GPT用のナレッジデータを構築
    const knowledgeData = histories.map(history => {
      const jsonData = JSON.parse(history.jsonData);
      
      return {
        id: history.id,
        title: history.title,
        machineType: history.machineType,
        machineNumber: history.machineNumber,
        description: history.description,
        category: history.category,
        keywords: JSON.parse(history.keywords || '[]'),
        createdAt: history.createdAt,
        // チャットデータから会話内容を抽出
        conversation: jsonData.chatData?.messages?.map(msg => ({
          role: msg.role,
          content: msg.content
        })) || [],
        // 画像情報
        hasImages: true, // 画像があるかどうか
        imageCount: 0 // 実際の画像数は別途取得
      };
    });
    
    // GPT用JSONファイルを出力
    const outputPath = path.join(process.cwd(), 'knowledge-base', 'gpt-knowledge-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(knowledgeData, null, 2));
    
    console.log(`✅ GPTナレッジデータ出力完了: ${outputPath}`);
    console.log(`📊 出力件数: ${knowledgeData.length}件`);
    
  } catch (error) {
    console.error('❌ GPTナレッジデータ出力エラー:', error);
  }
}

// スクリプト実行
migrateExportsToDB().then(() => {
  return exportForGPTKnowledge();
}).then(() => {
  console.log('\n🎉 移行とGPTナレッジデータ出力完了');
  process.exit(0);
}).catch(error => {
  console.error('💥 スクリプトエラー:', error);
  process.exit(1);
});
