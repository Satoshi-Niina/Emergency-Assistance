#!/usr/bin/env node

/**
 * 最小限のAzure App Service用サーバー
 * - 必要最低限の機能のみ
 * - 外部依存を極力排除
 * - 確実な起動を保証
 */

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import session from 'express-session';

const app = express();

// 基本設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS設定
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// セッション設定（メモリストア - デモ用）
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret-key-for-testing',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'minimal-azure-server',
    environment: process.env.NODE_ENV || 'production'
  });
});

// テスト用ログインエンドポイント（固定ユーザー）
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { 
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const { username, password } = req.body;

    // バリデーション
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // テスト用固定ユーザー（実際のプロダクションでは削除）
    const testUsers = {
      'admin': {
        password: 'admin123',
        role: 'admin',
        display_name: 'システム管理者'
      },
      'user': {
        password: 'user123',
        role: 'user',
        display_name: 'テストユーザー'
      }
    };

    const user = testUsers[username];
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // セッションに保存
    req.session.user = {
      id: 1,
      username: username,
      role: user.role,
      display_name: user.display_name
    };

    console.log('✅ Login successful:', { username, role: user.role });

    res.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: 1,
        username: username,
        role: user.role,
        display_name: user.display_name
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'ログアウトに失敗しました'
      });
    }
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// 現在のユーザー情報取得
app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: '認証が必要です'
    });
  }
  
  res.json({
    success: true,
    user: req.session.user
  });
});

// その他のAPIエンドポイント（モック）
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, username: 'admin', role: 'admin', display_name: 'システム管理者' },
      { id: 2, username: 'user', role: 'user', display_name: 'テストユーザー' }
    ]
  });
});

// 404ハンドラー
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    server: 'minimal-azure-server'
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'サーバーエラーが発生しました',
    timestamp: new Date().toISOString(),
    server: 'minimal-azure-server'
  });
});

// サーバー起動
const port = process.env.PORT || 8080;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log('🚀 Minimal Azure Server started successfully!');
  console.log(`📍 Server: http://${host}:${port}`);
  console.log(`🏥 Health check: http://${host}:${port}/api/health`);
  console.log(`🔐 Test login: admin/admin123 or user/user123`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});