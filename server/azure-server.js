#!/usr/bin/env node

console.info('[entry]', __filename);
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

// 認証安定化ルート
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    firstParty: !!process.env.COOKIE_DOMAIN,
    supportsToken: true
  });
});

app.post('/api/auth/cookie-probe', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isFirstParty = !!process.env.COOKIE_DOMAIN;
  
  res.cookie('auth-probe', 'test', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isFirstParty ? 'lax' : 'none',
    maxAge: 5000, // 5秒
    ...(isProduction && !isFirstParty && { partitioned: true })
  });
  
  res.status(204).send();
});

app.get('/api/auth/cookie-probe-check', (req, res) => {
  const cookieOk = !!req.cookies['auth-probe'];
  
  // プローブCookieを削除
  if (cookieOk) {
    res.clearCookie('auth-probe');
  }
  
  res.json({ cookieOk });
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    // セッションが有効な場合
    if (req.session?.userId) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ uid: req.session.userId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1d' });
      return res.json({ token });
    }
    
    // Bearerトークンが有効な場合
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        
        // 期限が15分未満の場合は新しいトークンを発行
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now < 900) { // 15分 = 900秒
          const newToken = jwt.sign({ uid: payload.uid }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1d' });
          return res.json({ token: newToken });
        }
        
        // まだ有効な場合は現在のトークンを返す
        return res.json({ token });
      } catch (jwtError) {
        // JWT無効
      }
    }
    
    // どちらも無効
    return res.status(401).json({ success: false, error: '認証が必要です' });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ success: false, error: 'リフレッシュエラー' });
  }
});

console.info('[auth] routes mounted: handshake, cookie-probe, refresh');

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
