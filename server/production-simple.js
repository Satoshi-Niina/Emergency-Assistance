#!/usr/bin/env node

// 本番環境用サーバー（Azure App Service）
// シンプルで確実に動作する設定

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8080;

// CORS設定（本番用）
const allowedOrigins = [
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173' // 開発用
];

app.use(cors({
  origin: (origin, callback) => {
    // Originが設定されていない場合（Postman等の直接リクエスト）は許可
    if (!origin) return callback(null, true);
    
    // 許可されたOriginかチェック
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // その他のOriginは拒否
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
}));

// JSON解析
app.use(express.json());

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS環境ではtrue
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    port: PORT
  });
});

// ログインエンドポイント（管理者・一般ユーザー対応）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // デモユーザーデータベース
  const users = {
    'admin': { id: 'admin', username: 'admin', role: 'admin', password: 'admin123' },
    'manager': { id: 'manager', username: 'manager', role: 'manager', password: 'manager123' },
    'user': { id: 'user', username: 'user', role: 'user', password: 'user123' }
  };
  
  // ユーザー認証
  const user = users[username];
  if (user && user.password === password) {
    // セッションにユーザー情報を保存
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    // JWTトークンも生成
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-jwt-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token: token,
      message: `Login successful as ${user.role}`
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// ユーザー情報取得エンドポイント
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    } else {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    }
  });
});

// その他のAPIエンドポイント（デモ用）
app.get('/api/*', (req, res) => {
  res.json({ 
    message: 'Production server - feature not implemented',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
