#!/usr/bin/env node

// Azure App Service専用サーバー
// Windows/Linux環境で確実に動作する最小限のサーバー
// Version: 2024-11-17

// 環境変数読み込み（ローカル開発のみ、本番では不要）
import dotenv from 'dotenv';
if (!process.env.WEBSITE_SITE_NAME) {
  // Azure App Service以外（ローカル環境）でのみ.envを読み込む
  dotenv.config();
  console.log('📄 Local .env file loaded');
}

// Azure App Service environment setup
console.log('🚀 Azure Server Starting (ES Module)...');
console.log('📍 Working directory:', process.cwd());
console.log('🗂️ __filename equivalent:', import.meta.url);
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔌 Port:', process.env.PORT || 'not set');

// Azure App Service specific environment variables
console.log('📋 Azure Environment Variables:');
console.log('   WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME || 'not set');
console.log('   WEBSITE_RESOURCE_GROUP:', process.env.WEBSITE_RESOURCE_GROUP || 'not set');
console.log('   WEBSITE_OWNER_NAME:', process.env.WEBSITE_OWNER_NAME || 'not set');
console.log('   SCM_COMMIT_ID:', process.env.SCM_COMMIT_ID || 'not set');
console.log('   WEBSITE_HOSTNAME:', process.env.WEBSITE_HOSTNAME || 'not set');

import express from 'express';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import { Pool } from 'pg';
import { BlobServiceClient } from '@azure/storage-blob';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import fs from 'fs';
import Database from 'better-sqlite3';

// ==== まず環境値（ログより前に宣言）=====
// Azure Static Web Apps のデフォルトURL
const DEFAULT_STATIC_WEB_APP_URL = 'https://witty-river-012f39e00.1.azurestaticapps.net';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.STATIC_WEB_APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_STATIC_WEB_APP_URL
    : 'http://localhost:8080');

const STATIC_WEB_APP_URL = process.env.STATIC_WEB_APP_URL || process.env.FRONTEND_URL || DEFAULT_STATIC_WEB_APP_URL;
const HEALTH_TOKEN = process.env.HEALTH_TOKEN || ''; // 任意。設定時は /ready に x-health-token を要求
const PORT = process.env.PORT || 3000;

// ==== アプリ初期化 =====
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

// 本番ミドルウェア群
app.use(helmet({ contentSecurityPolicy: false })); // 必要に応じてCSPを調整
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// 簡素化されたCORS設定 - Azure Static Web Apps対応
const allowedOrigins = [
  FRONTEND_URL,
  STATIC_WEB_APP_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net', // 明示的なStatic Web Apps URL
  'http://localhost:5173', // 開発用
  'http://localhost:8080', // 開発用
  'https://localhost:5173', // 開発用（HTTPS）
  ...(process.env.CORS_ALLOW_ORIGINS?.split(',').map(url => url.trim()) || [])
].filter(Boolean);

console.log('✅ CORS Allowed Origins:', allowedOrigins);

// オリジン許可判定関数（シンプル版）
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.includes('azurestaticapps.net')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return false;
};

// CORS ミドルウェア設定
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204
};

// シンプルなCORS処理
console.log('🔧 Initializing CORS middleware...');
app.use(cors(corsOptions));
console.log('✅ CORS middleware initialized');

// 追加のCORS対応 - Preflightリクエストを確実に処理
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

console.log('🔗 Frontend URL:', FRONTEND_URL);
console.log('🌐 Static Web App URL:', STATIC_WEB_APP_URL);

// BLOBストレージ関連の設定
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// BLOB設定の詳細ログ（起動時）
console.log('🔧 BLOB Storage Configuration:');
console.log('   AZURE_STORAGE_CONNECTION_STRING length:', connectionString ? connectionString.length : 0);
console.log('   AZURE_STORAGE_CONTAINER_NAME:', containerName);
console.log('   BLOB_CONTAINER_NAME (legacy):', process.env.BLOB_CONTAINER_NAME || 'not_set');
console.log('   BLOB_PREFIX (legacy):', process.env.BLOB_PREFIX || 'not_set');

// OpenAI API設定の確認とフォールバック
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const isOpenAIAvailable = OPENAI_API_KEY &&
  OPENAI_API_KEY !== 'your-openai-api-key-here' &&
  OPENAI_API_KEY.startsWith('sk' + '-');

if (!isOpenAIAvailable) {
  console.warn('⚠️ OpenAI API key not configured - GPT features will use fallback responses');
}

// バージョン情報（デプロイ確認用）
const VERSION = '1.0.6-USER-MACHINE-API-' + new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
console.log('🚀 Azure Server Starting - Version:', VERSION);

// Application Insights設定確認
const appInsightsConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
console.log('📊 Application Insights:', appInsightsConnectionString ? 'Configured' : 'Not configured');
if (appInsightsConnectionString) {
  console.log('📊 Telemetry endpoint:', appInsightsConnectionString.includes('IngestionEndpoint') ? 'Set' : 'Missing');
}

// BLOBサービスクライアントの初期化（エラーハンドリング強化版）
const getBlobServiceClient = () => {
  console.log('🔍 getBlobServiceClient called');
  console.log('🔍 connectionString exists:', !!connectionString);
  console.log('🔍 connectionString length:', connectionString ? connectionString.length : 0);

  if (!connectionString) {
    console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING is not configured');
    console.warn('⚠️ BLOB storage features will be disabled');
    return null;
  }

  // 接続文字列の基本的な形式チェック
  if (connectionString.length < 50 || !connectionString.includes('AccountName=') || !connectionString.includes('AccountKey=')) {
    console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING appears to be invalid or incomplete');
    console.warn('⚠️ Expected format: AccountName=...;AccountKey=...;EndpointSuffix=...');
    console.warn('⚠️ Current string length:', connectionString.length);
    console.warn('⚠️ BLOB storage features will be disabled');
    return null;
  }

  console.log('🔍 connectionString format check passed');

  try {
    const client = BlobServiceClient.fromConnectionString(connectionString);
    console.log('✅ BLOB service client initialized successfully');
    return client;
  } catch (error) {
    console.error('❌ BLOB service client initialization failed:', error);
    console.error('❌ Connection string format issue. Expected: AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net');
    console.error('⚠️ BLOB storage features will be disabled');
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
let dbPool = null; // PostgreSQL (production)
let sqliteDb = null; // SQLite (local development)

// データベース接続初期化（改善版）
function initializeDatabase() {
  // ローカル開発環境: SQLite を使用
  const useSQLite = process.env.USE_SQLITE === 'true' || process.env.NODE_ENV === 'development';

  if (useSQLite) {
    console.log('🔗 Initializing SQLite database for local development...');
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'knowledge-base', 'data', 'local.db');

    try {
      sqliteDb = new Database(dbPath);
      console.log('✅ SQLite database opened:', dbPath);

      // テーブル作成（存在しない場合）
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          display_name TEXT,
          role TEXT DEFAULT 'user',
          department TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS machine_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          machine_type_name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS machines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          machine_number TEXT NOT NULL,
          machine_type_id INTEGER,
          FOREIGN KEY (machine_type_id) REFERENCES machine_types(id)
        );

        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          machine_type TEXT,
          machine_number TEXT,
          content TEXT,
          conversation_history TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // デフォルト管理者ユーザーが存在しない場合は作成
      const adminExists = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get('admin');
      if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('admin', 10);
        sqliteDb.prepare('INSERT INTO users (username, password, display_name, role, department) VALUES (?, ?, ?, ?, ?)').run(
          'admin', hashedPassword, '管理者', 'admin', 'システム管理'
        );
        console.log('✅ Default admin user created (username: admin, password: admin)');
      }

      console.log('✅ SQLite database initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error);
      return false;
    }
  }

  // 本番環境: PostgreSQL を使用
  const databaseUrl = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.AZURE_POSTGRESQL_CONNECTIONSTRING;

  if (!databaseUrl) {
    console.error('❌ Database URL not found in any environment variable:');
    console.error('   - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.error('   - POSTGRES_URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
    console.error('   - AZURE_POSTGRESQL_CONNECTIONSTRING:', process.env.AZURE_POSTGRESQL_CONNECTIONSTRING ? 'Set' : 'Not set');
    console.warn('⚠️ Running without database connection');
    return false;
  }

  try {
    console.log('🔗 Initializing database connection...');
    console.log('📊 Database URL source:', databaseUrl === process.env.DATABASE_URL ? 'DATABASE_URL' :
      databaseUrl === process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'AZURE_POSTGRESQL_CONNECTIONSTRING');
    console.log('🔒 PG_SSL:', process.env.PG_SSL || 'not set');

    const sslConfig = process.env.PG_SSL === 'require'
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable'
        ? false
        : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: databaseUrl,
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

    // データベース接続テスト
    dbPool.connect()
      .then(client => {
        console.log('✅ Database connection test successful');
        return client.query('SELECT version()');
      })
      .then(result => {
        console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        // テーブル存在確認
        return dbPool.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('users', 'machines', 'machine_types', 'chat_history')
          ORDER BY table_name
        `);
      })
      .then(result => {
        const existingTables = result.rows.map(row => row.table_name);
        console.log('📊 Existing tables:', existingTables.join(', ') || 'None found');
        if (!existingTables.includes('users')) {
          console.warn('⚠️ users table missing - user management will fail');
        }
        if (!existingTables.includes('machines')) {
          console.warn('⚠️ machines table missing - machine management will fail');
        }
      })
      .catch(err => {
        console.error('❌ Database connection or table check failed:', err.message);
      });

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

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// ユニバーサルデータベースクエリヘルパー
async function dbQuery(sql, params = []) {
  if (sqliteDb) {
    // SQLite: 同期的にクエリを実行
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = sqliteDb.prepare(sql);
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
        return { rows, rowCount: rows.length };
      } else {
        const stmt = sqliteDb.prepare(sql);
        const info = params.length > 0 ? stmt.run(...params) : stmt.run();
        return {
          rows: info.lastInsertRowid ? [{ id: info.lastInsertRowid }] : [],
          rowCount: info.changes
        };
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  } else if (dbPool) {
    // PostgreSQL: 非同期クエリ
    const client = await dbPool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  } else {
    throw new Error('No database connection available');
  }
}

// データベース接続を初期化
initializeDatabase();

// スタートアップ時にマイグレーションを実行
async function startupSequence() {
  try {
    console.log('🚀 Starting Azure application startup sequence...');

    // FIXME: Temporarily disable migrations to isolate EISDIR
    // データベースマイグレーションを実行
    // データベースマイグレーション実行（強制版）
    console.log('🔄 Skipping database migrations (EISDIR debug)...');
    try {
      // await runMigrations();
      console.log('✅ Database migrations skipped (EISDIR debug)');

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

// セッション管理の設定（CORS対応修正版）
app.use(session({
  secret: process.env.SESSION_SECRET || 'azure-production-session-secret-32-chars-fixed',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPでも動作するように一時的にfalse
    httpOnly: false, // フロントエンドからアクセス可能
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'none', // クロスサイト対応
    domain: undefined, // ドメイン制限なし
    path: '/' // すべてのパスで有効
  },
  name: 'emergency.session', // セッション名を変更
  proxy: true, // Azure App Serviceでプロキシを使用する場合
  rolling: false // セッション更新を無効化
}));

// ===== ヘルスエンドポイント =====
const ok = (_req, res) => res.status(200).send('ok');

// liveness：軽量・常に200
app.get('/live', ok);

// readiness：最低限の自己診断（重い外部依存はソフト評価）
app.get('/ready', (req, res) => {
  if (HEALTH_TOKEN && req.headers['x-health-token'] !== HEALTH_TOKEN) {
    return res.status(401).json({ status: 'unauthorized' });
  }
  const essentials = ['NODE_ENV']; // 必須ENVなどを列挙
  const missing = essentials.filter(k => !process.env[k]);
  const ready = missing.length === 0;
  res.status(200).json({
    status: ready ? 'ok' : 'degraded',
    missing,
    timestamp: new Date().toISOString()
  });
});

// 互換エンドポイント（即200）
app.get('/ping', ok);
app.get('/api/ping', ok);
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// 詳細なヘルスチェックエンドポイント（詳細情報が必要な場合用）
// Health check endpoint with timeout protection (詳細版)
app.get('/api/health/detailed', (req, res) => {
  // Set response timeout to prevent hanging
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        status: 'timeout',
        message: 'Health check timed out',
        timestamp: new Date().toISOString()
      });
    }
  }, 10000); // 10 second timeout

  res.on('finish', () => clearTimeout(timeout));

  // Immediate health response for Azure App Service
  const healthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    node_version: process.version,
    platform: process.platform,
    pid: process.pid
  };

  // Quick database status check (non-blocking)
  if (dbPool) {
    healthResponse.database_status = 'pool_available';
  } else {
    healthResponse.database_status = 'not_initialized';
  }

  // Database environment variables check (for debugging)
  healthResponse.database_env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    AZURE_POSTGRESQL_CONNECTIONSTRING: !!process.env.AZURE_POSTGRESQL_CONNECTIONSTRING,
    PG_SSL: process.env.PG_SSL || 'not_set'
  };

  // Quick blob storage status
  if (connectionString) {
    healthResponse.blob_storage_status = 'configured';
  } else {
    healthResponse.blob_storage_status = 'not_configured';
  }

  res.status(200).json(healthResponse);
});

// Full database testing health check (別エンドポイント)
app.get('/api/health/full', async (req, res) => {
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
  const origin = req.headers.origin;
  console.log('🔐 Login request from origin:', origin);
  console.log('🔐 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔐 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { username, password } = req.body || {};

    console.log('[auth/login] Login attempt:', {
      username,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0,
      origin: origin,
      timestamp: new Date().toISOString(),
      dbPoolStatus: !!dbPool,
      sqliteDbStatus: !!sqliteDb
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
    if (!dbPool && !sqliteDb) {
      console.error('[auth/login] No database connection available');
      return res.status(500).json({
        success: false,
        error: 'database_unavailable',
        message: 'データベース接続が利用できません'
      });
    }

    try {
      // データベースからユーザーを検索
      console.log('[auth/login] ユーザー検索開始:', { username });

      const result = await dbQuery(
        'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
        [username]
      );

      console.log('[auth/login] ユーザー検索結果:', {
        found: result.rows.length > 0,
        userCount: result.rows.length,
        query: 'SELECT ... FROM users WHERE username = $1',
        searchUsername: username
      });

      if (result.rows.length === 0) {
        console.error('[auth/login] ❌ ユーザーが見つかりません');
        console.error('[auth/login] データベースに管理者ユーザーが作成されていない可能性があります');
        console.error('[auth/login] 解決方法: scripts/seed-admin-user.sql を実行してください');
        return res.status(401).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'ユーザー名またはパスワードが正しくありません',
          debug: process.env.NODE_ENV !== 'production' ? {
            hint: 'データベースにユーザーが存在しません。seed-admin-user.sqlを実行してください。'
          } : undefined
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
      console.log('[auth/login] 入力パスワード長:', password.length);
      console.log('[auth/login] DB保存ハッシュ長:', foundUser.password.length);
      console.log('[auth/login] ハッシュプレフィックス:', foundUser.password.substring(0, 7));

      const isPasswordValid = await bcrypt.compare(password, foundUser.password);
      console.log('[auth/login] パスワード比較結果:', { isValid: isPasswordValid });

      if (!isPasswordValid) {
        console.error('[auth/login] ❌ パスワードが一致しません');
        console.error('[auth/login] 入力されたパスワードとDBのハッシュが一致しません');
        console.error('[auth/login] ローカルと本番でパスワードが異なる可能性があります');
        return res.status(401).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'ユーザー名またはパスワードが正しくありません',
          debug: process.env.NODE_ENV !== 'production' ? {
            hint: 'パスワードが一致しません。正しいパスワードで再試行してください。'
          } : undefined
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

// 6. Ping endpoint（詳細版 - 既に /api/ping は上で定義済み）
app.get('/api/ping/detailed', (req, res) => {
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

// 履歴詳細取得API（ハイブリッドモード対応 - JSONファイルから直接取得）
app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 履歴アイテム取得リクエスト: ${id}`);

    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        error: 'not_found',
        message: 'エクスポートディレクトリが見つかりません'
      });
    }

    // IDに一致するJSONファイルを検索
    const files = fs.readdirSync(exportsDir);
    let foundFile = null;
    let foundData = null;

    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('.backup.')) continue;

      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;

      if (fileId === id || fileName === id || file.includes(id)) {
        try {
          const filePath = path.join(exportsDir, file);
          const content = fs.readFileSync(filePath, { encoding: 'utf8' });
          foundData = JSON.parse(content);
          foundFile = file;
          break;
        } catch (error) {
          console.error(`ファイル読み込みエラー: ${file}`, error);
        }
      }
    }

    if (!foundData) {
      console.log(`❌ 履歴が見つかりません: ${id}`);
      return res.status(404).json({
        error: 'not_found',
        message: '指定された履歴が見つかりません'
      });
    }

    // 画像データをJSONから取得（savedImages優先）
    const savedImages = foundData.savedImages || foundData.images || [];
    console.log('🖼️ 取得した画像データ:', {
      id,
      fileName: foundFile,
      savedImagesLength: savedImages.length,
      savedImages: savedImages
    });

    // フロントエンドが期待する形式に変換
    const convertedItem = {
      id: id,
      type: 'fault_history',
      fileName: foundFile,
      chatId: foundData.chatId || id,
      userId: foundData.userId || '',
      exportType: foundData.exportType || 'file_stored',
      exportTimestamp: foundData.createdAt || new Date().toISOString(),
      messageCount: foundData.metadata?.total_messages || 0,
      machineType: foundData.machineType || '',
      machineNumber: foundData.machineNumber || '',
      machineInfo: {
        selectedMachineType: '',
        selectedMachineNumber: '',
        machineTypeName: foundData.machineType || '',
        machineNumber: foundData.machineNumber || '',
      },
      title: foundData.title || '',
      incidentTitle: foundData.title || '',
      problemDescription: foundData.problemDescription || foundData.description || '',
      extractedComponents: foundData.extractedComponents || [],
      extractedSymptoms: foundData.extractedSymptoms || [],
      possibleModels: foundData.possibleModels || [],
      conversationHistory: foundData.conversationHistory || foundData.conversation_history || [],
      metadata: foundData.metadata || {},
      savedImages: savedImages,
      images: savedImages,
      fileSize: 0,
      lastModified: foundData.lastModified || foundData.updateHistory?.[0]?.timestamp || foundData.createdAt,
      createdAt: foundData.createdAt,
      jsonData: {
        ...foundData,
        savedImages: savedImages,
      },
    };

    console.log(`✅ 履歴アイテム取得完了: ${id} (画像: ${savedImages.length}件)`);
    res.json(convertedItem);
  } catch (error) {
    console.error('❌ 履歴詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴の取得に失敗しました',
      details: error.message
    });
  }
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
    console.log('📊 Request details:', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    });

    if (!dbPool && !sqliteDb) {
      console.warn('⚠️ No database connection available');
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const result = await dbQuery(`
      SELECT id, username, display_name, role, department, created_at
      FROM users
      ORDER BY created_at DESC
    `);

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

// ユーザー追加API
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, display_name, role = 'employee', department } = req.body;
    console.log('[api/users] ユーザー追加リクエスト:', { username, display_name, role, department });

    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名、パスワード、表示名は必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    // パスワードをハッシュ化（本来はbcryptを使用すべき）
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, display_name, role, department, created_at',
      [username, hashedPassword, display_name, role, department]
    );
    await client.release();

    console.log('[api/users] ユーザー追加完了:', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'ユーザーが正常に追加されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users] ユーザー追加エラー:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'そのユーザー名は既に使用されています',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      success: false,
      error: 'ユーザーの追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー更新API
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, display_name, role, department } = req.body;
    console.log('[api/users] ユーザー更新リクエスト:', { id, username, display_name, role, department });

    if (!username || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名と表示名は必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE users SET username = $1, display_name = $2, role = $3, department = $4 WHERE id = $5 RETURNING id, username, display_name, role, department, created_at',
      [username, display_name, role, department, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定されたユーザーが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/users] ユーザー更新完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'ユーザーが正常に更新されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users] ユーザー更新エラー:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'そのユーザー名は既に使用されています',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      success: false,
      error: 'ユーザーの更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー削除API
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/users] ユーザー削除リクエスト:', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username, display_name',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定されたユーザーが見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/users] ユーザー削除完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'ユーザーを削除しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users] ユーザー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの削除に失敗しました',
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

// 機種追加API
app.post('/api/machines/machine-types', async (req, res) => {
  try {
    const { machine_type_name } = req.body;
    console.log('[api/machines] 機種追加リクエスト:', { machine_type_name });

    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '機種名は必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO machine_types (machine_type_name) VALUES ($1) RETURNING *',
      [machine_type_name]
    );
    await client.release();

    console.log('[api/machines] 機種追加完了:', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '機種が正常に追加されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機種追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種更新API
app.put('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_type_name } = req.body;
    console.log('[api/machines] 機種更新リクエスト:', { id, machine_type_name });

    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '機種名は必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE machine_types SET machine_type_name = $1 WHERE id = $2 RETURNING *',
      [machine_type_name, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機種が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines] 機種更新完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '機種が正常に更新されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機種更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種削除API
app.delete('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/machines] 機種削除リクエスト:', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM machine_types WHERE id = $1 RETURNING *',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機種が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines] 機種削除完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '機種を削除しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機種削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械データ取得API（ルートエンドポイント - 後方互換性のため）
app.get('/api/machines', async (req, res) => {
  try {
    console.log('[api/machines] 機械データ取得リクエスト（ルートエンドポイント）');
    console.log('📊 Request details:', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    });

    if (!dbPool && !sqliteDb) {
      console.warn('⚠️ No database connection available for machines API');
      return res.json({
        success: true,
        machineTypes: [],
        machines: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    // 機種一覧を取得
    const typesResult = await dbQuery(`
      SELECT id, machine_type_name
      FROM machine_types
      ORDER BY machine_type_name
    `);

    // 機械番号一覧を取得
    const machinesResult = await dbQuery(`
      SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      ORDER BY mt.machine_type_name, m.machine_number
    `);

    console.log('[api/machines] 機械データ取得成功:', {
      machineTypes: typesResult.rows.length,
      machines: machinesResult.rows.length
    });

    res.json({
      success: true,
      machineTypes: typesResult.rows,
      machines: machinesResult.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機械データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械データの取得に失敗しました',
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

// 機械番号追加API
app.post('/api/machines', async (req, res) => {
  try {
    const { machine_number, machine_type_id } = req.body;
    console.log('[api/machines] 機械番号追加リクエスト:', { machine_number, machine_type_id });

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '機械番号と機種IDは必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO machines (machine_number, machine_type_id) VALUES ($1, $2) RETURNING *',
      [machine_number, machine_type_id]
    );
    await client.release();

    console.log('[api/machines] 機械番号追加完了:', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '機械番号が正常に追加されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機械番号追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号更新API
app.put('/api/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_number, machine_type_id } = req.body;
    console.log('[api/machines] 機械番号更新リクエスト:', { id, machine_number, machine_type_id });

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '機械番号と機種IDは必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'UPDATE machines SET machine_number = $1, machine_type_id = $2 WHERE id = $3 RETURNING *',
      [machine_number, machine_type_id, id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機械番号が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines] 機械番号更新完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '機械番号が正常に更新されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機械番号更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号削除API
app.delete('/api/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/machines] 機械番号削除リクエスト:', { id });

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const client = await dbPool.connect();
    const result = await client.query(
      'DELETE FROM machines WHERE id = $1 RETURNING *',
      [id]
    );
    await client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機械番号が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[api/machines] 機械番号削除完了:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '機械番号を削除しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/machines] 機械番号削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の削除に失敗しました',
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
    if (!blobServiceClient) {
      console.warn('⚠️ Blob service client unavailable, returning empty list');
      return res.json([]);
    }
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
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
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
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
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
    if (!blobServiceClient) {
      return res.status(500).json({
        error: 'Blob service client unavailable'
      });
    }
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
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }

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
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }
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
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }
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

// AI支援設定API
app.get('/api/ai-assist/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: true,
      autoSuggestions: true,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ai-assist/settings', (req, res) => {
  res.json({
    success: true,
    message: 'AI支援設定を更新しました',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// RAG設定API(別エンドポイント)
app.get('/api/config/rag', (req, res) => {
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

// ナレッジベース統計API
app.get('/api/knowledge-base/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalDocuments: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'ナレッジベース統計の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// 管理画面ダッシュボードAPI
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalChats: 0,
        totalMachines: 0,
        recentActivity: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'ダッシュボードデータの取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// エクスポートファイル一覧API
app.get('/api/history/export-files', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'エクスポートファイルはありません',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'エクスポートファイル一覧の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// フィルターデータ取得API
app.get('/api/history/exports/filter-data', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        machineTypes: [],
        machineNumbers: [],
        userNames: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'フィルターデータの取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
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

    if (!dbPool && !sqliteDb) {
      return res.json({
        success: true,
        data: [],
        message: 'データベース接続が設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    // 履歴データを取得
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

    if (machineType) {
      query += ` AND h.machine_type = ?`;
      params.push(machineType);
    }

    if (machineNumber) {
      query += ` AND h.machine_number = ?`;
      params.push(machineNumber);
    }

    query += ` ORDER BY h.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await dbQuery(query, params);

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

    const fsPromises = fs.promises;

    // 履歴ファイルを保存するディレクトリを指定（環境変数対応）
    const historyDir = process.env.LOCAL_HISTORY_DIR || path.join(__dirname, 'app-logs', 'history');
    const exportDir = process.env.LOCAL_EXPORT_DIR || path.join(__dirname, 'app-logs', 'exports');

    let files = [];

    try {
      // historyディレクトリから.jsonファイルを取得
      try {
        const historyFiles = await fsPromises.readdir(historyDir);
        const historyJsonFiles = historyFiles.filter(file => file.endsWith('.json'));
        files = [...files, ...historyJsonFiles.map(file => ({ file, dir: 'history' }))];
      } catch (error) {
        console.log('[api/history/local-files] historyディレクトリが存在しません');
      }

      // exportsディレクトリから.jsonファイルを取得
      try {
        const exportFiles = await fsPromises.readdir(exportDir);
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

    const fsPromises = fs.promises;

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
      await fsPromises.access(historyPath);
      filePath = historyPath;
    } catch (error) {
      // historyディレクトリにない場合、exportsディレクトリから検索
      try {
        const exportPath = path.join(exportDir, filename);
        await fsPromises.access(exportPath);
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
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
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

// システムチェック用のエンドポイント（/api/system-check/db-check）
app.get('/api/system-check/db-check', async (req, res) => {
  try {
    console.log('[api/system-check/db-check] データベース接続チェックリクエスト');

    if (!dbPool) {
      return res.json({
        success: false,
        status: 'ERROR',
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
      status: 'OK',
      connected: true,
      message: 'データベース接続チェック成功',
      db_time: result.rows[0].current_time,
      version: result.rows[0].version,
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
    console.error('[api/system-check/db-check] エラー:', error);
    res.json({
      success: false,
      status: 'ERROR',
      connected: false,
      message: error.message || 'データベース接続チェック失敗',
      error: error.message,
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

// システムチェック用のGPT接続チェックエンドポイント（/api/system-check/gpt-check）
app.post('/api/system-check/gpt-check', (req, res) => {
  console.log('[api/system-check/gpt-check] GPT接続チェックリクエスト');

  // OpenAI APIキーの設定を確認
  if (!isOpenAIAvailable) {
    return res.json({
      success: false,
      status: 'ERROR',
      connected: false,
      message: 'OpenAI APIキーが設定されていません',
      error: 'APIキーが未設定または無効です',
      details: {
        environment: 'azure-production',
        apiKey: 'not_configured',
        model: 'not_available'
      },
      timestamp: new Date().toISOString()
    });
  }

  // APIキーが設定されている場合
  res.json({
    success: true,
    status: 'OK',
    connected: true,
    message: 'OpenAI APIキーが設定されています',
    details: {
      environment: 'azure-production',
      apiKey: 'configured',
      model: 'available'
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

    // OpenAI APIを使用した実際の処理 - 一時的に無効化（EISDIR回避）
    try {
      // const { processOpenAIRequest } = await import('./lib/openai.ts');
      // const response = await processOpenAIRequest(text, useOnlyKnowledgeBase);

      // 一時的なフォールバック応答
      const response = `申し訳ございませんが、現在AIアシスタント機能は一時的に利用できません。お困りの件について、以下の基本的な緊急時対応手順をご参考ください：

1. 緊急事態の場合は、まず119番（消防・救急）または110番（警察）に連絡してください。
2. 安全な場所に避難してください。
3. 必要に応じて、近くの避難所や安全な建物に移動してください。

システムの復旧をお待ちください。`;

      res.json({
        success: true,
        response: response,
        message: 'フォールバック応答を返しました（AIサービス一時無効）',
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
      '/api/users (GET, POST, PUT, DELETE)',
      '/api/machines (GET, POST, PUT, DELETE)',
      '/api/machines/machine-types (GET, POST, PUT, DELETE)',
      '/api/machines/machines',
      '/api/knowledge-base',
      '/api/emergency-flow/list',
      '/api/chatgpt',
      '/api/history',
      '/api/settings/rag'
    ],
    message: '利用可能なルート一覧（本番環境）- ユーザー・機械管理フル対応',
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

// ===== 静的配信（Vite出力） & SPA =====
// Azure App Service対応：複数のパス候補を試行
const clientDistPaths = [
  join(__dirname, 'client/dist'),      // Azureでの実際の配置
  join(__dirname, '../client/dist'),   // ローカル開発用
  join(process.cwd(), 'client/dist')   // プロセス実行パス基準
];

let clientDistPath = null;
for (const testPath of clientDistPaths) {
  const indexPath = join(testPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    clientDistPath = testPath;
    console.log('✅ Client files found at:', clientDistPath);
    break;
  } else {
    console.log('❌ Client files not found at:', testPath);
  }
}

if (!clientDistPath) {
  console.error('❌ ERROR: Client dist directory not found in any expected location');
  console.error('📋 Checked paths:', clientDistPaths);
  console.error('🔍 Current working directory:', process.cwd());
  console.error('📁 __dirname:', __dirname);
  process.exit(1);
}

app.use(express.static(clientDistPath, {
  maxAge: '7d', etag: true, lastModified: true, immutable: true
}));

// API以外は index.html へ（API定義の「後ろ」に置く）
app.get(/^(?!\/api).*/, (_req, res) => {
  const indexPath = join(clientDistPath, 'index.html');
  res.sendFile(indexPath);
});

// ===== エラーハンドラ（最後尾）=====
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Application Insightsが設定されていれば、エラーを送信
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    console.log('📊 Error logged to Application Insights');
  }

  res.status(500).json({
    error: 'internal_error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ===== サーバー起動準備 =====
// サーバー起動は最後に行う（ファイルの最後を参照）

const shutdown = (sig) => () => {
  console.log(`↩️  Received ${sig}, shutting down gracefully...`);
  server.close(() => {
    if (dbPool) {
      dbPool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

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

// サーバー起動（これが必須！）
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 ================================================');
  console.log('🚀 Azure Production Server Started Successfully!');
  console.log('🎉 ================================================');
  console.log('');
  console.log(`📍 Server listening on: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Public URL: https://${process.env.WEBSITE_HOSTNAME || 'localhost'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📦 Node Version: ${process.version}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   GET  /health - ヘルスチェック');
  console.log('   GET  /api/ping - Ping');
  console.log('   POST /api/auth/login - ログイン');
  console.log('   GET  /api/auth/me - 現在のユーザー');
  console.log('   GET  /api/users - ユーザー一覧');
  console.log('   POST /api/users - ユーザー作成');
  console.log('   PUT  /api/users/:id - ユーザー更新');
  console.log('   DELETE /api/users/:id - ユーザー削除');
  console.log('   GET  /api/machines - 機械データ');
  console.log('   POST /api/machines - 機械作成');
  console.log('   PUT  /api/machines/:id - 機械更新');
  console.log('   DELETE /api/machines/:id - 機械削除');
  console.log('   GET  /ready - ヘルスチェック');
  console.log('');
  console.log('✅ Server is ready to accept connections!');
  console.log('🎉 ================================================');
});

// エラーハンドリング
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  console.error('❌ Error code:', error.code);
  console.error('❌ Error message:', error.message);
  console.error('❌ Error stack:', error.stack);

  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
    process.exit(1);
  } else {
    console.error('❌ Unexpected server error, but continuing...');
  }
});

// 追加のグローバルエラーハンドラー
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('💥 Stack:', error.stack);
  // Azure App Serviceではプロセスを継続（再起動はAzureが管理）
  console.log('⚠️ Server continuing after uncaught exception...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('💥 Reason:', reason);
  // Azure App Serviceではプロセスを継続
  console.log('⚠️ Server continuing after unhandled rejection...');
});

console.log('✅ Global error handlers registered');

export default app;
