#!/usr/bin/env node

/**
 * Build後処理: HTML内の環境変数プレースホルダーを置換
 * GitHub Actions または ローカルビルド時に実行
 * 
 * 優先順位:
 * 1. process.env (GitHub Actions環境変数)
 * 2. .env.production / .env.development ファイル
 */

const fs = require('fs');
const path = require('path');

console.log(' Replace-env script starting...');
console.log(' NODE_ENV:', process.env.NODE_ENV || 'development');

// 環境変数を取得（process.envを優先）
// 環境変数を取得（process.envを優先）
let envVars = {
  VITE_BACKEND_SERVICE_URL: process.env.VITE_BACKEND_SERVICE_URL || '',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
  VITE_SERVER_URL: process.env.VITE_SERVER_URL || '',
};

console.log(' Environment variables from process.env:');
console.log('   VITE_BACKEND_SERVICE_URL:', envVars.VITE_BACKEND_SERVICE_URL || '(not set)');
console.log('   VITE_API_BASE_URL:', envVars.VITE_API_BASE_URL || '(not set)');
console.log('   VITE_SERVER_URL:', envVars.VITE_SERVER_URL || '(not set)');

// .envファイルから読み込み（process.envに設定されていない場合のフォールバック）
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

const envPath = path.join(__dirname, '..', envFile);

// .env.production または .env.development を探す
let actualEnvPath = envPath;
if (!fs.existsSync(actualEnvPath)) {
  // プロダクションがなければ開発環境ファイルを試す
  const altPath = path.join(__dirname, '..', '.env.production');
  if (fs.existsSync(altPath)) {
    actualEnvPath = altPath;
  }
}

if (fs.existsSync(actualEnvPath)) {
  console.log(` Reading .env file: ${actualEnvPath}`);
  const envContent = fs.readFileSync(actualEnvPath, 'utf-8');
  const fileEnvVars = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .reduce((acc, line) => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && value) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {});

  // process.envに設定されていないものだけ.envファイルから取得
  Object.keys(fileEnvVars).forEach(key => {
    if (!envVars[key] || envVars[key] === '') {
      console.log(`   Using ${key} from .env file`);
      envVars[key] = fileEnvVars[key];
    }
  });
} else {
  console.warn('  No .env file found at', actualEnvPath);
}

// HTML ファイルを処理
const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (fs.existsSync(htmlPath)) {
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // プレースホルダーを置換
  const before = {
    BACKEND: (htmlContent.match(/%%%VITE_BACKEND_SERVICE_URL%%%/g) || []).length,
    API: (htmlContent.match(/%%%VITE_API_BASE_URL%%%/g) || []).length,
    SERVER: (htmlContent.match(/%%%VITE_SERVER_URL%%%/g) || []).length,
  };

  htmlContent = htmlContent.replace(
    /%%%VITE_BACKEND_SERVICE_URL%%%/g,
    envVars.VITE_BACKEND_SERVICE_URL || ''
  );

  htmlContent = htmlContent.replace(
    /%%%VITE_API_BASE_URL%%%/g,
    envVars.VITE_API_BASE_URL || ''
  );

  htmlContent = htmlContent.replace(
    /%%%VITE_SERVER_URL%%%/g,
    envVars.VITE_SERVER_URL || ''
  );

  // 処理済み HTML を書き戻し
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  console.log(' Environment variables replaced in dist/index.html');
  console.log(`   Replaced placeholders:`);
  console.log(`   - VITE_BACKEND_SERVICE_URL: ${before.BACKEND} occurrence(s)  "${envVars.VITE_BACKEND_SERVICE_URL || '(empty)'}"`);
  console.log(`   - VITE_API_BASE_URL: ${before.API} occurrence(s)  "${envVars.VITE_API_BASE_URL || '(empty)'}"`);
  console.log(`   - VITE_SERVER_URL: ${before.SERVER} occurrence(s)  "${envVars.VITE_SERVER_URL || '(empty)'}"`);
} else {
  console.error(' dist/index.html not found at:', htmlPath);
  process.exit(1);
}

// runtime-config.js ファイルを処理
const runtimeConfigPath = path.join(__dirname, '..', 'dist', 'runtime-config.js');

if (fs.existsSync(runtimeConfigPath)) {
  let runtimeConfigContent = fs.readFileSync(runtimeConfigPath, 'utf-8');

  // PLACEHOLDER_API_BASE_URL を置換
  const beforePlaceholder = (runtimeConfigContent.match(/PLACEHOLDER_API_BASE_URL/g) || []).length;

  runtimeConfigContent = runtimeConfigContent.replace(
    /PLACEHOLDER_API_BASE_URL/g,
    envVars.VITE_API_BASE_URL || ''
  );

  // 処理済み runtime-config.js を書き戻し
  fs.writeFileSync(runtimeConfigPath, runtimeConfigContent, 'utf-8');

  console.log(' Environment variables replaced in dist/runtime-config.js');
  console.log(`   Replaced PLACEHOLDER_API_BASE_URL: ${beforePlaceholder} occurrence(s)  "${envVars.VITE_API_BASE_URL || '(empty)'}"`);
} else {
  console.warn('  runtime-config.js not found at:', runtimeConfigPath);
  console.warn('  Skipping runtime-config.js replacement');
}

console.log(' Replace-env script completed successfully');
