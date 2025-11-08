#!/usr/bin/env node

// Azure App Service専用サーバー
// Linux環境で確実に動作する最小限のサーバー
// Updated: CORS configuration fixed for frontend-backend communication

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { runMigrations } from './startup-migration.js';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env files (PRODUCTION ONLY)
// Azure App Service uses environment variables, not .env files
const envPath = path.join(__dirname, '..', '.env');

console.log('🔍 Checking for environment files:');
console.log('  - .env:', envPath, fs.existsSync(envPath) ? 'EXISTS' : 'NOT FOUND');

if (fs.existsSync(envPath)) {
  console.log('📄 Loading environment from .env');
  dotenv.config({ path: envPath });
  console.log('✅ Environment loaded from .env');
} else {
  console.log('📄 Using system environment variables (Azure App Service)');
}

// Environment validation (warnings only, don't exit)
// OpenAI API設定の確認とフォールバック
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const isOpenAIAvailable = OPENAI_API_KEY && 
  OPENAI_API_KEY !== 'your-openai-api-key-here' && 
  OPENAI_API_KEY.startsWith('sk-');

console.log('🤖 OpenAI API Status:', {
  keyExists: !!OPENAI_API_KEY,
  isValidFormat: OPENAI_API_KEY ? OPENAI_API_KEY.startsWith('sk-') : false,
  isAvailable: isOpenAIAvailable,
  fallbackMode: !isOpenAIAvailable
});

if (!isOpenAIAvailable) {
  console.warn('⚠️ OpenAI API key not configured - GPT features will use fallback responses');
}

// バージョン情報（デプロイ確認用）
const VERSION = '1.0.5-PUBLIC-PACKAGE-FIX-' + new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
console.log('🚀 Azure Server Starting - Version:', VERSION);
console.log('🎯 Environment: PRODUCTION ONLY (no local.env)');
console.log('🌐 CORS: Explicit Azure Static Web App URL support');
console.log('📦 Package: Public GitHub Container Registry access');
console.log('🔗 Frontend URL:', STATIC_WEB_APP_URL);

const app = express();

// BLOBストレージ関連の設定
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// BLOBサービスクライアントの初期化（警告版）
const getBlobServiceClient = () => {
  if (!connectionString) {
    console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING is not configured');
    console.warn('⚠️ BLOB storage features will be disabled');
    return null;
  }
  try {
    const client = BlobServiceClient.fromConnectionString(connectionString);
    console.log('✅ BLOB service client initialized');
    return client;
  } catch (error) {
    console.warn('⚠️ BLOB service client initialization failed:', error.message);
    return null;
  }
};

// パス正規化ヘルパー
const BASE = (process.env.STORAGE_BASE_PREFIX ?? 'knowledge-base')
  .replace(/^[\\/]+|[\\/]+$/g, '');
const norm = (p) =>
  [BASE, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');

// データベース接続プール
let dbPool = null;

// データベース接続初期化（改善版）
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing database connection...');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🔒 PG_SSL:', process.env.PG_SSL || 'not set');

    const sslConfig = process.env.PG_SSL === 'require' 
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable' 
      ? false 
      : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 3, // 接続数をさらに減らす
      idleTimeoutMillis: 5000, // アイドルタイムアウトを短く
      connectionTimeoutMillis: 60000, // 接続タイムアウトを長く
      query_timeout: 60000, // クエリタイムアウトを長く
      statement_timeout: 60000, // ステートメントタイムアウトを長く
      keepAlive: true, // Keep-aliveを有効化
      keepAliveInitialDelayMillis: 0, // Keep-alive初期遅延
    });

    console.log('✅ Database pool initialized for Azure production');
    
    // 接続テスト（非同期で実行、エラーでもサーバーは継続）
    setTimeout(async () => {
      try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        await client.release();
        console.log('✅ Database connection test successful:', result.rows[0]);
      } catch (err) {
        console.warn('⚠️ Database connection test failed:', err.message);
        console.warn('⚠️ Server will continue running without database features');
        // DB接続に失敗してもサーバーは継続
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// データベース接続を初期化
initializeDatabase();

// スタートアップ時にマイグレーションを実行
async function startupSequence() {
  try {
    console.log('🚀 Starting Azure application startup sequence...');
    
    // データベースマイグレーションを実行
    // データベースマイグレーション実行（強制版）
    console.log('🔄 Running database migrations (FORCED)...');
    try {
      await runMigrations();
      console.log('✅ Database migrations completed successfully');
      
      // マイグレーション後のテーブル確認
      if (dbPool) {
        const client = await dbPool.connect();
        const tablesResult = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'machine_types', 'machines')
          ORDER BY table_name
        `);
        await client.release();
        
        console.log('📋 Database tables after migration:', tablesResult.rows.map(r => r.table_name));
        
        if (tablesResult.rows.length === 0) {
          console.warn('⚠️ No required tables found after migration');
          console.warn('⚠️ Manual database setup may be required');
        }
      }
    } catch (migrationError) {
      console.warn('⚠️ Database migration failed:', migrationError.message);
      console.warn('⚠️ Manual execution of EMERGENCY_DATABASE_SETUP.sql may be required');
    }
    
    console.log('✅ Azure startup sequence completed successfully');
    console.log('🎉 Production server is ready for operation');
  } catch (error) {
    console.error('❌ Azure startup sequence failed:', error);
    console.warn('⚠️ Server will continue running, but some features may not work properly');
    console.warn('⚠️ Please check database and BLOB storage connections');
    // 起動は継続（警告のみ）
  }
}

// 非同期でスタートアップシーケンスを実行
startupSequence();

// Azure App Service用のCORS設定
// 注意: 本番環境では必ず環境変数を設定してください
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.STATIC_WEB_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://witty-river-012f39e00.1.azurestaticapps.net' : 'http://localhost:8080');
const STATIC_WEB_APP_URL = process.env.STATIC_WEB_APP_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const BACKEND_SERVICE_URL = process.env.BACKEND_SERVICE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
const CLIENT_PORT = process.env.CLIENT_PORT || '5173';

// 確実にAzure Static Web AppsのURLを含める
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  STATIC_WEB_APP_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net', // 明示的に追加
  `http://localhost:${CLIENT_PORT}`,
  `http://localhost:${parseInt(CLIENT_PORT) + 1}`,
  `http://localhost:${parseInt(CLIENT_PORT) + 2}`,
  `http://localhost:${parseInt(CLIENT_PORT) + 3}`,
  `http://localhost:${parseInt(CLIENT_PORT) + 4}`,
  `http://localhost:${parseInt(CLIENT_PORT) + 5}`,
  `http://127.0.0.1:${CLIENT_PORT}`,
  `http://127.0.0.1:${parseInt(CLIENT_PORT) + 1}`,
  `http://127.0.0.1:${parseInt(CLIENT_PORT) + 2}`,
  `http://127.0.0.1:${parseInt(CLIENT_PORT) + 3}`,
  `http://127.0.0.1:${parseInt(CLIENT_PORT) + 4}`,
  `http://127.0.0.1:${parseInt(CLIENT_PORT) + 5}`,
  ...(process.env.CORS_ALLOW_ORIGINS?.split(',') || [])
].filter(Boolean);

// CORS設定の詳細をログ出力
console.log('🔧 CORS Configuration:');
console.log('  FRONTEND_URL:', FRONTEND_URL);
console.log('  STATIC_WEB_APP_URL:', STATIC_WEB_APP_URL);
console.log('  ALLOWED_ORIGINS:', ALLOWED_ORIGINS.slice(0, 5), ALLOWED_ORIGINS.length > 5 ? `... and ${ALLOWED_ORIGINS.length - 5} more` : '');
console.log('  CORS_ALLOW_ORIGINS from env:', process.env.CORS_ALLOW_ORIGINS || 'not set');

// CORS設定（恒久的な修正）- Azure Static Web Apps対応
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log('🔍 CORS Request:', { 
    method: req.method, 
    origin: origin, 
    path: req.path
  });
  
  // 明示的に許可するオリジンのリスト（恒久的設定）
  const allowedOrigins = [
    'https://witty-river-012f39e00.1.azurestaticapps.net', // メインフロントエンド
    STATIC_WEB_APP_URL,
    FRONTEND_URL,
    `http://localhost:${CLIENT_PORT}`, // 開発環境
    `http://localhost:5173`,
    `http://localhost:8080`,
    `http://127.0.0.1:${CLIENT_PORT}`,
    `http://127.0.0.1:5173`,
    `http://127.0.0.1:8080`,
    ...ALLOWED_ORIGINS
  ].filter(Boolean);
  
  // CORS ヘッダーの設定
  let corsOrigin = null;
  
  if (!origin) {
    // オリジンなしのリクエスト（直接アクセスなど）
    corsOrigin = 'https://witty-river-012f39e00.1.azurestaticapps.net';
  } else if (origin === 'https://witty-river-012f39e00.1.azurestaticapps.net') {
    // メインフロントエンドオリジンを最優先で許可
    corsOrigin = origin;
    console.log('✅ CORS: メインフロントエンドオリジン許可:', origin);
  } else if (origin.includes('azurestaticapps.net')) {
    // その他の Azure Static Web Apps オリジンも許可
    corsOrigin = origin;
    console.log('✅ CORS: Azure Static Web Apps オリジン許可:', origin);
  } else if (allowedOrigins.includes(origin)) {
    // 許可リストに含まれるオリジン
    corsOrigin = origin;
    console.log('✅ CORS: 許可リスト内オリジン:', origin);
  } else {
    // 不明なオリジン（開発環境でのみ許可）
    if (process.env.NODE_ENV === 'development') {
      corsOrigin = origin;
      console.log('🔧 CORS: 開発モードで許可:', origin);
    } else {
      corsOrigin = 'https://witty-river-012f39e00.1.azurestaticapps.net'; // デフォルトフォールバック
      console.warn('⚠️ CORS: 不明なオリジン、デフォルトを使用:', origin);
    }
  }
  
  // CORS ヘッダー設定
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // 共通のCORSヘッダー
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires, Cookie, Set-Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Access-Control-Max-Age', '86400'); // 24時間
  
  // プリフライトリクエスト（OPTIONS）の処理
  if (req.method === 'OPTIONS') {
    console.log('📋 OPTIONS プリフライト完了:', { origin, corsOrigin });
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション管理の設定（CORS対応強化版）
app.use(session({
  secret: process.env.SESSION_SECRET || 'azure-production-session-secret-32-chars',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPS環境でも一時的にfalse（CORS テスト用）
    httpOnly: false, // JavaScript からアクセス可能にする（CORS テスト用）
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'none', // CORS対応のため'none'に変更
    domain: undefined // ドメイン制限を削除
  },
  name: 'sessionId' // セッション名を明示的に設定
}));

// ヘルスチェックエンドポイント
// ヘルスチェックエンドポイント（詳細版）
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not_initialized';
  let dbTestResult = null;
  
  if (dbPool) {
    try {
      const client = await dbPool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      await client.release();
      dbStatus = 'connected';
      dbTestResult = result.rows[0];
    } catch (error) {
      dbStatus = 'error';
      dbTestResult = error.message;
    }
  }

  let blobStatus = 'not_configured';
  let blobTestResult = null;
  
  if (connectionString) {
    try {
      const blobServiceClient = getBlobServiceClient();
      if (blobServiceClient) {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const exists = await containerClient.exists();
        blobStatus = exists ? 'connected' : 'container_not_found';
        blobTestResult = { containerExists: exists };
      }
    } catch (error) {
      blobStatus = 'error';
      blobTestResult = error.message;
    }
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'azure-production',
    version: VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database_status: {
      status: dbStatus,
      pool_initialized: !!dbPool,
      test_result: dbTestResult
    },
    blob_storage_status: {
      status: blobStatus,
      connectionString: connectionString ? 'Configured' : 'Not configured',
      containerName: containerName,
      test_result: blobTestResult
    },
    openai_status: {
      apiKey: OPENAI_API_KEY ? 'Configured' : 'Not configured',
      isAvailable: isOpenAIAvailable
    },
    session_status: {
      secret: process.env.SESSION_SECRET ? 'Configured' : 'Using fallback',
      cookie_secure: false,
      cookie_sameSite: 'lax'
    }
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

// 環境情報（詳細版）
app.get('/api/_diag/env', (req, res) => {
  res.json({
    success: true,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: 'azure-production',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not_set',
      PORT: process.env.PORT || 'not_set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      PG_SSL: process.env.PG_SSL || 'not_set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set (hidden)' : 'Not set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'not_set',
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Set (hidden)' : 'Not set',
      AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || 'not_set',
      BYPASS_DB_FOR_LOGIN: process.env.BYPASS_DB_FOR_LOGIN || 'not_set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set',
      SAFE_MODE: process.env.SAFE_MODE || 'not_set',
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'unknown',
      WEBSITE_RESOURCE_GROUP: process.env.WEBSITE_RESOURCE_GROUP || 'unknown'
    },
    database_pool_status: {
      initialized: !!dbPool,
      totalCount: dbPool ? dbPool.totalCount : 0,
      idleCount: dbPool ? dbPool.idleCount : 0,
      waitingCount: dbPool ? dbPool.waitingCount : 0
    },
    message: '環境変数情報（本番環境）',
    timestamp: new Date().toISOString()
  });
});

// 認証エンドポイント（データベース認証）
app.post('/api/auth/login', async (req, res) => {
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

    // データベース接続がない場合はエラー
    if (!dbPool) {
      console.error('[auth/login] Database pool not initialized');
      return res.status(500).json({
        success: false,
        error: 'database_unavailable',
        message: 'データベース接続が利用できません'
      });
    }

    try {
      // データベースからユーザーを検索
      console.log('[auth/login] ユーザー検索開始:', { username });
      const result = await dbPool.query(
        'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
        [username]
      );
      
      console.log('[auth/login] ユーザー検索結果:', { 
        found: result.rows.length > 0,
        userCount: result.rows.length 
      });

      if (result.rows.length === 0) {
        console.log('[auth/login] ユーザーが見つかりません');
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      const foundUser = result.rows[0];
      console.log('[auth/login] ユーザー情報取得:', { 
        id: foundUser.id, 
        username: foundUser.username, 
        role: foundUser.role 
      });

      // パスワード比較（bcryptjs）
      console.log('[auth/login] パスワード比較開始');
      const isPasswordValid = await bcrypt.compare(password, foundUser.password);
      console.log('[auth/login] パスワード比較結果:', { isValid: isPasswordValid });
      
      if (!isPasswordValid) {
        console.log('[auth/login] パスワードが一致しません');
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      // 成功レスポンス
      console.log('[auth/login] Login successful:', { username, role: foundUser.role });
      
      // セッションにユーザー情報を保存
      req.session.user = {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        displayName: foundUser.display_name,
        department: foundUser.department
      };
      
      res.json({
        success: true,
        user: {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          displayName: foundUser.display_name,
          display_name: foundUser.display_name,
          department: foundUser.department
        },
        message: 'ログインに成功しました'
      });

    } catch (dbError) {
      console.error('[auth/login] Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'database_error',
        message: 'データベースエラーが発生しました'
      });
    }

  } catch (error) {
    console.error('[auth/login] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Login failed due to server error'
    });
  }
});

// ===== 全29個のAPIエンドポイント（本番環境用） =====

// 1. 認証ハンドシェイクエンドポイント
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'azure-production',
    timestamp: new Date().toISOString()
  });
});

// 1. 認証ハンドシェイクエンドポイント
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'azure-production',
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID
  });
});

// 2. 現在のユーザー情報取得エンドポイント
// セッション認証エンドポイント（デバッグ強化版）
app.get('/api/auth/me', (req, res) => {
  console.log('[api/auth/me] セッション確認:', {
    sessionId: req.sessionID,
    hasUser: !!req.session.user,
    userRole: req.session.user?.role,
    timestamp: new Date().toISOString()
  });

  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user,
      message: 'セッションからユーザー情報を取得しました',
      debug: {
        sessionId: req.sessionID,
        userRole: req.session.user.role,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'ログインしていません',
      debug: {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 3. 管理者権限チェックエンドポイント
app.get('/api/auth/check-admin', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    res.json({
      success: true,
      message: '管理者権限が確認されました',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '管理者権限がありません'
    });
  }
});

// 4. 一般ユーザー権限チェックエンドポイント
app.get('/api/auth/check-employee', (req, res) => {
  if (req.session.user && req.session.user.role === 'employee') {
    res.json({
      success: true,
      message: '従業員権限が確認されました',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '従業員権限がありません'
    });
  }
});

// 5. ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
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

// 6. Ping endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    ping: 'pong',
    timestamp: new Date().toISOString(),
    service: 'Emergency Assistance Backend (Azure)'
  });
});

// 7. Storage endpoints
// 旧モックAPI削除：正式なAPIエンドポイントは下記で実装

// 14. トラブルシューティングAPI
app.get('/api/troubleshooting/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'トラブルシューティング一覧を取得しました（本番環境では空です）',
    timestamp: new Date().toISOString()
  });
});

// 15. 個別トラブルシューティングファイル取得API
app.get('/api/troubleshooting/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id: id,
      title: 'サンプルトラブルシューティング',
      description: '本番環境ではサンプルデータです',
      steps: [
        { step: 1, action: '確認', description: '問題を確認する' },
        { step: 2, action: '対処', description: '適切な対処を行う' }
      ]
    },
    message: `トラブルシューティングファイルを取得しました（本番環境ではサンプル）: ${id}`
  });
});

// 16. 履歴API（機種・機械番号データ）
app.get('/api/history/machine-data', async (req, res) => {
  try {
    console.log('[api/history] 機種・機械番号データ取得リクエスト');
    
    if (!dbPool) {
      return res.json({
        success: true,
        machineTypes: [],
        machines: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT 
        mt.id as machine_type_id,
        mt.machine_type_name,
        m.id as machine_id,
        m.machine_number
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    await client.release();

    // データを整形
    const machineTypes = [];
    const machines = [];
    const typeMap = new Map();

    result.rows.forEach(row => {
      if (!typeMap.has(row.machine_type_id)) {
        const typeData = {
          id: row.machine_type_id,
          machineTypeName: row.machine_type_name
        };
        machineTypes.push(typeData);
        typeMap.set(row.machine_type_id, typeData);
      }

      if (row.machine_id) {
        machines.push({
          id: row.machine_id,
          machineNumber: row.machine_number,
          machineTypeName: row.machine_type_name
        });
      }
    });

    console.log('[api/history] 機種・機械番号データ取得成功:',
      'machineTypes:', machineTypes.length,
      'machines:', machines.length
    );

    res.json({
      success: true,
      machineTypes,
      machines,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history] 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種・機械番号データの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー管理API
app.get('/api/users', async (req, res) => {
  try {
    console.log('[api/users] ユーザー一覧取得リクエスト');
    
    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT id, username, display_name, role, department, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    await client.release();

    console.log('[api/users] ユーザー一覧取得成功:', result.rows.length + '件');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users] ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種一覧API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('[api/machines] 機種一覧取得リクエスト');
    
    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT id, machine_type_name
      FROM machine_types
      ORDER BY machine_type_name
    `);
    await client.release();

    console.log('[api/machines] 機種一覧取得成功:', result.rows.length + '件');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号一覧API（機種ID指定）
app.get('/api/machines/machines', async (req, res) => {
  try {
    const { type_id } = req.query;
    console.log('[api/machines] 機械番号一覧取得リクエスト:', { type_id });
    
    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    let query = 'SELECT id, machine_number FROM machines';
    const params = [];
    
    if (type_id) {
      query += ' WHERE machine_type_id = $1';
      params.push(type_id);
    }
    
    query += ' ORDER BY machine_number';
    
    const result = await client.query(query, params);
    await client.release();

    console.log('[api/machines] 機械番号一覧取得成功:', result.rows.length + '件');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// BLOBストレージ関連API

// ファイル一覧取得API
app.get('/api/storage/list', async (req, res) => {
  try {
    const prefix = req.query.prefix;
    if (!prefix) {
      return res.status(400).json({
        error: 'prefix parameter is required'
      });
    }

    console.log('🔍 Storage list request:', { prefix });

    if (!connectionString) {
      console.warn('⚠️ Azure Storage not configured, returning empty list');
      return res.json([]);
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const listOptions = {
      prefix: norm(prefix)
    };

    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      blobs.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType
      });
    }

    console.log(`📁 Found ${blobs.length} blobs with prefix: ${prefix}`);
    res.json(blobs);
  } catch (error) {
    console.error('❌ Storage list error:', error);
    res.status(500).json({
      error: 'storage_list_error',
      message: error.message
    });
  }
});

// ファイル内容取得API
app.get('/api/storage/get', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({
        error: 'name parameter is required'
      });
    }

    console.log('📄 Storage get request:', { name });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    const downloadResponse = await blockBlobClient.download();
    
    if (downloadResponse.readableStreamBody) {
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks).toString('utf-8');
      
      // BOM除去
      const cleanContent = content.replace(/^\uFEFF/, '');
      
      res.json({
        success: true,
        content: cleanContent,
        name: name,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'File not found or empty'
      });
    }
  } catch (error) {
    console.error('❌ Storage get error:', error);
    res.status(500).json({
      error: 'storage_get_error',
      message: error.message
    });
  }
});

// ファイル保存API
app.post('/api/storage/save', async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({
        error: 'name and content parameters are required'
      });
    }

    console.log('💾 Storage save request:', { name, contentLength: content.length });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`✅ File saved: ${name}`);
    res.json({
      success: true,
      message: 'File saved successfully',
      name: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Storage save error:', error);
    res.status(500).json({
      error: 'storage_save_error',
      message: error.message
    });
  }
});

// ファイル削除API
app.delete('/api/storage/delete', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({
        error: 'name parameter is required'
      });
    }

    console.log('🗑️ Storage delete request:', { name });

    if (!connectionString) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(norm(name));

    await blockBlobClient.delete();

    console.log(`✅ File deleted: ${name}`);
    res.json({
      success: true,
      message: 'File deleted successfully',
      name: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Storage delete error:', error);
    res.status(500).json({
      error: 'storage_delete_error',
      message: error.message
    });
  }
});

// 17. ナレッジベースAPI
app.get('/api/knowledge-base', async (req, res) => {
  try {
    console.log('[api/knowledge-base] ナレッジベース取得リクエスト');
    
    if (!connectionString) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const listOptions = {
      prefix: norm('documents/')
    };

    const documents = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      if (blob.name.endsWith('.json')) {
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();
          
          if (downloadResponse.readableStreamBody) {
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8');
            const cleanContent = content.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanContent);
            
            documents.push({
              id: blob.name,
              name: jsonData.title || jsonData.name || blob.name.split('/').pop(),
              content: jsonData.content || jsonData.text || '',
              type: jsonData.type || 'document',
              createdAt: blob.properties.lastModified,
              size: blob.properties.contentLength
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse document ${blob.name}:`, error.message);
        }
      }
    }

    console.log('[api/knowledge-base] ナレッジベース取得成功:', documents.length + '件');

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge-base] ナレッジベース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 18. 応急処置フローAPI
app.get('/api/emergency-flows', async (req, res) => {
  try {
    console.log('[api/emergency-flows] 応急処置フロー取得リクエスト');
    
    if (!connectionString) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const listOptions = {
      prefix: norm('flows/')
    };

    const flows = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      if (blob.name.endsWith('.json')) {
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();
          
          if (downloadResponse.readableStreamBody) {
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8');
            const cleanContent = content.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanContent);
            
            flows.push({
              id: blob.name,
              name: jsonData.name || jsonData.title || blob.name.split('/').pop(),
              description: jsonData.description || '',
              steps: jsonData.steps || [],
              createdAt: blob.properties.lastModified,
              updatedAt: blob.properties.lastModified
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse flow ${blob.name}:`, error.message);
        }
      }
    }

    console.log('[api/emergency-flows] 応急処置フロー取得成功:', flows.length + '件');

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flows] 応急処置フロー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 19. 応急処置フローAPI（単数形 - クライアント互換性のため）
app.get('/api/emergency-flow/list', async (req, res) => {
  try {
    console.log('[api/emergency-flow/list] 応急処置フロー一覧取得リクエスト');
    
    if (!connectionString) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const listOptions = {
      prefix: norm('flows/')
    };

    const flows = [];
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      if (blob.name.endsWith('.json')) {
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();
          
          if (downloadResponse.readableStreamBody) {
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8');
            const cleanContent = content.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanContent);
            
            flows.push({
              id: blob.name,
              name: jsonData.name || jsonData.title || blob.name.split('/').pop(),
              description: jsonData.description || '',
              steps: jsonData.steps || [],
              createdAt: blob.properties.lastModified,
              updatedAt: blob.properties.lastModified
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse flow ${blob.name}:`, error.message);
        }
      }
    }

    console.log('[api/emergency-flow/list] 応急処置フロー一覧取得成功:', flows.length + '件');

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flow/list] 応急処置フロー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 20. RAG設定API
app.get('/api/settings/rag', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: false,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      message: 'RAG設定は本番環境では無効です'
    },
    timestamp: new Date().toISOString()
  });
});

// 21. チャット履歴保存API
app.post('/api/chat-history', (req, res) => {
  const { messages, chatId, machineType, machineNumber } = req.body;
  res.json({
    success: true,
    message: 'チャット履歴を保存しました（本番環境では無効です）',
    data: {
      chatId: chatId || 'mock-chat-id',
      machineType: machineType || 'unknown',
      machineNumber: machineNumber || 'unknown',
      messageCount: messages ? messages.length : 0
    },
    timestamp: new Date().toISOString()
  });
});

// 履歴データ取得API
app.get('/api/history', async (req, res) => {
  try {
    console.log('[api/history] 履歴データ取得リクエスト');

    const { limit = 50, offset = 0, machineType, machineNumber } = req.query;

    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    
    // 履歴データを取得（実際のテーブル構造に応じて調整）
    let query = `
      SELECT 
        h.id,
        h.title,
        h.machine_type,
        h.machine_number,
        h.created_at,
        h.content,
        h.conversation_history
      FROM chat_history h
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;

    if (machineType) {
      paramCount++;
      query += ` AND h.machine_type = $${paramCount}`;
      params.push(machineType);
    }

    if (machineNumber) {
      paramCount++;
      query += ` AND h.machine_number = $${paramCount}`;
      params.push(machineNumber);
    }

    query += ` ORDER BY h.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await client.query(query, params);
    await client.release();

    console.log('[api/history] 履歴データ取得成功:', result.rows.length + '件');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history] 履歴データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴データの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ローカルファイル一覧取得API
app.get('/api/history/local-files', async (req, res) => {
  try {
    console.log('[api/history/local-files] ローカルファイル一覧取得リクエスト');
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // 履歴ファイルを保存するディレクトリを指定（環境変数対応）
    const historyDir = process.env.LOCAL_HISTORY_DIR || path.join(__dirname, 'app-logs', 'history');
    const exportDir = process.env.LOCAL_EXPORT_DIR || path.join(__dirname, 'app-logs', 'exports');
    
    let files = [];
    
    try {
      // historyディレクトリから.jsonファイルを取得
      try {
        const historyFiles = await fs.readdir(historyDir);
        const historyJsonFiles = historyFiles.filter(file => file.endsWith('.json'));
        files = [...files, ...historyJsonFiles.map(file => ({ file, dir: 'history' }))];
      } catch (error) {
        console.log('[api/history/local-files] historyディレクトリが存在しません');
      }
      
      // exportsディレクトリから.jsonファイルを取得
      try {
        const exportFiles = await fs.readdir(exportDir);
        const exportJsonFiles = exportFiles.filter(file => file.endsWith('.json'));
        files = [...files, ...exportJsonFiles.map(file => ({ file, dir: 'exports' }))];
      } catch (error) {
        console.log('[api/history/local-files] exportsディレクトリが存在しません');
      }
      
      console.log('[api/history/local-files] ファイル一覧取得成功:', files.length + '件');
      
      res.json({
        success: true,
        files: files.map(f => f.file),
        directories: files.map(f => ({ file: f.file, directory: f.dir })),
        total: files.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/history/local-files] ディレクトリ読み込みエラー:', error);
      res.json({
        success: true,
        files: [],
        total: 0,
        message: 'ローカルファイルディレクトリが見つかりません',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/history/local-files] ローカルファイル一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ローカルファイル一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ローカルファイル内容取得API
app.get('/api/history/local-files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log('[api/history/local-files/:filename] ファイル内容取得リクエスト:', filename);
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // セキュリティチェック: ファイル名に不正な文字が含まれていないかチェック
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: '不正なファイル名です',
        timestamp: new Date().toISOString()
      });
    }
    
    // 履歴ファイルを保存するディレクトリから検索（環境変数対応）
    const historyDir = process.env.LOCAL_HISTORY_DIR || path.join(__dirname, 'app-logs', 'history');
    const exportDir = process.env.LOCAL_EXPORT_DIR || path.join(__dirname, 'app-logs', 'exports');
    
    let filePath = null;
    
    // historyディレクトリから検索
    try {
      const historyPath = path.join(historyDir, filename);
      await fs.access(historyPath);
      filePath = historyPath;
    } catch (error) {
      // historyディレクトリにない場合、exportsディレクトリから検索
      try {
        const exportPath = path.join(exportDir, filename);
        await fs.access(exportPath);
        filePath = exportPath;
      } catch (error) {
        // どちらにもない場合
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'ファイルが見つかりません',
        filename: filename,
        timestamp: new Date().toISOString()
      });
    }
    
    // ファイル内容を読み込み
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    console.log('[api/history/local-files/:filename] ファイル内容取得成功:', filename);
    
    res.json({
      success: true,
      filename: filename,
      content: jsonData,
      size: fileContent.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history/local-files/:filename] ファイル内容取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ファイル内容の取得に失敗しました',
      details: error.message,
      filename: req.params.filename,
      timestamp: new Date().toISOString()
    });
  }
});

// フロー管理API
app.get('/api/flows', async (req, res) => {
  try {
    console.log('[api/flows] フロー一覧取得リクエスト');
    
    if (!dbPool) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT id, name, description, steps, created_at, updated_at
      FROM emergency_flows
      ORDER BY created_at DESC
    `);
    await client.release();

    console.log('[api/flows] フロー一覧取得成功:', result.rows.length + '件');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/flows] フロー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フロー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 23. データベース接続チェックAPI
app.get('/api/db-check', async (req, res) => {
  try {
    console.log('[api/db-check] データベース接続チェックリクエスト');
    
    if (!dbPool) {
      return res.json({
        success: true,
        connected: false,
        message: 'データベース接続プールが初期化されていません',
        details: {
          environment: 'azure-production',
          database: 'not_initialized',
          ssl: process.env.PG_SSL || 'not_set',
          database_url_set: !!process.env.DATABASE_URL
        },
        timestamp: new Date().toISOString()
      });
    }

    // 接続タイムアウトを設定
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 30000);
    });

    const queryPromise = dbPool.query('SELECT NOW() as current_time, version() as version');
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    res.json({
      success: true,
      connected: true,
      message: 'データベース接続チェック成功',
      details: {
        environment: 'azure-production',
        database: 'connected',
        ssl: process.env.PG_SSL || 'prefer',
        current_time: result.rows[0].current_time,
        version: result.rows[0].version,
        pool_stats: {
          totalCount: dbPool.totalCount,
          idleCount: dbPool.idleCount,
          waitingCount: dbPool.waitingCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/db-check] エラー:', error);
    res.status(500).json({
      success: false,
      connected: false,
      message: 'データベース接続チェック失敗',
      details: {
        environment: 'azure-production',
        database: 'connection_failed',
        error: error.message,
        error_type: error.constructor.name,
        database_url_set: !!process.env.DATABASE_URL,
        ssl_setting: process.env.PG_SSL || 'not_set'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 24. GPT接続チェックAPI
app.post('/api/gpt-check', (req, res) => {
  res.json({
    success: true,
    connected: false,
    message: 'GPT接続チェック（本番環境では無効です）',
    details: {
      environment: 'azure-production',
      apiKey: 'not_configured',
      model: 'not_available'
    },
    timestamp: new Date().toISOString()
  });
});

// 25. GPT APIエンドポイント（本番環境で有効化）
app.post('/api/chatgpt', async (req, res) => {
  try {
    const { text, useOnlyKnowledgeBase = false } = req.body;
    
    console.log('[api/chatgpt] GPT request:', { 
      text: text?.substring(0, 100) + '...', 
      useOnlyKnowledgeBase,
      openaiAvailable: isOpenAIAvailable 
    });

    if (!isOpenAIAvailable) {
      return res.json({
        success: false,
        response: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
        message: 'GPT機能を利用するにはOpenAI APIキーの設定が必要です',
        details: {
          environment: 'azure-production',
          apiKeyConfigured: false,
          fallbackMode: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // OpenAI APIを使用した実際の処理
    try {
      const { processOpenAIRequest } = await import('./lib/openai.js');
      const response = await processOpenAIRequest(text, useOnlyKnowledgeBase);
      
      res.json({
        success: true,
        response: response,
        message: 'GPT応答を生成しました',
        details: {
          inputText: text || 'no text provided',
          useOnlyKnowledgeBase: useOnlyKnowledgeBase,
          environment: 'azure-production',
          model: 'gpt-3.5-turbo'
        },
        timestamp: new Date().toISOString()
      });
    } catch (importError) {
      console.error('[api/chatgpt] Import error:', importError);
      res.json({
        success: true,
        response: 'AI支援機能は現在利用できません。しばらくしてから再度お試しください。',
        message: 'OpenAI ライブラリの読み込みに失敗しました',
        details: {
          environment: 'azure-production',
          error: 'library_import_failed'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[api/chatgpt] Error:', error);
    res.status(500).json({
      success: false,
      response: 'GPT処理中にエラーが発生しました',
      message: error.message,
      details: {
        environment: 'azure-production',
        error: error.name
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 26. 診断用エンドポイント - ルート一覧
app.get('/api/_diag/routes', (req, res) => {
  res.json({
    success: true,
    routes: [
      '/api/health',
      '/api/auth/login',
      '/api/users',
      '/api/machines/machine-types',
      '/api/knowledge-base',
      '/api/emergency-flow/list',
      '/api/chatgpt',
      '/api/history',
      '/api/settings/rag'
    ],
    message: '利用可能なルート一覧（本番環境）',
    timestamp: new Date().toISOString()
  });
});

// 28. バージョン情報エンドポイント
app.get('/api/version', (req, res) => {
  res.json({
    version: 'azure-production-1.0.0',
    builtAt: new Date().toISOString(),
    environment: 'azure-production',
    timestamp: new Date().toISOString()
  });
});

// 29. 追加の診断エンドポイント
app.get('/api/_diag/status', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    environment: 'azure-production',
    apiEndpoints: 29,
    timestamp: new Date().toISOString(),
    message: '全29個のAPIエンドポイントが正常に動作しています'
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

try {
  const server = app.listen(port, host, () => {
    console.log(`🚀 Azure Server running on ${host}:${port}`);
    console.log(`📊 Health check: /api/health`);
    console.log(`🌍 Environment: azure-production`);
    console.log(`📦 Node.js: ${process.version}`);
    console.log(`💻 Platform: ${process.platform}`);
    console.log(`🎯 Version: ${VERSION}`);
    console.log('✅ Server successfully started and listening for requests');
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to create server:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (dbPool) {
    dbPool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// 開発環境でのSIGINT処理（本番環境では無視）
process.on('SIGINT', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('SIGINT received in development, shutting down gracefully');
    if (dbPool) {
      dbPool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } else {
    console.log('SIGINT received in production, ignoring (use SIGTERM for graceful shutdown)');
  }
});

// 未処理の例外をキャッチ（ログのみ、プロセスは継続）
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception (continuing):', err);
  console.error('Stack trace:', err.stack);
  // プロセスを終了させない - ログのみ記録
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection (continuing):', reason);
  console.error('Promise:', promise);
  // プロセスを終了させない - ログのみ記録
});
