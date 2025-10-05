#!/usr/bin/env node

// ローカル開発環境専用サーバー
// 簡単な認証とモックデータで動作
// データベース接続なしでも動作する

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🚀 Starting Local Development Server...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

const app = express();
const PORT = process.env.PORT || 8081;

// CORS設定（開発環境用）
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000'
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ローカル開発用のモックユーザーデータ
const mockUsers = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'admin', // 開発環境では平文パスワード
    role: 'admin',
    displayName: '管理者',
    display_name: '管理者',
    department: 'システム管理部'
  },
  {
    id: 'user-001', 
    username: 'user',
    password: 'user',
    role: 'user',
    displayName: '一般ユーザー',
    display_name: '一般ユーザー',
    department: '運用部'
  },
  {
    id: 'test-001',
    username: 'test',
    password: 'test',
    role: 'user',
    displayName: 'テストユーザー',
    display_name: 'テストユーザー',
    department: 'テスト部'
  }
];

// セッション管理（メモリ内）
const sessions = new Map();

// ===== API エンドポイント =====

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'development',
    port: PORT,
    database: 'mock',
    session: 'memory'
  });
});

// 詳細ヘルスチェック
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'development',
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: false,
      type: 'mock_data'
    },
    mockData: {
      users: mockUsers.length,
      sessions: sessions.size
    }
  });
});

// 認証エンドポイント（ローカル開発用 - 簡単な認証）
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    console.log('[auth/login] Local dev login attempt:', { 
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

    // モックユーザーから検索
    const foundUser = mockUsers.find(u => 
      u.username === username && u.password === password
    );

    if (!foundUser) {
      console.log('[auth/login] Invalid credentials for:', username);
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // セッション作成
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessions.set(sessionId, {
      userId: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
      createdAt: new Date()
    });

    console.log('[auth/login] Login successful:', { 
      username: foundUser.username, 
      role: foundUser.role,
      sessionId
    });

    res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        displayName: foundUser.displayName,
        display_name: foundUser.display_name,
        department: foundUser.department
      },
      sessionId,
      message: 'ログインに成功しました'
    });

  } catch (error) {
    console.error('[auth/login] Local dev login error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Login failed due to server error'
    });
  }
});

// 認証ハンドシェイク
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'development',
    env: 'development',
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報
app.get('/api/auth/me', (req, res) => {
  // 開発環境では常にadminユーザーを返す
  res.json({
    success: true,
    user: {
      id: 'admin-001',
      username: 'admin',
      role: 'admin',
      displayName: '管理者',
      display_name: '管理者',
      department: 'システム管理部'
    }
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

// ユーザー一覧（モックデータ）
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: mockUsers.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      department: user.department,
      createdAt: new Date().toISOString()
    })),
    message: 'ユーザー一覧を取得しました（ローカル開発用モックデータ）',
    timestamp: new Date().toISOString()
  });
});

// 機種一覧（モックデータ）
app.get('/api/machines/machine-types', (req, res) => {
  const mockMachineTypes = [
    { id: '1', name: 'ディーゼル機関車', type: 'locomotive' },
    { id: '2', name: '電車', type: 'train' },
    { id: '3', name: '保線機械', type: 'maintenance' },
    { id: '4', name: '信号機器', type: 'signal' },
    { id: '5', name: '軌道検測車', type: 'inspection' }
  ];

  res.json({
    success: true,
    data: mockMachineTypes,
    message: '機種一覧を取得しました（ローカル開発用モックデータ）'
  });
});

// ナレッジベース（モックデータ）
app.get('/api/knowledge-base', (req, res) => {
  const mockDocuments = [
    {
      id: 'doc1',
      name: '基本点検マニュアル',
      content: 'ディーゼル機関車の基本的な点検手順について説明します。',
      type: 'manual',
      createdAt: new Date(),
      size: 1024
    },
    {
      id: 'doc2', 
      name: '故障対応ガイド',
      content: '一般的な故障の対応方法について説明します。',
      type: 'guide',
      createdAt: new Date(),
      size: 2048
    }
  ];

  res.json({
    success: true,
    data: mockDocuments,
    total: mockDocuments.length,
    timestamp: new Date().toISOString()
  });
});

// 応急処置フロー（モックデータ）
app.get('/api/emergency-flow/list', (req, res) => {
  const mockFlows = [
    {
      id: 'flow1',
      name: 'エンジン停止時の対応',
      description: 'ディーゼル機関車のエンジンが停止した場合の応急処置手順',
      steps: [
        { id: 1, title: '安全確認', description: '周囲の安全を確認する' },
        { id: 2, title: '初期診断', description: '燃料・オイル・冷却水を確認' },
        { id: 3, title: '再始動試行', description: '手順に従って再始動を試行' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'flow2',
      name: 'ブレーキ不良時の対応',
      description: 'ブレーキシステムに異常がある場合の緊急対応',
      steps: [
        { id: 1, title: '緊急停止', description: '可能な限り安全に停止する' },
        { id: 2, title: '連絡・報告', description: '指令所へ緊急連絡' },
        { id: 3, title: '二次被害防止', description: '他の列車への影響を防ぐ' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  res.json({
    success: true,
    data: mockFlows,
    total: mockFlows.length,
    timestamp: new Date().toISOString()
  });
});

// データベース接続チェック（ローカル開発では常にfalse）
app.get('/api/db-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'ローカル開発環境ではモックデータを使用',
    details: {
      environment: 'development',
      database: 'mock_data',
      users: mockUsers.length,
      sessions: sessions.size
    },
    timestamp: new Date().toISOString()
  });
});

// ChatGPT API（ローカル開発用モック）
app.post('/api/chatgpt', (req, res) => {
  const { message } = req.body || {};
  
  res.json({
    success: true,
    response: `ローカル開発環境でのモック回答: "${message}" に対する回答です。実際のChatGPT APIは本番環境で利用できます。`,
    message: 'ローカル開発環境でのモック回答',
    details: {
      environment: 'development',
      mockResponse: true
    },
    timestamp: new Date().toISOString()
  });
});

// 環境情報
app.get('/api/_diag/env', (req, res) => {
  res.json({
    success: true,
    environment: 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '8081',
      LOCAL_DEV: 'true',
      API_BASE_URL: process.env.API_BASE_URL || 'not_set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'not_set'
    },
    mockData: {
      users: mockUsers.length,
      sessions: sessions.size,
      initialized: true
    },
    message: '環境変数情報（ローカル開発環境）',
    timestamp: new Date().toISOString()
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server (Local Development)',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: 'development',
    features: {
      mockAuth: true,
      mockData: true,
      database: false
    }
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Local Development Server Error:', err);
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
const host = '0.0.0.0';
app.listen(PORT, host, () => {
  console.log(`🚀 Local Development Server running on ${host}:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: development`);
  console.log(`📦 Node.js: ${process.version}`);
  console.log(`💻 Platform: ${process.platform}`);
  console.log('');
  console.log('📋 Available test users:');
  mockUsers.forEach(user => {
    console.log(`   - ${user.username}/${user.password} (${user.role})`);
  });
  console.log('');
  console.log('🔗 Frontend should connect to: http://localhost:5173');
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