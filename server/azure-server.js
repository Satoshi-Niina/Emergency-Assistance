#!/usr/bin/env node

// Azure App Service専用サーバー
// Linux環境で確実に動作する最小限のサーバー
// Updated: CORS configuration fixed for frontend-backend communication

import express from 'express';
import cors from 'cors';

const app = express();

// Azure App Service用のCORS設定
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178'
];

app.use(cors({
  origin: true, // 一時的にすべてのOriginを許可（デバッグ用）
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'Cookie'],
  optionsSuccessStatus: 200
}));

// プリフライトリクエストの明示的な処理
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: 'azure-production',
    platform: process.platform,
    uptime: process.uptime()
  });
});

// 詳細ヘルスチェック
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: 'azure-production',
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    arch: process.arch,
    pid: process.pid
  });
});

// 環境情報
app.get('/api/_diag/env', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: 'azure-production',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '8080',
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'unknown',
      WEBSITE_RESOURCE_GROUP: process.env.WEBSITE_RESOURCE_GROUP || 'unknown'
    }
  });
});

// 認証エンドポイント
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    console.log('[auth/login] Login attempt:', { 
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

    // デモユーザーの認証（本番環境用）
    const validUsers = {
      'admin': { role: 'admin', id: 'admin-001' },
      'niina': { role: 'admin', id: 'niina-001' },
      'takabeni1': { role: 'admin', id: 'takabeni1-001' },
      'takabeni2': { role: 'employee', id: 'takabeni2-001' },
      'employee': { role: 'employee', id: 'employee-001' }
    };

    const user = validUsers[username];
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // 成功レスポンス
    res.json({
      success: true,
      user: {
        id: user.id,
        username: username,
        role: user.role
      },
      message: 'ログインに成功しました'
    });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: '内部エラーが発生しました'
    });
  }
});

// ===== 重要なAPIエンドポイント（本番環境用） =====

// 機種・機械番号管理API
app.get('/api/machines/machine-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'ディーゼル機関車', type: 'locomotive' },
      { id: '2', name: '電車', type: 'train' },
      { id: '3', name: '保線機械', type: 'maintenance' }
    ],
    message: '機種一覧を取得しました'
  });
});

// 機械番号一覧API
app.get('/api/machines/machines', (req, res) => {
  const { type_id } = req.query;
  res.json({
    success: true,
    data: [
      { id: '1', machine_number: '001', type_id: type_id || '1', name: '機械001' },
      { id: '2', machine_number: '002', type_id: type_id || '1', name: '機械002' }
    ],
    message: '機械番号一覧を取得しました'
  });
});

// 全機械データ取得API
app.get('/api/machines/all-machines', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', machine_type: 'ディーゼル機関車', machine_number: '001', name: '機関車001' },
      { id: '2', machine_type: '電車', machine_number: '002', name: '電車002' }
    ],
    message: '全機械データを取得しました'
  });
});

// ユーザー管理API
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'admin-001', username: 'admin', role: 'admin', displayName: '管理者' },
      { id: 'niina-001', username: 'niina', role: 'admin', displayName: 'Niina' },
      { id: 'takabeni1-001', username: 'takabeni1', role: 'admin', displayName: 'Takabeni1' },
      { id: 'takabeni2-001', username: 'takabeni2', role: 'employee', displayName: 'Takabeni2' },
      { id: 'employee-001', username: 'employee', role: 'employee', displayName: '一般ユーザー' }
    ],
    message: 'ユーザー一覧を取得しました'
  });
});

// ナレッジベースAPI
app.get('/api/knowledge-base', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'ナレッジベースデータを取得しました（本番環境では空です）'
  });
});

// 応急処置フローAPI
app.get('/api/emergency-flow/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '応急処置フロー一覧を取得しました（本番環境では空です）'
  });
});

// ChatGPT API
app.post('/api/chatgpt', (req, res) => {
  res.json({
    success: true,
    response: 'AI支援機能は本番環境では利用できません。ローカル開発環境でご利用ください。',
    message: 'ChatGPT APIは本番環境では無効です'
  });
});

// 履歴管理API
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '履歴データを取得しました（本番環境では空です）'
  });
});

app.get('/api/history/machine-data', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '機械データ履歴を取得しました（本番環境では空です）'
  });
});

// RAG設定API
app.get('/api/settings/rag', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: false,
      message: 'RAG設定は本番環境では無効です'
    }
  });
});

// ストレージAPI
app.get('/api/storage/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'ストレージファイル一覧を取得しました（本番環境では空です）'
  });
});

// トラブルシューティングAPI
app.get('/api/troubleshooting/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'トラブルシューティング一覧を取得しました（本番環境では空です）'
  });
});

// チャット履歴保存API
app.post('/api/chat-history', (req, res) => {
  res.json({
    success: true,
    message: 'チャット履歴を保存しました（本番環境では無効です）'
  });
});

// データベース接続チェックAPI
app.get('/api/db-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'データベース接続チェック（本番環境では無効です）'
  });
});

// GPT接続チェックAPI
app.post('/api/gpt-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'GPT接続チェック（本番環境では無効です）'
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server (Azure)',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: 'azure-production'
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Azure Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Azure server error',
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

// Azure App Service用の起動設定
const port = process.env.PORT || 8080;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`🚀 Azure Server running on ${host}:${port}`);
  console.log(`📊 Health check: /api/health`);
  console.log(`🌍 Environment: azure-production`);
  console.log(`📦 Node.js: ${process.version}`);
  console.log(`💻 Platform: ${process.platform}`);
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

// 未処理の例外をキャッチ
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
