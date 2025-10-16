#!/usr/bin/env node
// -*- coding: utf-8 -*-

// 統合起動スクリプト - 開発・本番両対応
// 環境変数に基づいて自動的に開発モードまたは本番モードで起動

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 環境変数の確認
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

console.log('🚀 Emergency Assistance System 起動中...');
console.log(`📊 環境: ${nodeEnv}`);
console.log(`🔧 モード: ${isProduction ? '本番' : '開発'}`);

// 起動するサーバーファイルを決定
const serverFile = 'server/unified-server.js';

const serverPath = path.join(projectRoot, serverFile);

console.log(`📁 サーバーファイル: ${serverFile}`);

// サーバーを起動
const serverProcess = spawn('node', [serverPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: nodeEnv
  }
});

// プロセス終了時の処理
serverProcess.on('close', (code) => {
  console.log(`\n🛑 サーバーが終了しました (コード: ${code})`);
  process.exit(code);
});

serverProcess.on('error', (error) => {
  console.error('❌ サーバー起動エラー:', error);
  process.exit(1);
});

// シグナルハンドリング
process.on('SIGINT', () => {
  console.log('\n🛑 シャットダウン中...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 シャットダウン中...');
  serverProcess.kill('SIGTERM');
});
