#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Emergency Assistance Backend...');

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

// サーバーファイルのパス
const serverPath = path.join(__dirname, 'dist', 'server', 'index.js');

console.log('📁 Server path:', serverPath);
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', process.env.PORT);

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