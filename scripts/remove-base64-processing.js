#!/usr/bin/env node
// -*- coding: utf-8 -*-

// Base64処理完全削除スクリプト
// 全てのBase64関連処理を削除し、画像URLのみを使用するように修正

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 Base64処理完全削除を開始...');

// 削除対象のファイル
const filesToClean = [
  'client/src/pages/history.tsx',
  'client/src/components/report/machine-failure-report.tsx',
  'server/routes/chat.js',
  'server/routes/chat.ts',
  'server/services/fault-history-service.ts',
  'server/unified-production-server.js',
  'server/routes/chat.mjs',
  'server/services/fault-history-service.js',
  'server/scripts/fix-base64-images.js'
];

// Base64関連の処理を削除する関数
function removeBase64Processing(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ファイルが存在しません: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Base64関連のコメントとログを削除
    const base64Patterns = [
      /\/\/ .*[Bb]ase64.*\n/g,
      /console\.log\([^)]*[Bb]ase64[^)]*\);\n/g,
      /console\.log\([^)]*base64[^)]*\);\n/g,
      /\/\* .*[Bb]ase64.*\*\//g,
    ];
    
    base64Patterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });
    
    // Base64検出処理を削除
    const base64DetectionPatterns = [
      /if\s*\([^)]*startsWith\(['"]data:image\/['"]\)[^}]*\{[^}]*\}/g,
      /message\.content\.startsWith\(['"]data:image\/['"]\)/g,
      /content\.startsWith\(['"]data:image\/['"]\)/g,
    ];
    
    base64DetectionPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, 'false');
        modified = true;
      }
    });
    
    // Base64データ処理を削除
    const base64DataPatterns = [
      /const base64Data = [^;]+;/g,
      /Buffer\.from\(base64Data, ['"]base64['"]\)/g,
      /\.replace\(\/.*data:image\/[^)]+\)/g,
    ];
    
    base64DataPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Base64処理を削除: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  変更なし: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ エラー: ${filePath}`, error.message);
    return false;
  }
}

// メイン処理
let cleanedCount = 0;
let errorCount = 0;

console.log('\n📄 Base64処理を削除中...');
filesToClean.forEach(file => {
  if (removeBase64Processing(file)) {
    cleanedCount++;
  } else {
    errorCount++;
  }
});

// 結果表示
console.log('\n📊 Base64削除結果:');
console.log(`✅ 処理完了: ${cleanedCount}件`);
if (errorCount > 0) {
  console.log(`❌ エラー: ${errorCount}件`);
}

// 残存するBase64処理を確認
console.log('\n🔍 残存するBase64処理を確認中...');
const remainingBase64 = filesToClean.filter(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    return /base64|Base64|data:image\//i.test(content);
  }
  return false;
});

if (remainingBase64.length > 0) {
  console.log('⚠️  まだBase64処理が残っているファイル:');
  remainingBase64.forEach(file => console.log(`  - ${file}`));
} else {
  console.log('✅ 全てのBase64処理が削除されました！');
}

console.log('\n🎉 Base64処理完全削除完了！');
console.log('📝 次のステップ:');
console.log('1. サーバーを再起動');
console.log('2. 新しいチャットで画像アップロードをテスト');
console.log('3. エクスポート機能をテスト');
