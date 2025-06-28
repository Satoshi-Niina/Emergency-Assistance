#!/usr/bin/env node

// Azure環境での環境変数とCORS設定をデバッグするスクリプト
console.log('🔍 Azure環境デバッグ情報');
console.log('========================');

// 環境変数の確認
const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET' : 'NOT SET',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
};

console.log('📋 環境変数:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// CORS設定の確認
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = isProduction 
  ? [
      process.env.FRONTEND_URL || 'https://emergency-assistance-app.azurestaticapps.net',
      'https://*.azurestaticapps.net',
      'https://*.azurewebsites.net',
      'https://emergency-assistance-app.azurestaticapps.net',
    ]
  : ['http://localhost:5000', 'http://localhost:5173', 'https://*.replit.dev'];

console.log('\n🔧 CORS設定:');
console.log(`  本番環境: ${isProduction}`);
console.log(`  許可オリジン:`, corsOrigins);

// ネットワーク情報
const os = require('os');
console.log('\n🌐 ネットワーク情報:');
console.log(`  ホスト名: ${os.hostname()}`);
console.log(`  プラットフォーム: ${os.platform()}`);
console.log(`  アーキテクチャ: ${os.arch()}`);

// プロセス情報
console.log('\n⚙️ プロセス情報:');
console.log(`  PID: ${process.pid}`);
console.log(`  Node.js バージョン: ${process.version}`);
console.log(`  作業ディレクトリ: ${process.cwd()}`);

console.log('\n✅ デバッグ情報出力完了'); 