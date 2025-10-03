#!/usr/bin/env node

// 統合サーバー - フロントエンドとAPIを統合
// Docker環境で動作する統合サーバー

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
if (fs.existsSync(path.join(__dirname, '.env'))) {
  dotenv.config();
  console.log('📄 Loaded .env file');
} else {
  console.log('📄 Using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8080;

// データベース接続プール
let dbPool = null;

// データベース初期化
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing database connection...');
    
    const sslConfig = process.env.PG_SSL === 'require' 
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable' 
      ? false 
      : { rejectUnauthorized: false };
    
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    });

    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// データベース初期化
initializeDatabase();

// CORS設定
const corsOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイル配信（フロントエンド）
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// API ルート（既存のAPIロジックをここに統合）
// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// 基本的なAPIエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    api: 'running',
    timestamp: new Date().toISOString()
  });
});

// 認証API（実際の実装）
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // データベース認証
    if (dbPool) {
      const result = await dbPool.query(
        'SELECT id, username, password_hash, role FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      // JWTトークン生成
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );
      
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role },
        token
      });
    } else {
      // データベースなしの簡易認証
      if (username === 'admin' && password === 'admin') {
        const token = jwt.sign(
          { id: 1, username: 'admin', role: 'admin' },
          process.env.JWT_SECRET || 'default-secret',
          { expiresIn: '24h' }
        );
        
        res.json({ 
          success: true, 
          user: { id: 1, username: 'admin', role: 'admin' },
          token
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    res.json({ 
      success: true,
      user: { id: decoded.id, username: decoded.username, role: decoded.role }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// チャットAPI（簡易版）
app.post('/api/chatgpt', (req, res) => {
  const { message } = req.body;
  
  // 簡易レスポンス（実際の実装ではOpenAI APIを使用）
  res.json({
    response: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  });
});

// ナレッジベースAPI（簡易版）
app.get('/api/knowledge-base/*', (req, res) => {
  res.json({ 
    data: [],
    message: 'Knowledge base API placeholder'
  });
});

// SPAルーティング - すべての非APIリクエストをindex.htmlにリダイレクト
app.get('*', (req, res) => {
  // APIルートは除外
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // 静的ファイルが存在する場合はそれを返す
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // それ以外はSPAのindex.htmlを返す
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Assistance System running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
