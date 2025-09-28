#!/usr/bin/env tsx

// ローカル開発用サーバー
// 本番環境と同じproduction-server.jsを使用

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 ローカル開発サーバーを起動中...');

// production-server.jsを実行
const serverPath = path.join(__dirname, 'production-server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '8000',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:takabeni@localhost:5432/webappdb',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-32-characters-long',
    SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret-32-characters-long',
    FRONTEND_URL: 'http://localhost:5173',
  }
});

server.on('error', (error) => {
  console.error('❌ サーバー起動エラー:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🛑 サーバー終了: ${code}`);
  process.exit(code || 0);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 サーバーを停止中...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 サーバーを停止中...');
  server.kill('SIGTERM');
});
