#!/usr/bin/env node

// ローカル開発用サーバー
// シンプルで確実に動作する設定

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ローカル環境変数を読み込み
const localEnvPath = path.join(__dirname, '..', 'local.env');
console.log('🔍 Loading local environment from:', localEnvPath);
dotenv.config({ path: localEnvPath });

const app = express();
const PORT = process.env.PORT || 8000;

// CORS設定（ローカル開発用）
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// JSON解析
app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'local-development'
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
    message: 'Local development server - feature not implemented',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
