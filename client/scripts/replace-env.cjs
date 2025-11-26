#!/usr/bin/env node

/**
 * Build後処理: HTMLファイル内の環境変数プレースホルダーを置換
 * GitHub Actions または ローカルビルド時に実行
 */

const fs = require('fs');
const path = require('path');

// 環境変数を読み込む
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

const envPath = path.join(__dirname, '..', envFile);

let envVars = {};

// .env.productionまたは.env.developmentを探す
let actualEnvPath = envPath;
if (!fs.existsSync(actualEnvPath)) {
  // プロダクションがなければ開発環境ファイルを試す
  const altPath = path.join(__dirname, '..', '.env.production');
  if (fs.existsSync(altPath)) {
    actualEnvPath = altPath;
  }
}

if (fs.existsSync(actualEnvPath)) {
  const envContent = fs.readFileSync(actualEnvPath, 'utf-8');
  envVars = envContent
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
} else {
  console.warn('⚠️ No .env file found at', actualEnvPath);
}

// HTML ファイルを処理
const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (fs.existsSync(htmlPath)) {
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // プレースホルダーを置換
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

  // 処理済み HTML を書き込み
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  console.log('✅ Environment variables replaced in dist/index.html');
  console.log('   VITE_BACKEND_SERVICE_URL:', envVars.VITE_BACKEND_SERVICE_URL || '(not set)');
  console.log('   VITE_API_BASE_URL:', envVars.VITE_API_BASE_URL || '(not set)');
  console.log('   VITE_SERVER_URL:', envVars.VITE_SERVER_URL || '(not set)');
} else {
  console.warn('⚠️ dist/index.html not found');
  process.exit(1);
}
