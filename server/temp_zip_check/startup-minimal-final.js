#!/usr/bin/env node

// 最小限の起動スクリプト - 確実に動作することを最優先
console.log('🚀 Minimal startup script starting...');

const http = require('http');

// 即座にHTTPサーバーを起動
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

// ポート設定（Azure Web App用）
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// サーバー起動
server.listen(port, () => {
  console.log(`✅ Server started on port ${port}`);
  console.log(`🎉 Application is ready!`);
});

// エラーハンドリング
server.on('error', (error) => {
  console.error('Server error:', error);
});

// プロセス終了時の処理
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
