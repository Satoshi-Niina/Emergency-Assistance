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

console.log('📁 Server path:', serverPath);
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', process.env.PORT);

// ファイルの存在確認
const fs = require('fs');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found:', serverPath);
  console.log('📂 Available files in dist/server/:', fs.readdirSync(path.join(__dirname, 'dist', 'server')).join(', '));
  process.exit(1);
}

// サーバープロセスを起動
const server = spawn('node', [serverPath], {
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