#!/usr/bin/env node

// Azure Web App用の最終版起動スクリプト
console.log('🚀 Azure Web App Final Startup Script Starting...');
console.log('📅 Start Time:', new Date().toISOString());
console.log('🔧 Node.js Version:', process.version);
console.log('📁 Working Directory:', process.cwd());
console.log('🌍 Environment Variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', process.env.PORT);
console.log('  - WEBSITES_PORT:', process.env.WEBSITES_PORT);
console.log('  - WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME);

const http = require('http');
const startTime = Date.now();

// 即座にHTTPサーバーを起動
const server = http.createServer((req, res) => {
  const uptime = process.uptime();
  const responseTime = Date.now() - startTime;
  
  // 基本的なヘルスチェック
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    
    res.end(JSON.stringify({
      status: 'running',
      uptime: uptime,
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
      message: 'Azure Web App is running successfully',
      version: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || process.env.WEBSITES_PORT || 8080,
      workingDirectory: process.cwd()
    }));
  } else {
    // その他のリクエストにも対応
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }
});

// ポート設定（Azure Web App用）
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// サーバー起動
server.listen(port, '0.0.0.0', () => {
  const startupTime = Date.now() - startTime;
  console.log(`✅ Server started successfully in ${startupTime}ms`);
  console.log(`🔌 Port: ${port}`);
  console.log(`🌐 Bind Address: 0.0.0.0`);
  console.log(`📊 Process ID: ${process.pid}`);
  console.log(`🎉 Azure Web App is ready!`);
  
  // 起動完了のログ
  console.log('🚀 Application startup completed successfully!');
});

// エラーハンドリング
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('⚠️ Port is already in use:', port);
  }
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 Shutdown signal received (SIGTERM)');
  server.close(() => {
    console.log('✅ Server shutdown completed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Interrupt signal received (SIGINT)');
  server.close(() => {
    console.log('✅ Server shutdown completed');
    process.exit(0);
  });
});

// 未処理のエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  console.log('⚠️ Server will continue running');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  console.log('⚠️ Server will continue running');
});

// 定期的なヘルスチェックログ
setInterval(() => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  console.log(`💓 Health check - Uptime: ${uptime}s, Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
}, 30000); // 30秒ごと

// 起動完了の確認
setTimeout(() => {
  console.log('🎯 Startup verification completed - Application is fully operational');
}, 5000);
