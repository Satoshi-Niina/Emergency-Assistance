#!/usr/bin/env node

// Azure App Service専用サーバー（緊急デバッグ版）
// 503エラーの原因を特定するための診断機能を追加

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express app作成
const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Emergency Assistance Backend - Debug Mode Starting...');
console.log('📁 Working directory:', process.cwd());
console.log('📄 Main file:', __filename);
console.log('⏰ Start time:', new Date().toISOString());

// 環境変数の詳細ログ
console.log('🔍 Environment Variables Check:');
const criticalEnvs = [
  'NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 
  'FRONTEND_URL', 'STATIC_WEB_APP_URL', 'AZURE_STORAGE_CONNECTION_STRING'
];

criticalEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(`  ✅ ${env}: ${env.includes('SECRET') || env.includes('URL') || env.includes('CONNECTION') ? 'SET (hidden)' : value}`);
  } else {
    console.log(`  ❌ ${env}: NOT SET`);
  }
});

// 基本的なミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 全体的なエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// 強化されたCORS設定（Azure Static Web Apps対応）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Azure Static Web Apps用の明示的なCORS設定
  const allowedOrigins = [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080'
  ];
  
  console.log('🔍 CORS Request:', {
    method: req.method,
    origin: origin,
    path: req.path,
    userAgent: req.headers['user-agent']?.substring(0, 30) + '...'
  });
  
  // 常に Azure Static Web Apps のオリジンを許可
  if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('azurestaticapps.net'))) {
    res.header('Access-Control-Allow-Origin', origin || 'https://witty-river-012f39e00.1.azurestaticapps.net');
    console.log('✅ CORS: 許可されたオリジン:', origin);
  } else {
    // 開発/デバッグでは全てのオリジンを許可
    res.header('Access-Control-Allow-Origin', origin || '*');
    console.log('🔧 CORS: デバッグモードでオリジンを許可:', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires, Cookie, Set-Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Access-Control-Max-Age', '86400');
  
  // OPTIONSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    console.log('📋 OPTIONS プリフライト完了:', { origin, allowed: true });
    return res.status(200).end();
  }
  
  next();
});

// ヘルスチェック（簡易版）
app.get('/api/health', (req, res) => {
  console.log('📡 Health check request received');
  res.json({
    status: 'healthy',
    message: 'Emergency Assistance Backend is running (debug mode)',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'undefined',
    port: PORT,
    pid: process.pid
  });
});

// 詳細診断エンドポイント
app.get('/api/debug/env', (req, res) => {
  console.log('🔍 Environment debug request received');
  
  const envInfo = {};
  criticalEnvs.forEach(env => {
    const value = process.env[env];
    envInfo[env] = value ? 
      (env.includes('SECRET') || env.includes('URL') || env.includes('CONNECTION') ? 'SET (hidden)' : value) : 
      'NOT SET';
  });

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    environment: envInfo,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// システム情報
app.get('/api/debug/system', (req, res) => {
  console.log('💻 System debug request received');
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
      uptime: require('os').uptime(),
      loadavg: require('os').loadavg(),
      hostname: require('os').hostname()
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      execPath: process.execPath,
      argv: process.argv
    }
  });
});

// CORS テスト専用エンドポイント
app.options('/api/auth/login', (req, res) => {
  console.log('🔍 CORS Preflight for login endpoint');
  res.status(200).end();
});

// 最小限のログインエンドポイント（認証バイパス）
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt (bypass mode):', {
    username: req.body?.username,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
  });
  
  // CORS ヘッダーを明示的に再設定
  const origin = req.headers.origin;
  if (origin && origin.includes('azurestaticapps.net')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'https://witty-river-012f39e00.1.azurestaticapps.net');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // 最小限のテストレスポンス
  res.json({
    success: true,
    message: 'Debug mode - authentication bypassed',
    user: {
      id: 1,
      username: req.body?.username || 'debug-user',
      role: 'admin'
    },
    token: 'debug-token-' + Date.now(),
    timestamp: new Date().toISOString(),
    corsInfo: {
      origin: origin,
      allowedOrigin: res.getHeaders()['access-control-allow-origin']
    }
  });
});

// CORS 診断エンドポイント
app.get('/api/debug/cors', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔍 CORS診断リクエスト from:', origin);
  
  res.json({
    success: true,
    corsTest: {
      requestOrigin: origin,
      allowedOrigins: [
        'https://witty-river-012f39e00.1.azurestaticapps.net',
        'http://localhost:5173',
        'http://localhost:8080'
      ],
      responseHeaders: {
        'Access-Control-Allow-Origin': res.getHeaders()['access-control-allow-origin'],
        'Access-Control-Allow-Credentials': res.getHeaders()['access-control-allow-credentials'],
        'Access-Control-Allow-Methods': res.getHeaders()['access-control-allow-methods']
      }
    },
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 ハンドリング
app.use((req, res) => {
  console.log('🔍 404 Request:', req.method, req.url);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// サーバー開始
try {
  const server = app.listen(PORT, () => {
    console.log('✅ Server started successfully!');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
    console.log('📡 Available endpoints:');
    console.log('   GET /api/health - Health check');
    console.log('   GET /api/debug/env - Environment debug');
    console.log('   GET /api/debug/system - System debug');
    console.log('   POST /api/auth/login - Debug login');
    console.log('🎉 Ready to accept requests!');
  });

  server.on('error', (error) => {
    console.error('❌ Server Error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('❌ Stack:', error.stack);
  process.exit(1);
}