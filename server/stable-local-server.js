#!/usr/bin/env node

// 安定したローカル開発サーバー
// シンプルな実装で確実に動作

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

console.log('🚀 Starting stable local development server...');

// CORS設定
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    port: PORT,
    database: 'not_required',
    session: 'available'
  });
});

// 詳細ヘルスチェック
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ログイン認証（シンプル）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  
  console.log('🔐 Local login attempt:', { username, timestamp: new Date().toISOString() });
  
  if (username && password) {
    const userData = {
      id: 'local-' + username,
      username: username,
      role: username === 'admin' ? 'admin' : 'user',
      displayName: username === 'admin' ? '管理者' : 'ユーザー',
      display_name: username === 'admin' ? '管理者' : 'ユーザー',
      department: 'ローカル開発部'
    };
    
    console.log('✅ Local login successful:', userData);
    res.json({
      success: true,
      user: userData,
      message: 'ローカル開発環境でのログイン成功'
    });
  } else {
    console.log('❌ Local login failed: Missing credentials');
    res.status(400).json({
      success: false,
      error: 'missing_credentials',
      message: 'ユーザー名とパスワードが必要です'
    });
  }
});

// 認証ハンドシェイク
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'local-development',
    env: 'development',
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'local-admin',
      username: 'admin',
      role: 'admin',
      displayName: '管理者',
      display_name: '管理者',
      department: 'ローカル開発部'
    }
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  console.log('🔐 Local logout');
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

// ユーザー一覧（モックデータ）
app.get('/api/users', (req, res) => {
  const mockUsers = [
    {
      id: 'local-admin',
      username: 'admin',
      role: 'admin',
      displayName: '管理者',
      department: 'ローカル開発部',
      createdAt: new Date().toISOString()
    },
    {
      id: 'local-user',
      username: 'user',
      role: 'user',
      displayName: 'ユーザー',
      department: 'ローカル開発部',
      createdAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: mockUsers,
    message: 'ユーザー一覧（ローカル開発用モックデータ）',
    timestamp: new Date().toISOString()
  });
});

// 機種一覧（モックデータ）
app.get('/api/machines/machine-types', (req, res) => {
  const mockMachineTypes = [
    { id: '1', name: 'ディーゼル機関車', type: 'locomotive' },
    { id: '2', name: '電車', type: 'train' },
    { id: '3', name: '保線機械', type: 'maintenance' }
  ];

  res.json({
    success: true,
    data: mockMachineTypes,
    message: '機種一覧（ローカル開発用モックデータ）'
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

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'サーバーエラーが発生しました',
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stable Local Development Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`⚡ Server ready and stable!`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
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

console.log('✅ Server script loaded successfully');