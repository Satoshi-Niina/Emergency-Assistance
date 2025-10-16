#!/usr/bin/env node
// -*- coding: utf-8 -*-

// 本番デプロイ用クリーンアップスクリプト
// 開発用ファイルを削除し、本番用に最適化

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 本番デプロイ用クリーンアップを開始...');

// 削除対象のファイル・ディレクトリ
const filesToDelete = [
  // 開発ガイド
  'CLEAN_BUILD_GUIDE.md',
  'HOT_RELOAD_DEV_GUIDE.md',
  'UNIFIED_DEV_GUIDE.md',
  
  // テストファイル
  'test-emergency-flow.html',
  'test-login.ps1',
  
  // 開発用設定
  'eslint.config.js',
  'client/env.development',
  'server/env.development',
  
  // 開発用ファイル
  'server/unified-hot-reload-server-backup.js',
  'server/index.dev.ts',
  
  // 一時ディレクトリ
  'temp_untracked',
  'app-logs',
  
  // 開発用スクリプト
  'scripts/start-hot-reload-dev.ps1',
  'scripts/start-hot-reload-dev.sh',
  'scripts/start-local-dev.ps1',
  'scripts/start-local-dev.sh',
  'scripts/check-azure-environment.ps1',
  'scripts/check-azure-environment.sh',
  
  // 開発用ログ
  'server/app-logs',
  
  // 不要なバックアップファイル
  'server/unified-hot-reload-server-backup.js',
];

// 削除対象のディレクトリ（中身も含めて）
const dirsToDelete = [
  'temp_untracked',
  'app-logs',
  'server/app-logs',
];

// ファイル削除関数
function deleteFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ 削除: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  ファイルが存在しません: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 削除エラー: ${filePath}`, error.message);
    return false;
  }
}

// ディレクトリ削除関数（再帰的）
function deleteDirectory(dirPath) {
  const fullPath = path.join(projectRoot, dirPath);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ 削除: ${dirPath}/`);
      return true;
    } else {
      console.log(`⚠️  ディレクトリが存在しません: ${dirPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 削除エラー: ${dirPath}`, error.message);
    return false;
  }
}

// メイン処理
let deletedCount = 0;
let errorCount = 0;

console.log('\n📁 ディレクトリを削除中...');
dirsToDelete.forEach(dir => {
  if (deleteDirectory(dir)) {
    deletedCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📄 ファイルを削除中...');
filesToDelete.forEach(file => {
  if (deleteFile(file)) {
    deletedCount++;
  } else {
    errorCount++;
  }
});

// 結果表示
console.log('\n📊 クリーンアップ結果:');
console.log(`✅ 削除成功: ${deletedCount}件`);
if (errorCount > 0) {
  console.log(`❌ 削除エラー: ${errorCount}件`);
}

// 本番用ファイルの確認
console.log('\n🔍 本番用ファイルの確認:');
const productionFiles = [
  'server/unified-production-server.js',
  'server/unified-hot-reload-server.js',
  'Dockerfile',
  'package.json',
];

productionFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ 存在: ${file}`);
  } else {
    console.log(`⚠️  存在しない: ${file}`);
  }
});

console.log('\n🎉 本番デプロイ用クリーンアップ完了！');
console.log('📝 次のステップ:');
console.log('1. 本番環境変数を設定');
console.log('2. Dockerイメージをビルド');
console.log('3. 本番サーバーにデプロイ');