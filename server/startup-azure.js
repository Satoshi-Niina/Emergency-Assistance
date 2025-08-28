#!/usr/bin/env node

// Azure Web App用の確実な起動スクリプト
console.log('🚀 Azure Web App起動スクリプト開始');
console.log('📅 起動時刻:', new Date().toISOString());
console.log('🔧 Node.js バージョン:', process.version);
console.log('📁 作業ディレクトリ:', process.cwd());
console.log('🌍 環境変数 NODE_ENV:', process.env.NODE_ENV);
console.log('🔌 ポート:', process.env.PORT || process.env.WEBSITES_PORT || 8080);

const http = require('http');
const startTime = Date.now();

// 即座にヘルスチェックサーバーを起動
const server = http.createServer((req, res) => {
  const uptime = process.uptime();
  const responseTime = Date.now() - startTime;
  
  // CORSヘッダーを追加
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  
  res.end(JSON.stringify({
    status: 'running',
    uptime: uptime,
    responseTime: responseTime,
    timestamp: new Date().toISOString(),
    message: 'Azure Web App is running successfully',
    version: process.version,
    pid: process.pid,
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || process.env.WEBSITES_PORT || 8080
  }));
});

// 環境変数からポートを取得（Azure Web App用）
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// サーバー起動
server.listen(port, '0.0.0.0', () => {
  const startupTime = Date.now() - startTime;
  console.log(`✅ サーバー起動完了: ${startupTime}ms`);
  console.log(`🔌 ポート: ${port}`);
  console.log(`🌐 バインドアドレス: 0.0.0.0`);
  console.log(`📊 プロセスID: ${process.pid}`);
  console.log(`⏰ 起動時刻: ${new Date().toISOString()}`);
  
  // Azure Web Appの起動完了をログに記録
  console.log('🎉 Azure Web App起動完了！');
});

// エラーハンドリング
server.on('error', (error) => {
  console.error('❌ サーバーエラー:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('⚠️ ポートが既に使用中です:', port);
  }
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 シャットダウンシグナル受信 (SIGTERM)');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 中断シグナル受信 (SIGINT)');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

// 未処理のエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕捉の例外:', error);
  // エラーが発生してもサーバーは動作し続ける
  console.log('⚠️ サーバーは動作し続けます');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  // エラーが発生してもサーバーは動作し続ける
  console.log('⚠️ サーバーは動作し続けます');
});

// プロセス終了時の処理
process.on('exit', (code) => {
  console.log(`🔄 プロセス終了: ${code}`);
});

// 定期的なヘルスチェックログ
setInterval(() => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  console.log(`💓 ヘルスチェック - 稼働時間: ${uptime}s, メモリ: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
}, 60000); // 1分ごと
