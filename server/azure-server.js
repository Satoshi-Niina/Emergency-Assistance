#!/usr/bin/env node

console.log('🚀 Starting Azure Emergency Assistance Server...');

// 基本的な依存関係の読み込み
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 8080;
const host = '0.0.0.0';

console.log('🔧 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  HOST: host
});

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_BASE_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// 基本的なミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// セッション設定
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'emergency-assistance-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
  }
}));

// ヘルスチェックエンドポイント
app.get(['/api/health', '/api/healthz', '/health', '/healthz', '/ping'], (req, res) => {
  console.log('🔍 Health check requested:', req.path);
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: port,
    host: host
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Emergency Assistance Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// セッション確認エンドポイント
app.get('/api/session/check', (req, res) => {
  if (req.session && req.session.userId) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
});

// 基本的な認証エンドポイント
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request received');
  const { login, email, password } = req.body || {};
  const id = login || email;
  
  if (!id || !password) {
    return res.status(400).json({
      success: false,
      error: 'ユーザー名とパスワードを入力してください'
    });
  }
  
  // ダミーログイン
  if (id === 'admin' && password === 'admin') {
    req.session.userId = 'admin';
    req.session.username = 'admin';
    req.session.role = 'admin';
    
    return res.status(200).json({
      success: true,
      user: {
        id: 'admin',
        username: 'admin',
        displayName: 'Administrator',
        role: 'admin'
      }
    });
  }
  
  res.status(401).json({
    success: false,
    error: '認証に失敗しました'
  });
});

app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Me request received');
  if (req.session && req.session.userId) {
    return res.status(200).json({
      success: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        displayName: req.session.displayName || req.session.username,
        role: req.session.role || 'employee'
      }
    });
  }
  
  res.status(401).json({
    success: false,
    error: '認証されていません'
  });
});

app.post('/api/auth/logout', (req, res) => {
  console.log('🔐 Logout request received');
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, error: 'ログアウトに失敗しました' });
    }
    res.status(200).json({ success: true, message: 'ログアウトしました' });
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// サーバー起動
const server = app.listen(port, host, () => {
  console.log('✅ Azure Emergency Assistance Server started successfully!');
  console.log(`🌐 Listening on ${host}:${port}`);
  console.log(`🔍 Health check: http://${host}:${port}/api/health`);
  console.log(`🔐 Login API: http://${host}:${port}/api/auth/login`);
  console.log('🚀 Server is ready to accept connections!');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.on('listening', () => {
  console.log('✅ Server is now listening for connections');
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
