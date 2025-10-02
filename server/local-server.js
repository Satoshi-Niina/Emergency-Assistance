#!/usr/bin/env node

// ローカル開発専用サーバー
// 本番環境との完全分離
// シンプルで確実に動作する設定

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ローカル環境変数を読み込み
const localEnvPath = path.join(__dirname, '..', 'local.env');
console.log('🔍 Loading local environment from:', localEnvPath);

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  console.log('✅ Local environment loaded');
} else {
  console.log('⚠️ local.env not found, using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8000;

// ローカル開発用のCORS設定
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
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

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    port: PORT,
    database: 'not_configured',
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
    memory: process.memoryUsage(),
    database: {
      connected: false,
      message: 'Local development mode - database not configured'
    },
    blobStorage: {
      configured: false,
      message: 'Local development mode - blob storage not configured'
    }
  });
});

// ログインエンドポイント（ローカル開発用）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('🔐 Local login attempt:', { 
    username, 
    hasPassword: !!password,
    timestamp: new Date().toISOString()
  });
  
  // ローカル開発用の認証（任意のユーザー名・パスワードでログイン可能）
  if (username && password) {
    const userData = {
      success: true,
      user: {
        id: 'local-user-' + Date.now(),
        username: username,
        displayName: username,
        display_name: username,
        role: username === 'admin' || username === 'niina' ? 'admin' : 'employee',
        department: 'IT部',
        authMethod: 'local-demo'
      },
      token: 'local-token-' + Date.now(),
      message: 'Local development login successful'
    };
    
    console.log('✅ Local login successful:', userData);
    res.json(userData);
  } else {
    console.log('❌ Local login failed: ユーザー名またはパスワードが不足');
    res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'Username and password required'
    });
  }
});

// 認証ハンドシェイク
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'local-development',
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'local-demo-user',
      username: 'demo',
      role: 'employee',
      displayName: 'Demo User'
    }
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました（ローカル開発）'
  });
});

// ユーザー一覧（ローカル開発用モックデータ）
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'local-admin-001', username: 'admin', role: 'admin', displayName: '管理者' },
      { id: 'local-niina-001', username: 'niina', role: 'admin', displayName: 'Niina' },
      { id: 'local-takabeni1-001', username: 'takabeni1', role: 'admin', displayName: 'Takabeni1' },
      { id: 'local-takabeni2-001', username: 'takabeni2', role: 'employee', displayName: 'Takabeni2' },
      { id: 'local-employee-001', username: 'employee', role: 'employee', displayName: '一般ユーザー' }
    ],
    message: 'ユーザー一覧を取得しました（ローカル開発モード）',
    timestamp: new Date().toISOString()
  });
});

// 機種一覧（ローカル開発用モックデータ）
app.get('/api/machines/machine-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'ディーゼル機関車', type: 'locomotive' },
      { id: '2', name: '電車', type: 'train' },
      { id: '3', name: '保線機械', type: 'maintenance' },
      { id: '4', name: '除雪車', type: 'snow_removal' },
      { id: '5', name: '信号機', type: 'signal' }
    ],
    message: '機種一覧を取得しました（ローカル開発モード）',
    timestamp: new Date().toISOString()
  });
});

// 機械番号一覧（ローカル開発用モックデータ）
app.get('/api/machines/machines', (req, res) => {
  const { type_id } = req.query;
  res.json({
    success: true,
    data: [
      { id: '1', machine_number: '001', type_id: type_id || '1', name: '機械001' },
      { id: '2', machine_number: '002', type_id: type_id || '1', name: '機械002' },
      { id: '3', machine_number: '003', type_id: type_id || '2', name: '機械003' }
    ],
    message: `機械番号一覧を取得しました（ローカル開発モード）: type_id=${type_id || 'none'}`,
    timestamp: new Date().toISOString()
  });
});

// ナレッジベース（ローカル開発用モックデータ）
app.get('/api/knowledge-base', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'local-doc-001',
        name: 'ディーゼル機関車の基本操作',
        content: 'ディーゼル機関車の基本的な操作方法について説明します。',
        type: 'document',
        createdAt: new Date().toISOString(),
        size: 1024
      },
      {
        id: 'local-doc-002', 
        name: '電車の故障対応',
        content: '電車で発生する一般的な故障とその対応方法について説明します。',
        type: 'document',
        createdAt: new Date().toISOString(),
        size: 2048
      }
    ],
    total: 2,
    message: 'ナレッジベースを取得しました（ローカル開発モード）',
    timestamp: new Date().toISOString()
  });
});

// 応急処置フロー（ローカル開発用モックデータ）
app.get('/api/emergency-flow/list', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'local-flow-001',
        name: '機関車エンジン停止時の対応',
        description: 'ディーゼル機関車のエンジンが停止した場合の応急処置フロー',
        steps: [
          { step: 1, action: '確認', description: 'エンジン停止の原因を確認する' },
          { step: 2, action: '点検', description: '燃料、オイル、冷却水を点検する' },
          { step: 3, action: '再起動', description: '安全確認後、エンジンを再起動する' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'local-flow-002',
        name: '電車のドア故障対応',
        description: '電車のドアが開かない場合の応急処置フロー',
        steps: [
          { step: 1, action: '確認', description: 'ドアの状態を確認する' },
          { step: 2, action: '手動操作', description: '手動でドアを開ける' },
          { step: 3, action: '点検', description: 'ドア機構を点検する' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    total: 2,
    message: '応急処置フロー一覧を取得しました（ローカル開発モード）',
    timestamp: new Date().toISOString()
  });
});

// データベース接続チェック（ローカル開発では無効）
app.get('/api/db-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'ローカル開発モード - データベース接続は無効です',
    details: {
      environment: 'local-development',
      database: 'not_configured',
      message: 'Local development mode - database not available'
    },
    timestamp: new Date().toISOString()
  });
});

// ChatGPT API（ローカル開発用モック）
app.post('/api/chatgpt', (req, res) => {
  const { text, useOnlyKnowledgeBase = false } = req.body;
  
  res.json({
    success: true,
    response: `ローカル開発モード: "${text || 'no text provided'}" に対するAI回答（モック）`,
    message: 'ChatGPT API（ローカル開発モック）',
    details: {
      inputText: text || 'no text provided',
      useOnlyKnowledgeBase: useOnlyKnowledgeBase,
      environment: 'local-development',
      mockResponse: true
    },
    timestamp: new Date().toISOString()
  });
});

// 環境情報
app.get('/api/_diag/env', (req, res) => {
  res.json({
    success: true,
    environment: 'local-development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '8000',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    database_pool_status: {
      initialized: false,
      message: 'Local development mode - database not configured'
    },
    message: '環境変数情報（ローカル開発）',
    timestamp: new Date().toISOString()
  });
});

// その他のAPIエンドポイント（ローカル開発用）
app.get('/api/*', (req, res) => {
  res.json({ 
    success: true,
    message: 'Local development server - feature not implemented',
    path: req.path,
    method: req.method,
    environment: 'local-development',
    timestamp: new Date().toISOString()
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server (Local Development)',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: 'local-development'
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Local Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Local development server error',
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

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Local Development Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`📊 Detailed health: http://localhost:${PORT}/api/health/detailed`);
});