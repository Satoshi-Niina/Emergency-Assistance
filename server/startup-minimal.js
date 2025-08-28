#!/usr/bin/env node

// 最小限の起動スクリプト - 即座に応答可能
console.log('🚀 最小限起動スクリプト開始');

import http from 'http';
const startTime = Date.now();

// 即座にヘルスチェックサーバーを起動
const server = http.createServer((req, res) => {
  const uptime = process.uptime();
  const responseTime = Date.now() - startTime;
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  
  res.end(JSON.stringify({
    status: 'running',
    uptime: uptime,
    responseTime: responseTime,
    timestamp: new Date().toISOString(),
    message: 'Application is running',
    version: process.version,
    pid: process.pid
  }));
});

// 環境変数からポートを取得
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

server.listen(port, () => {
  const startupTime = Date.now() - startTime;
  console.log(`✅ サーバー起動完了: ${startupTime}ms`);
  console.log(`🔌 ポート: ${port}`);
  console.log(`📊 プロセスID: ${process.pid}`);
  console.log(`⏰ 起動時刻: ${new Date().toISOString()}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 シャットダウンシグナル受信');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 中断シグナル受信');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕捉の例外:', error);
  // エラーが発生してもサーバーは動作し続ける
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  // エラーが発生してもサーバーは動作し続ける
});
