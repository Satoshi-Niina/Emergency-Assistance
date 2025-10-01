#!/usr/bin/env node

// 本番環境用サーバー（Azure App Service）
// シンプルで確実に動作する設定

import express from 'express';
import cors from 'cors';

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

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    port: PORT
  });
});

// ログインエンドポイント（デモ用）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // デモログイン（任意のユーザー名・パスワードでログイン可能）
  if (username && password) {
    res.json({
      success: true,
      user: {
        id: 'demo-user',
        username: username,
        authMethod: 'demo'
      },
      message: 'Demo login successful'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }
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
