#!/usr/bin/env node

// Azure App Service専用サーバー
// Linux環境で確実に動作する最小限のサーバー
// Updated: CORS configuration fixed for frontend-backend communication

import express from 'express';
import cors from 'cors';

const app = express();

// Azure App Service用のCORS設定
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178'
];

app.use(cors({
  origin: true, // 一時的にすべてのOriginを許可（デバッグ用）
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'Cookie'],
  optionsSuccessStatus: 200
}));

// プリフライトリクエストの明示的な処理
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: 'azure-production',
    platform: process.platform,
    uptime: process.uptime()
  });
});

// 詳細ヘルスチェック
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: 'azure-production',
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    arch: process.arch,
    pid: process.pid
  });
});

// 環境情報
app.get('/api/_diag/env', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: 'azure-production',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '8080',
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'unknown',
      WEBSITE_RESOURCE_GROUP: process.env.WEBSITE_RESOURCE_GROUP || 'unknown'
    }
  });
});

// 認証エンドポイント
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    console.log('[auth/login] Login attempt:', { 
      username, 
      timestamp: new Date().toISOString()
    });
    
    // 入力検証
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // デモユーザーの認証（本番環境用）
    const validUsers = {
      'admin': { role: 'admin', id: 'admin-001' },
      'niina': { role: 'admin', id: 'niina-001' },
      'takabeni1': { role: 'admin', id: 'takabeni1-001' },
      'takabeni2': { role: 'employee', id: 'takabeni2-001' },
      'employee': { role: 'employee', id: 'employee-001' }
    };

    const user = validUsers[username];
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // 成功レスポンス
    res.json({
      success: true,
      user: {
        id: user.id,
        username: username,
        role: user.role
      },
      message: 'ログインに成功しました'
    });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: '内部エラーが発生しました'
    });
  }
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server (Azure)',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: 'azure-production'
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Azure Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Azure server error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Azure App Service用の起動設定
const port = process.env.PORT || 8080;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`🚀 Azure Server running on ${host}:${port}`);
  console.log(`📊 Health check: /api/health`);
  console.log(`🌍 Environment: azure-production`);
  console.log(`📦 Node.js: ${process.version}`);
  console.log(`💻 Platform: ${process.platform}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
