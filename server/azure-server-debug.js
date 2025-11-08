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

// 基本的なCORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
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

// 最小限のログインエンドポイント（認証バイパス）
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt (bypass mode):', req.body?.username);
  
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