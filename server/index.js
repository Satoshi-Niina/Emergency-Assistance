#!/usr/bin/env node

// Azure App Service 本番用サーバー - fallback-server.jsベース
// 外部依存関係なし、CommonJS使用でnode_modules問題を回避

const http = require('http');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 Emergency Assistance Server Starting (Production)');
console.log('📦 Node.js:', process.version);
console.log('📁 Working Directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');

// 本番用HTTPサーバー
const server = http.createServer((req, res) => {
  // CORS ヘッダー設定 - フロントエンド対応
  const allowedOrigins = [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONSリクエスト処理 (プリフライト)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ルーティング処理
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // ヘルスチェックエンドポイント
  if (pathname === '/api/health' || pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      message: 'Emergency Assistance Server is operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0-PRODUCTION',
      server: 'production-stable',
      nodeVersion: process.version,
      port: PORT,
      environment: process.env.NODE_ENV || 'production'
    }));
    return;
  }

  // ルートエンドポイント
  if (pathname === '/' || pathname === '/api') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'Emergency Assistance Server - Production',
      status: 'operational',
      endpoints: [
        'GET /api/health',
        'GET /api/ping',
        'POST /api/auth/login'
      ],
      timestamp: new Date().toISOString(),
      version: '1.0.0-PRODUCTION'
    }));
    return;
  }

  // Ping エンドポイント
  if (pathname === '/api/ping') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'pong',
      timestamp: new Date().toISOString(),
      server: 'production'
    }));
    return;
  }

  // 最小限のログインエンドポイント (緊急用)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Emergency authentication - please configure full server',
        user: { id: 1, username: 'emergency-user', role: 'admin' },
        token: 'emergency-token-' + Date.now(),
        timestamp: new Date().toISOString()
      }));
    });
    return;
  }

  // 404エラー
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(404);
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'Emergency server - limited endpoints available',
    availableEndpoints: ['/api/health', '/api/ping', '/api/auth/login'],
    timestamp: new Date().toISOString()
  }));
});

// サーバー起動
server.listen(PORT, HOST, () => {
  console.log(`🎉 Production Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log('✅ Emergency Assistance Server successfully started!');
});

// エラーハンドリング
server.on('error', (error) => {
  console.error('❌ Server failed to start:', error);
  console.error('❌ Error code:', error.code);
  console.error('❌ Error message:', error.message);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
});
