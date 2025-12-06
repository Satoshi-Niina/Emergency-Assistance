#!/usr/bin/env node

/**
 * ビルド検証スクリプト
 * ビルド後にプレースホルダーや古いURLが残っていないかチェック
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Build verification starting...');

let hasError = false;

// runtime-config.js の検証
const runtimeConfigPath = path.join(__dirname, '..', 'dist', 'runtime-config.js');

if (fs.existsSync(runtimeConfigPath)) {
  const runtimeConfig = fs.readFileSync(runtimeConfigPath, 'utf-8');
  
  // プレースホルダーが残っていないか
  if (runtimeConfig.includes('PLACEHOLDER_API_BASE_URL') && 
      runtimeConfig.match(/apiBaseUrl\s*=\s*["']PLACEHOLDER_API_BASE_URL["']/)) {
    console.error('❌ runtime-config.js にプレースホルダーが残っています');
    console.error('   PLACEHOLDER_API_BASE_URL が置換されていません');
    hasError = true;
  }
  
  // 古いURLが含まれていないか
  if (runtimeConfig.includes('gwgscxcca5chahyb9') || 
      runtimeConfig.includes('japanwest-01.azurewebsites.net')) {
    console.error('❌ runtime-config.js に古いURLが含まれています');
    console.error('   旧URLを削除してください');
    hasError = true;
  }
  
  // 正しいURLが含まれているか確認
  if (runtimeConfig.includes('emergency-assistantapp.azurewebsites.net')) {
    console.log('✅ runtime-config.js: 正しいURLが設定されています');
  } else {
    console.warn('⚠️  runtime-config.js: URLが設定されていません（ローカルビルドの可能性）');
  }
} else {
  console.error('❌ dist/runtime-config.js が見つかりません');
  hasError = true;
}

// index.html の検証
const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  
  // プレースホルダーが残っていないか
  if (indexHtml.includes('%%%VITE_')) {
    console.error('❌ index.html にプレースホルダーが残っています');
    hasError = true;
  } else {
    console.log('✅ index.html: プレースホルダーは正しく置換されています');
  }
} else {
  console.error('❌ dist/index.html が見つかりません');
  hasError = true;
}

if (hasError) {
  console.error('\n❌ Build verification failed');
  console.error('   ビルドに問題があります。環境変数を確認してください。');
  process.exit(1);
}

console.log('\n✅ Build verification passed');
console.log('   すべてのファイルが正しくビルドされています。');
