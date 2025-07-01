#!/usr/bin/env node

/**
 * Azure App Service用起動スクリプト
 * デバッグ情報を出力してからアプリケーションを起動
 */

console.log('🚀 Azure App Service起動スクリプト開始...');

// 環境変数の確認
console.log('🔍 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
  PWD: process.cwd(),
  __dirname: __dirname
});

// ファイルシステムの確認
const fs = require('fs');
const path = require('path');

console.log('📁 ディレクトリ構造確認:');
try {
  const files = fs.readdirSync('.');
  console.log('ルートディレクトリ:', files);
  
  if (fs.existsSync('server')) {
    const serverFiles = fs.readdirSync('server');
    console.log('serverディレクトリ:', serverFiles);
  }
  
  if (fs.existsSync('server/dist')) {
    const distFiles = fs.readdirSync('server/dist');
    console.log('server/distディレクトリ:', distFiles);
  }
} catch (error) {
  console.error('❌ ディレクトリ確認エラー:', error);
}

// 依存関係の確認
console.log('📦 package.json確認:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('package.json読み込み成功:', {
    name: packageJson.name,
    version: packageJson.version,
    scripts: packageJson.scripts
  });
} catch (error) {
  console.error('❌ package.json読み込みエラー:', error);
}

// アプリケーション起動
console.log('🚀 アプリケーション起動中...');
try {
  // ビルドされたファイルを起動
  require('./dist/index.js');
} catch (error) {
  console.error('❌ アプリケーション起動エラー:', error);
  
  // フォールバック: 直接index.tsを実行
  console.log('🔄 フォールバック: TypeScriptファイルを直接実行...');
  try {
    require('tsx');
    require('./index.ts');
  } catch (fallbackError) {
    console.error('❌ フォールバック実行エラー:', fallbackError);
    process.exit(1);
  }
} 