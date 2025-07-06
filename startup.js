#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Emergency Assistance Backend...');

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

// デバッグモードの確認
const isDebug = process.argv.includes('--debug') || process.env.DEBUG === 'true';

if (isDebug) {
  console.log('🔍 Debug mode enabled');
  console.log('📋 Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
  });
}

// サーバーファイルのパス
const serverPath = path.join(__dirname, 'dist', 'server', 'index.js');

// Azure App Service用の代替パス
const azureServerPath = path.join(__dirname, 'server', 'index.ts');

console.log('📁 Server path:', serverPath);
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', process.env.PORT);

// ファイルの存在確認
const fs = require('fs');
let finalServerPath = serverPath;

if (!fs.existsSync(serverPath)) {
  console.log('⚠️ Compiled server file not found, trying TypeScript source...');
  if (fs.existsSync(azureServerPath)) {
    finalServerPath = azureServerPath;
    console.log('✅ Using TypeScript source file');
  } else {
    console.error('❌ Server file not found:', serverPath);
    console.error('❌ TypeScript source not found:', azureServerPath);
    console.log('📂 Available files in dist/server/:', fs.existsSync(path.join(__dirname, 'dist', 'server')) ? fs.readdirSync(path.join(__dirname, 'dist', 'server')).join(', ') : 'Directory not found');
    process.exit(1);
  }
}

// サーバープロセスを起動
const isTypeScript = finalServerPath.endsWith('.ts');
const command = isTypeScript ? 'npx' : 'node';
const args = isTypeScript ? ['tsx', finalServerPath] : [finalServerPath];

console.log('🚀 Starting server with:', command, args.join(' '));

const server = spawn(command, args, {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  process.exit(code);
});

// シグナルハンドリング
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
}); 