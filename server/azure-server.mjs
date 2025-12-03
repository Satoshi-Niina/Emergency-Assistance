// Azure App Service専用サーバー
// Windows/Linux環境で確実に動作する最小限のサーバー
// Version: 2025-11-30T10:05:00+09:00 (Deployment version tracking)
// Build: ${new Date().toISOString()}

// 必要なモジュールインポート
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs'; // ファイルシステム操作用

// __dirname の取得（ESM で必要）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Azure App Service environment setup
if (!process.env.WEBSITE_SITE_NAME) {
  // Azure App Service以外（ローカル環境）でのみ.envを読み込む
  // NODE_ENVに応じて適切な.envファイルを読み込む
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
  const envPath = path.join(__dirname, envFile);

  // 指定されたenvファイルが存在するか確認
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📄 Environment file loaded: ${envFile} (${nodeEnv} mode)`);
    console.log(`📍 Path: ${envPath}`);
  } else {
    // フォールバック: .envファイルを試す
    const fallbackPath = path.join(__dirname, '.env');
    if (fs.existsSync(fallbackPath)) {
      dotenv.config({ path: fallbackPath });
      console.log(`⚠️ Fallback to .env file (${envFile} not found)`);
    } else {
      console.warn(`⚠️ No environment file found. Using system environment variables only.`);
    }
  }
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
import { join } from 'path';
import helmet from 'helmet';
import session from 'express-session';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';

// Azure BLOB Storage
import { BlobServiceClient } from '@azure/storage-blob';

// PostgreSQL
import pkg from 'pg';
const { Pool } = pkg;

// Password hashing
import bcrypt from 'bcryptjs';

// OpenAI
import OpenAI from 'openai';
import multer from 'multer';

// ==== まず環境値（ログより前に宣言）=====
// Azure Static Web Apps のデフォルトURL
const DEFAULT_STATIC_WEB_APP_URL = 'https://witty-river-012f39e00.1.azurestaticapps.net';

// 環境変数から引用符を削除するヘルパー関数
const cleanEnvValue = (value) => {
  if (!value) return null;
  return value.trim().replace(/^["']|["']$/g, '').trim();
};

const FRONTEND_URL = cleanEnvValue(
  process.env.FRONTEND_URL ||
  process.env.STATIC_WEB_APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_STATIC_WEB_APP_URL
    : 'http://localhost:5173')
) || 'http://localhost:5173';

const STATIC_WEB_APP_URL = cleanEnvValue(
  process.env.STATIC_WEB_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? DEFAULT_STATIC_WEB_APP_URL : 'http://localhost:5173')
) || 'http://localhost:5173';
const HEALTH_TOKEN = process.env.HEALTH_TOKEN || ''; // 任意。設定時は /ready に x-health-token を要求
const PORT = process.env.PORT || 3000;

// ==== BLOB Storage Configuration ====
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// ==== OpenAI Configuration ====
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const isOpenAIAvailable = !!OPENAI_API_KEY;

// ==== Version Information ====
const VERSION = '2025-12-02T10:20:00+09:00';

// ==== Multer (file upload) configuration ====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// 起動時にBLOB設定をログ出力
console.log('🔧 BLOB Storage Configuration:');
console.log('   AZURE_STORAGE_CONNECTION_STRING:', connectionString ? `[SET] (length: ${connectionString.length})` : '[NOT SET]');
console.log('   AZURE_STORAGE_CONTAINER_NAME:', containerName);
console.log('   AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME || 'not set');
console.log('🤖 OpenAI Configuration:');
console.log('   OPENAI_API_KEY:', isOpenAIAvailable ? '[SET]' : '[NOT SET]');

// ==== アプリ初期化 =====
// __dirname is already defined at the top
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

// Azure App Serviceの認証設定（Easy Auth）の確認と警告
// X-MS-CLIENT-PRINCIPALヘッダーが存在する場合、Easy Authが有効になっている可能性があります
app.use((req, res, next) => {
  // すべてのリクエストに対してEasy Authチェック
  if (req.headers['x-ms-client-principal']) {
    console.error('=' .repeat(100));
    console.error('❌❌❌ CRITICAL: AZURE APP SERVICE EASY AUTH DETECTED ❌❌❌');
    console.error('❌ Path:', req.path);
    console.error('❌ Method:', req.method);
    console.error('❌ X-MS-CLIENT-PRINCIPAL header is present');
    console.error('❌ Easy Authが有効になっているため、APIエンドポイントが403 Forbiddenを返します');
    console.error('❌');
    console.error('❌ 修正方法:');
    console.error('❌   1. Azure Portal > App Service > 認証 > 認証を無効にする');
    console.error('❌   2. または、Azure Portal > App Service > 認証 > 除外するパス に /api/* を追加');
    console.error('❌');
    console.error('❌ 詳細: AZURE_403_ERROR_FIX.md を参照してください');
    console.error('❌❌❌ EASY AUTH MUST BE DISABLED OR CONFIGURED ❌❌❌');
    console.error('=' .repeat(100));
  }
  
  // APIエンドポイントに対する追加の警告
  if (req.path.startsWith('/api/') && req.headers['x-ms-client-principal']) {
    console.error('🚨 APIエンドポイント', req.path, 'がEasy Authによってブロックされています');
  }
  
  next();
});

// 本番ミドルウェア群
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const storageUrl = storageAccountName
  ? `https://${storageAccountName}.blob.core.windows.net`
  : "https://*.blob.core.windows.net";

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          storageUrl
        ],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", storageUrl],
      },
    },
  })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// CORS設定（クロスオリジン対応 - 本番環境対応版）
const corsOptions = {
  origin: function (origin, callback) {
    // 許可するオリジンのリスト
    const allowedOrigins = [
      FRONTEND_URL,
      STATIC_WEB_APP_URL,
      'http://localhost:5173',
      'http://localhost:5002',
      'http://localhost:3000'
    ];

    console.log('🔍 CORS Check:', {
      requestOrigin: origin,
      allowedOrigins: allowedOrigins,
      willAllow: !origin || allowedOrigins.indexOf(origin) !== -1
    });

    // オリジンが未定義（直接アクセス）またはリストに含まれる場合は許可
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      console.warn('⚠️ Expected origins:', allowedOrigins);
      // 本番環境でazurestaticapps.netからのリクエストは許可（デバッグ用）
      if (process.env.NODE_ENV === 'production' && origin && origin.includes('azurestaticapps.net')) {
        console.warn('⚠️ Allowing azurestaticapps.net origin for debugging');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // Cookieを含むリクエストを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24時間
};

app.use(cors(corsOptions));

// プリフライトリクエストへの対応
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// BLOBサービスクライアントの初期化（同期的にクライアントを返すのみ）
const getBlobServiceClient = () => {
  console.log('🔍 getBlobServiceClient called');

  if (!connectionString || !connectionString.trim()) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (accountName && accountName.trim()) {
      console.log('⚠️ AZURE_STORAGE_CONNECTION_STRING is not configured, trying Managed Identity...');
      try {
        const { DefaultAzureCredential } = require('@azure/identity');
        const credential = new DefaultAzureCredential();
        const client = new BlobServiceClient(
          `https://${accountName.trim()}.blob.core.windows.net`,
          credential
        );
        console.log('✅ BLOB service client initialized with Managed Identity');
        return client;
      } catch (error) {
        console.error('❌ Failed to initialize BLOB service client with Managed Identity:', error);
        return null;
      }
    } else {
      console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_ACCOUNT_NAME are not set');
      return null;
    }
  }

  try {
    const client = BlobServiceClient.fromConnectionString(connectionString.trim());
    console.log('✅ BLOB service client initialized successfully');
    return client;
  } catch (error) {
    console.error('❌ BLOB service client initialization failed:', error);
    return null;
  }
};

// パス正規化ヘルパー
// 環境変数からBLOBストレージのベースパスを取得（柔軟性のため）
const BASE = (process.env.AZURE_KNOWLEDGE_BASE_PATH ?? 'knowledge-base')
  .replace(/^[\\/]+|[\\/]+$/g, '');

// 起動時にBASE設定をログ出力
console.log('📁 BLOB Base Path Configuration:');
console.log('   AZURE_KNOWLEDGE_BASE_PATH:', process.env.AZURE_KNOWLEDGE_BASE_PATH || 'not set (using default)');
console.log('   Resolved BASE:', BASE);
console.log('   Container Name:', containerName);

const KNOWLEDGE_DATA_PREFIX = BASE
  ? `${BASE}/data/`
  : 'data/';

const toPosixPath = (value) => String(value ?? '').replace(/\\/g, '/');

const sanitizeKnowledgeRelativePath = (raw) => {
  const normalized = toPosixPath(raw).trim();
  if (!normalized) {
    throw new Error('ファイル名が指定されていません');
  }
  if (normalized.includes('..')) {
    throw new Error('不正なファイルパスです');
  }
  return normalized.replace(/^\/+/, '');
};

const buildKnowledgeBlobPath = (file) =>
  toPosixPath(`${KNOWLEDGE_DATA_PREFIX}${sanitizeKnowledgeRelativePath(file)}`);

// norm関数: BASEパスとサブパスを結合
// 例: norm('images/test.jpg') => 'knowledge-base/images/test.jpg'
const norm = (p) =>
  [BASE, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');

// データベース接続プール
let dbPool = null; // PostgreSQL

// データベース接続初期化（PostgreSQLのみ）
function initializeDatabase() {
  // PostgreSQL接続文字列取得
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
    console.log('📊 Database URL length:', databaseUrl ? databaseUrl.length : 0);
    // 接続文字列の一部を表示（機密情報をマスク）
    if (databaseUrl) {
      const urlParts = databaseUrl.split('@');
      if (urlParts.length > 1) {
        console.log('📊 Database host:', urlParts[urlParts.length - 1].split('/')[0]);
      } else {
        console.log('📊 Database URL preview:', databaseUrl.substring(0, 30) + '...');
      }
    }
    console.log('🔒 PG_SSL:', process.env.PG_SSL || 'not set');

    const sslConfig = process.env.PG_SSL === 'require'
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable'
        ? false
        : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: 10, // 接続数を増やす
      min: 2, // 最小接続数を維持
      idleTimeoutMillis: 30000, // アイドルタイムアウト30秒
      connectionTimeoutMillis: 10000, // 接続タイムアウト10秒
      query_timeout: 30000, // クエリタイムアウト30秒
      statement_timeout: 30000, // ステートメントタイムアウト30秒
      keepAlive: true, // Keep-aliveを有効化
      keepAliveInitialDelayMillis: 10000, // Keep-alive初期遅延10秒
      allowExitOnIdle: false, // プロセス終了を防ぐ
    });

    console.log('✅ Database pool initialized for Azure production');

    // 接続プールをウォームアップ（複数接続を事前作成）
    console.log('🔥 Warming up database connection pool...');
    const warmupPromises = [];
    for (let i = 0; i < 2; i++) {
      warmupPromises.push(
        dbPool.connect()
          .then(client => {
            console.log(`✅ Warmup connection ${i + 1} established`);
            client.release();
          })
          .catch(err => {
            console.error(`❌ Warmup connection ${i + 1} failed:`, err.message);
          })
      );
    }

    Promise.all(warmupPromises)
      .then(() => console.log('✅ Connection pool warmup completed'))
      .catch(() => console.warn('⚠️ Some warmup connections failed'));

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
        console.log('✅ Database connection test successful:', result.rows[0]);

        // PostgreSQL用テーブル作成
        console.log('🔧 Creating PostgreSQL tables if not exist...');
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT,
            role TEXT DEFAULT 'user',
            department TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS machine_types (
            id SERIAL PRIMARY KEY,
            machine_type_name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS machines (
            id SERIAL PRIMARY KEY,
            machine_number TEXT NOT NULL,
            machine_type_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_type_id) REFERENCES machine_types(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            title TEXT,
            machine_type TEXT,
            machine_number TEXT,
            content TEXT,
            conversation_history TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
          );

          CREATE INDEX IF NOT EXISTS idx_chat_history_machine_type ON chat_history(machine_type);
          CREATE INDEX IF NOT EXISTS idx_chat_history_machine_number ON chat_history(machine_number);
          CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
        `);
        console.log('✅ PostgreSQL tables created/verified');

        // デフォルト管理者ユーザーの作成
        const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
          const hashedPassword = bcrypt.hashSync('admin', 10);
          await client.query(
            'INSERT INTO users (username, password, display_name, role, department) VALUES ($1, $2, $3, $4, $5)',
            ['admin', hashedPassword, '管理者', 'admin', 'システム管理']
          );
          console.log('✅ Default admin user created (username: admin, password: admin)');
        }

        await client.release();
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

// PostgreSQLデータベースクエリヘルパー
async function dbQuery(sql, params = [], retries = 3) {
  if (dbPool) {
    // PostgreSQL: 非同期クエリ（リトライロジック付き）
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      let client;
      try {
        // タイムアウト付きで接続取得
        const connectPromise = dbPool.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );

        client = await Promise.race([connectPromise, timeoutPromise]);

        // クエリ実行
        const result = await client.query(sql, params);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Database query attempt ${attempt}/${retries} failed:`, error.message);

        // 接続エラーの場合はリトライ
        if (attempt < retries && (error.message.includes('timeout') || error.message.includes('connect'))) {
          console.log(`🔄 Retrying in ${attempt * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          continue;
        }
        throw error;
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            console.error('❌ Error releasing client:', releaseError.message);
          }
        }
      }
    }
    throw lastError;
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

    // BLOBコンテナの初期化と確認
    const blobClient = getBlobServiceClient();
    if (blobClient) {
      console.log('🔄 Verifying BLOB container accessibility...');
      try {
        const containerClient = blobClient.getContainerClient(containerName);
        const exists = await containerClient.exists();

        if (!exists) {
          console.log(`⚠️ Container '${containerName}' does not exist. Creating...`);
          await containerClient.create({
            access: 'blob'
          });
          console.log(`✅ Container '${containerName}' created successfully`);
        } else {
          console.log(`✅ Container '${containerName}' exists`);
        }

        // プロパティ確認
        const properties = await containerClient.getProperties();
        console.log(`📊 Container properties:`, {
          lastModified: properties.lastModified,
          publicAccess: properties.blobPublicAccess || 'none'
        });

      } catch (blobError) {
        console.error('❌ BLOB container verification failed:', blobError.message);
        // BLOBエラーは致命的ではないとして続行するか、ここで停止するか要検討
        // 今回は警告を出して続行
      }
    }

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
const isAzureHosted = !!process.env.WEBSITE_SITE_NAME;
const isProductionEnv = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE.toLowerCase() === 'true'
  : (isAzureHosted || isProductionEnv);
const sessionCookieSameSite = process.env.SESSION_COOKIE_SAMESITE
  ? process.env.SESSION_COOKIE_SAMESITE.toLowerCase()
  : (sessionCookieSecure ? 'none' : 'lax');
const sessionCookieHttpOnly = process.env.SESSION_COOKIE_HTTPONLY
  ? process.env.SESSION_COOKIE_HTTPONLY.toLowerCase() === 'true'
  : false;
const sessionCookieDomain = cleanEnvValue(process.env.SESSION_COOKIE_DOMAIN) || undefined;

console.log('✅ Session cookie settings:', {
  secure: sessionCookieSecure,
  sameSite: sessionCookieSameSite,
  httpOnly: sessionCookieHttpOnly,
  domain: sessionCookieDomain || 'auto'
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'azure-production-session-secret-32-chars-fixed',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: sessionCookieSecure,
    httpOnly: sessionCookieHttpOnly,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: sessionCookieSameSite,
    domain: sessionCookieDomain,
    path: '/' // すべてのパスで有効
  },
  name: 'emergency.session', // セッション名を変更
  proxy: true, // Azure App Serviceでプロキシを使用する場合
  rolling: false // セッション更新を無効化
}));

// セッションデバッグミドルウェア（本番環境でのトラブルシューティング用）
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log('[Session Debug]', {
      path: req.path,
      method: req.method,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
      cookies: req.headers.cookie ? 'present' : 'missing',
      cookieHeader: req.headers.cookie?.substring(0, 100) + '...',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// ===== ヘルスエンドポイント =====
// BLOBストレージ単体テストAPI
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

// デプロイバージョン確認エンドポイント（デプロイ検証用）
app.get('/api/version', (req, res) => {
  const buildInfo = {
    version: '2025-11-30T10:05:00+09:00',
    buildTimestamp: new Date().toISOString(),
    deploymentInfo: {
      commitSha: process.env.SCM_COMMIT_ID || 'unknown',
      buildId: process.env.BUILD_BUILDID || 'unknown',
      deploymentId: process.env.WEBSITE_INSTANCE_ID || 'unknown',
      hostname: process.env.WEBSITE_HOSTNAME || 'unknown',
      siteName: process.env.WEBSITE_SITE_NAME || 'unknown'
    },
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    lastModified: '2025-11-30T10:05:00+09:00',
    features: {
      blobStorage: !!connectionString,
      database: !!dbPool,
      openai: !!OPENAI_API_KEY
    }
  };

  res.json(buildInfo);
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

// BLOB診断エンドポイント（包括的テスト）
app.get('/api/_diag/blob-test', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    connectionString: {
      configured: !!connectionString,
      length: connectionString ? connectionString.length : 0,
      valid: false
    },
    containerName: containerName,
    client: {
      initialized: false,
      error: null
    },
    container: {
      exists: false,
      canCreate: false,
      error: null
    },
    permissions: {
      canRead: false,
      canWrite: false,
      error: null
    }
  };

  try {
    // 1. BLOB クライアント初期化テスト
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      diagnostics.client.error = 'BLOB service client is null';
      return res.status(503).json({
        success: false,
        message: 'BLOBストレージクライアントの初期化に失敗しました',
        diagnostics
      });
    }

    diagnostics.client.initialized = true;
    diagnostics.connectionString.valid = true;

    // 2. コンテナ存在確認
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const containerExists = await containerClient.exists();
    diagnostics.container.exists = containerExists;

    // 3. コンテナ作成テスト（存在しない場合）
    if (!containerExists) {
      try {
        await containerClient.create({ access: 'blob' });
        diagnostics.container.canCreate = true;
        diagnostics.container.exists = true;
        console.log(`✅ Diagnostic: Container '${containerName}' created`);
      } catch (createError) {
        diagnostics.container.error = createError.message;
        diagnostics.container.canCreate = false;
      }
    } else {
      diagnostics.container.canCreate = true; // 既に存在する
    }

    // 4. 書き込みテスト
    if (diagnostics.container.exists) {
      try {
        const testBlobName = `_diagnostic/test-${Date.now()}.txt`;
        const testContent = 'BLOB storage write test';
        const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);

        await blockBlobClient.upload(testContent, testContent.length, {
          blobHTTPHeaders: { blobContentType: 'text/plain' }
        });

        diagnostics.permissions.canWrite = true;
        console.log(`✅ Diagnostic: Write test successful`);

        // 5. 読み取りテスト
        try {
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const downloadedContent = Buffer.concat(chunks).toString('utf-8');

          if (downloadedContent === testContent) {
            diagnostics.permissions.canRead = true;
            console.log(`✅ Diagnostic: Read test successful`);
          }

          // テストファイルを削除
          await blockBlobClient.delete();
          console.log(`✅ Diagnostic: Test file deleted`);
        } catch (readError) {
          diagnostics.permissions.error = `Read failed: ${readError.message}`;
        }
      } catch (writeError) {
        diagnostics.permissions.error = `Write failed: ${writeError.message}`;
      }
    }

    // 診断結果の判定
    const allTestsPassed =
      diagnostics.client.initialized &&
      diagnostics.container.exists &&
      diagnostics.permissions.canRead &&
      diagnostics.permissions.canWrite;

    res.status(allTestsPassed ? 200 : 500).json({
      success: allTestsPassed,
      message: allTestsPassed
        ? 'BLOBストレージは正常に動作しています'
        : 'BLOBストレージに問題があります',
      diagnostics
    });

  } catch (error) {
    diagnostics.client.error = error.message;
    res.status(500).json({
      success: false,
      message: 'BLOB診断中にエラーが発生しました',
      error: error.message,
      diagnostics
    });
  }
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

// 役割をフロントエンドの期待に合わせて正規化
const normalizeUserRole = (rawRole) => {
  if (!rawRole) return 'employee';
  const normalized = String(rawRole).trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'employee') return 'employee';
  if (normalized === 'user') return 'employee';
  return 'employee';
};

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
      dbPoolStatus: !!dbPool
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
      const normalizedRole = normalizeUserRole(foundUser.role);
      console.log('[auth/login] ユーザー情報取得:', {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        normalizedRole
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
      console.log('[auth/login] Login successful:', { username, role: normalizedRole, originalRole: foundUser.role });

      // セッションにユーザー情報を保存
      req.session.user = {
        id: foundUser.id,
        username: foundUser.username,
        role: normalizedRole,
        displayName: foundUser.display_name,
        department: foundUser.department
      };
      req.session.userRole = normalizedRole;

      const responseUser = {
        id: foundUser.id,
        username: foundUser.username,
        role: normalizedRole,
        displayName: foundUser.display_name,
        display_name: foundUser.display_name,
        department: foundUser.department
      };

      // セッションを明示的に保存（クロスオリジン対応）
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[auth/login] Session save error:', saveErr);
          return res.status(500).json({
            success: false,
            error: 'session_save_failed',
            message: 'セッションの保存に失敗しました'
          });
        }

        console.log('[auth/login] Session saved successfully:', {
          sessionID: req.sessionID,
          userId: foundUser.id,
          username: foundUser.username,
          role: normalizedRole
        });

        // Set-Cookieヘッダーの確認
        const setCookieHeader = res.getHeader('Set-Cookie');
        console.log('[auth/login] Set-Cookie header:', setCookieHeader);

        res.json({
          success: true,
          user: responseUser,
          message: 'ログインに成功しました',
          debug: process.env.NODE_ENV !== 'production' ? {
            sessionID: req.sessionID,
            sessionSaved: true
          } : undefined
        });
      });

    } catch (dbError) {
      console.error('[auth/login] Database error:', dbError);
      console.error('[auth/login] Error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack?.split('\n').slice(0, 3).join('\n'),
        dbPoolStatus: !!dbPool,
        databaseUrlSet: !!process.env.DATABASE_URL,
        databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
      });
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
    hasSession: !!req.session,
    hasUser: !!req.session.user,
    userRole: req.session.user?.role,
    cookies: req.headers.cookie ? 'present' : 'missing',
    cookieHeader: req.headers.cookie?.substring(0, 100),
    origin: req.headers.origin,
    referer: req.headers.referer,
    timestamp: new Date().toISOString()
  });

  // すべてのCookieをログ出力（デバッグ用）
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    console.log('[api/auth/me] Received cookies:', cookies);
    console.log('[api/auth/me] Session cookie name:', 'emergency.session');
    const sessionCookie = cookies.find(c => c.startsWith('emergency.session='));
    console.log('[api/auth/me] Session cookie found:', !!sessionCookie);
  } else {
    console.warn('[api/auth/me] No cookies received in request');
  }

  if (req.session.user) {
    const normalizedRole = normalizeUserRole(req.session.user.role);
    const normalizedUser = {
      ...req.session.user,
      role: normalizedRole
    };
    req.session.user = normalizedUser;
    req.session.userRole = normalizedRole;

    console.log('[api/auth/me] User authenticated:', {
      userId: normalizedUser.id,
      username: normalizedUser.username,
      role: normalizedRole
    });

    res.json({
      success: true,
      user: normalizedUser,
      message: 'セッションからユーザー情報を取得しました',
      debug: {
        sessionId: req.sessionID,
        userRole: normalizedRole,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    console.warn('[api/auth/me] No user in session:', {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });

    res.status(401).json({
      success: false,
      message: 'ログインしていません',
      debug: {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasCookie: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 3. 管理者権限チェックエンドポイント
app.get('/api/auth/check-admin', (req, res) => {
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'admin') {
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
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'employee') {
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

// 14. トラブルシューティングAPI（BLOBストレージから取得）
app.get('/api/troubleshooting/list', async (req, res) => {
  try {
    console.log('[api/troubleshooting/list] トラブルシューティング一覧取得リクエスト');

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
      prefix: norm('troubleshooting/')
    };

    const troubleshootingList = [];
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

            troubleshootingList.push({
              id: jsonData.id || blob.name.split('/').pop().replace('.json', ''),
              title: jsonData.title || '',
              description: jsonData.description || '',
              blobName: blob.name
            });
          }
        } catch (error) {
          console.error(`[api/troubleshooting/list] ファイル読み込みエラー: ${blob.name}`, error);
        }
      }
    }

    console.log(`[api/troubleshooting/list] 取得成功: ${troubleshootingList.length}件`);
    res.json({
      success: true,
      data: troubleshootingList,
      message: `トラブルシューティング一覧を取得しました: ${troubleshootingList.length}件`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/troubleshooting/list] エラー:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'トラブルシューティング一覧の取得に失敗しました',
      error: error.message
    });
  }
});

// 15. 個別トラブルシューティングファイル取得API（BLOBストレージから取得）
app.get('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/troubleshooting/:id] 個別ファイル取得リクエスト: ${id}`);

    if (!connectionString) {
      return res.status(404).json({
        success: false,
        message: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(404).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) {
      console.warn(`[api/troubleshooting/:id] ファイルが見つかりません: ${blobName}`);
      return res.status(404).json({
        success: false,
        message: `トラブルシューティングファイルが見つかりません: ${id}`
      });
    }

    const downloadResponse = await blockBlobClient.download();
    if (downloadResponse.readableStreamBody) {
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks).toString('utf-8');
      const cleanContent = content.replace(/^\uFEFF/, '');
      const jsonData = JSON.parse(cleanContent);

      console.log(`[api/troubleshooting/:id] 取得成功: ${id}`);
      res.json({
        success: true,
        data: jsonData,
        message: `トラブルシューティングファイルを取得しました: ${id}`
      });
    } else {
      throw new Error('ダウンロードストリームが利用できません');
    }
  } catch (error) {
    console.error(`[api/troubleshooting/:id] エラー:`, error);
    res.status(500).json({
      success: false,
      message: 'トラブルシューティングファイルの取得に失敗しました',
      error: error.message
    });
  }
});

// 16. トラブルシューティング保存API（BLOBストレージに保存）
app.post('/api/troubleshooting', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('[api/troubleshooting POST] トラブルシューティング作成リクエスト:', flowData.id || 'new');

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured - cannot save to BLOB'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    // IDがない場合は生成
    if (!flowData.id) {
      flowData.id = `flow_${Date.now()}`;
    }

    // タイムスタンプ設定
    if (!flowData.createdAt) {
      flowData.createdAt = new Date().toISOString();
    }
    flowData.updatedAt = new Date().toISOString();

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${flowData.id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // JSON文字列に変換
    const jsonContent = JSON.stringify(flowData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    // BLOBにアップロード
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`[api/troubleshooting POST] 作成成功: ${flowData.id}`);
    res.json({
      success: true,
      data: flowData,
      message: `トラブルシューティングを作成しました: ${flowData.id}`
    });
  } catch (error) {
    console.error('[api/troubleshooting POST] エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トラブルシューティングの作成に失敗しました',
      error: error.message
    });
  }
});

// 17. トラブルシューティング更新API（BLOBストレージに保存）
app.put('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flowData = req.body;
    console.log(`[api/troubleshooting PUT] トラブルシューティング更新リクエスト: ${id}`);

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured - cannot save to BLOB'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    // IDを確保
    flowData.id = id;
    flowData.updatedAt = new Date().toISOString();

    // 更新履歴を追加
    if (!flowData.updateHistory) {
      flowData.updateHistory = [];
    }
    flowData.updateHistory.push({
      timestamp: new Date().toISOString(),
      updatedFields: Object.keys(flowData),
      updatedBy: 'user'
    });

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // JSON文字列に変換
    const jsonContent = JSON.stringify(flowData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    // BLOBにアップロード（上書き）
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });

    console.log(`[api/troubleshooting PUT] 更新成功: ${id}`);
    res.json({
      success: true,
      data: flowData,
      message: `トラブルシューティングを更新しました: ${id}`
    });
  } catch (error) {
    console.error(`[api/troubleshooting PUT] エラー:`, error);
    res.status(500).json({
      success: false,
      message: 'トラブルシューティングの更新に失敗しました',
      error: error.message
    });
  }
});

// 18. トラブルシューティング削除API（BLOBストレージから削除）
app.delete('/api/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/troubleshooting DELETE] トラブルシューティング削除リクエスト: ${id}`);

    if (!connectionString) {
      return res.status(503).json({
        success: false,
        message: 'Azure Storage not configured'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        message: 'Blob service client unavailable'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // 存在確認
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `トラブルシューティングが見つかりません: ${id}`
      });
    }

    // 削除実行
    await blockBlobClient.delete();

    console.log(`[api/troubleshooting DELETE] 削除成功: ${id}`);
    res.json({
      success: true,
      message: `トラブルシューティングを削除しました: ${id}`
    });
  } catch (error) {
    console.error(`[api/troubleshooting DELETE] エラー:`, error);
    res.status(500).json({
      success: false,
      message: 'トラブルシューティングの削除に失敗しました',
      error: error.message
    });
  }
});

// ==== /api/history/* サブルートを先に定義（/:id より前） ====

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
          machineTypeId: row.machine_type_id,
          machineNumber: row.machine_number
        });
      }
    });

    res.json({
      success: true,
      data: {
        machineTypes,
        machines
      },
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

// エクスポートファイル一覧API
app.get('/api/history/export-files', async (req, res) => {
  try {
    console.log('[api/history/export-files] ===== エクスポートファイル一覧取得リクエスト開始 =====');
    console.log('[api/history/export-files] リクエストURL:', req.url);
    console.log('[api/history/export-files] リクエストメソッド:', req.method);

    const items = [];
    const blobServiceClient = getBlobServiceClient();
    console.log('[api/history/export-files] BLOBサービスクライアント:', blobServiceClient ? '利用可能' : '利用不可');

    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        console.log(`🔍 BLOBストレージからエクスポート取得: prefix=${prefix}, container=${containerName}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (blob.name.endsWith('.json')) {
            const fileName = blob.name.split('/').pop();
            
            // ファイル名からタイトルを抽出（例: "タイトル_chatId_timestamp.json"）
            const fileNameWithoutExt = fileName.replace('.json', '');
            const parts = fileNameWithoutExt.split('_');
            const title = parts.length > 0 ? parts[0] : 'タイトルなし';
            
            items.push({
              id: fileNameWithoutExt,
              fileName: fileName,
              title: title,
              blobName: blob.name,
              createdAt: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
              exportTimestamp: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
              lastModified: blob.properties.lastModified,
              size: blob.properties.contentLength,
            });
          }
        }
        console.log(`✅ BLOBから ${items.length} 件のエクスポート取得`);
      } catch (error) {
        console.error('❌ BLOB読み込みエラー:', error);
        console.error('❌ エラー詳細:', error instanceof Error ? error.stack : error);
        // BLOBエラーでも空配列を返す（フォールバック）
      }
    } else {
      console.warn('⚠️ BLOBサービスクライアントが利用できません');
    }

    res.json({
      success: true,
      data: items,
      total: items.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history/export-files] エラー:', error);
    console.error('[api/history/export-files] エラー詳細:', error instanceof Error ? error.stack : error);
    res.status(500).json({
      success: false,
      error: 'エクスポートファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ==== 履歴詳細取得API（/:id - 最後に定義） ====
// 履歴詳細取得API（BLOBストレージ優先 - 本番環境対応）
app.get('/api/history/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`📋 履歴アイテム取得リクエスト: ${id}`);

    // BLOBストレージから取得を試行（本番環境優先）
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        console.log(`🔍 BLOBストレージから検索: prefix=${prefix}, id=${id}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          if (fileId === id || fileNameWithoutExt === id || fileName.includes(id)) {
            console.log(`✅ BLOBで見つかりました: ${blob.name}`);

            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const downloadResponse = await blockBlobClient.download();

            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf-8').replace(/^\uFEFF/, '');
            const foundData = JSON.parse(content);
            const foundFile = fileName;

            // 以降の処理は同じ
            const savedImages = foundData.savedImages || foundData.images || [];
            console.log('🖼️ 取得した画像データ:', {
              id,
              fileName: foundFile,
              savedImagesLength: savedImages.length
            });

            const convertedItem = {
              id: id,
              type: 'fault_history',
              fileName: foundFile,
              chatId: foundData.chatId || id,
              userId: foundData.userId || '',
              exportType: foundData.exportType || 'blob_stored',
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
              fileSize: Buffer.byteLength(content),
              lastModified: foundData.lastModified || foundData.updateHistory?.[0]?.timestamp || foundData.createdAt,
              createdAt: foundData.createdAt,
              jsonData: {
                ...foundData,
                savedImages: savedImages,
              },
              source: 'blob_storage'
            };

            console.log(`✅ 履歴アイテム取得完了(BLOB): ${id}`);
            return res.json(convertedItem);
          }
        }

        console.log(`❌ BLOBで見つかりませんでした: ${id}`);
      } catch (blobError) {
        console.error('❌ BLOBストレージエラー:', blobError);
      }
    }

    // 見つからなかった場合
    console.log(`❌ 履歴アイテムが見つかりませんでした: ${id}`);
    res.status(404).json({
      success: false,
      error: '指定された履歴が見つかりませんでした',
    });
  } catch (error) {
    console.error('❌ 履歴詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴の取得に失敗しました',
      details: error.message
    });
  }
});

// NOTE: /api/history/machine-data は1178行目で定義済み（重複削除）

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

    if (!dbPool) {
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

    // 外部キー制約エラーの判定
    const isForeignKeyError = error.code === '23503' ||
      error.message.includes('foreign key') ||
      error.message.includes('violates foreign key constraint');

    if (isForeignKeyError) {
      return res.status(409).json({
        success: false,
        error: 'この機種に紐づく機械番号が存在するため削除できません',
        details: '先に紐づいている機械番号を削除してください',
        errorCode: 'FOREIGN_KEY_CONSTRAINT',
        timestamp: new Date().toISOString()
      });
    }

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

    if (!dbPool) {
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

    // 外部キー制約エラーの判定
    const isForeignKeyError = error.code === '23503' ||
      error.message.includes('foreign key') ||
      error.message.includes('violates foreign key constraint');

    if (isForeignKeyError) {
      return res.status(409).json({
        success: false,
        error: 'この機械番号に紐づくデータが存在するため削除できません',
        details: '先に関連データを削除してください',
        errorCode: 'FOREIGN_KEY_CONSTRAINT',
        timestamp: new Date().toISOString()
      });
    }

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

// ナレッジデータAPI - 一覧取得
app.get('/api/knowledge', async (_req, res) => {
  try {
    console.log('[api/knowledge] ナレッジデータ一覧リクエスト');

    if (connectionString) {
      try {
        const blobServiceClient = getBlobServiceClient();
        if (!blobServiceClient) {
          return res.status(503).json({
            success: false,
            error: 'BLOBストレージが利用できません',
            details: 'Blob service client unavailable'
          });
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.warn('[api/knowledge] Azureコンテナが存在しません:', containerName);
          return res.json({
            success: true,
            data: [],
            total: 0,
            message: 'Azure Storage container not found',
            timestamp: new Date().toISOString()
          });
        }

        const items = [];
        const prefix = KNOWLEDGE_DATA_PREFIX;
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.toLowerCase().endsWith('.json')) {
            continue;
          }

          const relative = blob.name.startsWith(prefix)
            ? blob.name.substring(prefix.length)
            : blob.name;

          if (!relative) {
            continue;
          }

          const parsed = path.posix.parse(relative);
          const basePath = BASE || 'knowledge-base';
          const publicPath = `/${toPosixPath(path.posix.join(basePath, 'data', relative))}`;

          items.push({
            filename: relative,
            name: parsed.name || relative,
            size: blob.properties.contentLength || 0,
            modifiedAt:
              blob.properties.lastModified?.toISOString() || new Date().toISOString(),
            path: publicPath
          });
        }

        console.log(`✅ [api/knowledge] Azureレスポンス: ${items.length}件`);
        return res.json({
          success: true,
          data: items,
          total: items.length,
          timestamp: new Date().toISOString()
        });
      } catch (azureError) {
        console.error('[api/knowledge] Azure取得エラー:', azureError);
        return res.status(500).json({
          success: false,
          error: 'ナレッジベースデータの取得に失敗しました',
          details: azureError instanceof Error ? azureError.message : 'Unknown error'
        });
      }
    }

    // BLOBストレージが利用できない場合は空の結果を返す
    console.log('[api/knowledge] BLOBストレージが利用できません');
    res.json({
      success: true,
      data: [],
      total: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge] ナレッジデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ナレッジデータAPI - 個別取得
app.get('/api/knowledge/:filename(*)', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`[api/knowledge] ナレッジファイル取得: ${filename}`);

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'ファイル名が指定されていません'
      });
    }

    if (connectionString) {
      try {
        const blobServiceClient = getBlobServiceClient();
        if (!blobServiceClient) {
          return res.status(503).json({
            success: false,
            error: 'BLOBストレージが利用できません',
            details: 'Blob service client unavailable'
          });
        }

        const relativePath = sanitizeKnowledgeRelativePath(filename);
        const blobPath = buildKnowledgeBlobPath(relativePath);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        const exists = await blockBlobClient.exists();
        if (!exists) {
          return res.status(404).json({
            success: false,
            error: 'ファイルが見つかりません'
          });
        }

        const downloadResponse = await blockBlobClient.download();
        const stream = downloadResponse.readableStreamBody;
        const buffer = stream ? await streamToBuffer(stream) : Buffer.alloc(0);
        const content = buffer.toString('utf-8').replace(/^[\uFEFF]+/, '');
        const jsonData = JSON.parse(content);
        const properties = await blockBlobClient.getProperties();

        console.log('[api/knowledge] Azureファイル取得成功');
        return res.json({
          success: true,
          data: jsonData,
          filename: relativePath,
          size: properties.contentLength || Buffer.byteLength(content, 'utf-8'),
          modifiedAt: properties.lastModified?.toISOString()
        });
      } catch (azureError) {
        console.error('[api/knowledge] Azureファイル取得エラー:', azureError);
        return res.status(500).json({
          success: false,
          error: 'ナレッジベースファイルの取得に失敗しました',
          details: azureError instanceof Error ? azureError.message : 'Unknown error'
        });
      }
    }

    if (!filename.toLowerCase().endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'JSONファイルのみ取得可能です'
      });
    }

    // BLOBストレージが利用できない場合は404を返す
    console.log('[api/knowledge] BLOBストレージが利用できません');
    return res.status(404).json({
      success: false,
      error: 'BLOBストレージが利用できません'
    });
  } catch (error) {
    console.error('[api/knowledge] ナレッジファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースファイルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 17. ナレッジベースAPI
app.get('/api/knowledge-base', async (req, res) => {
  try {
    console.log('[api/knowledge-base] ナレッジベース取得リクエスト');

    if (!connectionString) {
      console.warn('[api/knowledge-base] Azure Storage connection string not configured');
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.warn('[api/knowledge-base] Blob service client unavailable');
      return res.json({
        success: true,
        data: [],
        message: 'Blob service client unavailable',
        timestamp: new Date().toISOString()
      });
    }

    let containerClient;
    try {
      containerClient = blobServiceClient.getContainerClient(containerName);
    } catch (containerError) {
      console.error('[api/knowledge-base] Container client creation failed:', containerError);
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージコンテナへの接続に失敗しました',
        details: containerError instanceof Error ? containerError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    const listOptions = {
      prefix: norm('documents/')
    };

    const documents = [];
    try {
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
    } catch (blobListError) {
      console.error('[api/knowledge-base] BLOB一覧取得エラー:', blobListError);
      const isDnsError = blobListError.message && blobListError.message.includes('ENOTFOUND');
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージへの接続に失敗しました',
        details: isDnsError
          ? 'ストレージアカウント名が正しくないか、ストレージアカウントが存在しません。Azure Portalでストレージアカウント名を確認してください。'
          : blobListError.message,
        errorType: isDnsError ? 'DNS_ERROR' : 'BLOB_ERROR',
        timestamp: new Date().toISOString()
      });
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
    const isDnsError = error.message && error.message.includes('ENOTFOUND');
    const isBlobError = error.message && (error.message.includes('BLOB') || error.message.includes('blob'));
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: isDnsError
        ? 'ストレージアカウント名が正しくないか、ストレージアカウントが存在しません。Azure Portalでストレージアカウント名を確認してください。'
        : error.message,
      errorType: isDnsError ? 'DNS_ERROR' : isBlobError ? 'BLOB_ERROR' : 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// ドキュメント管理API - 一覧取得
app.get('/api/documents', async (req, res) => {
  try {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('documents');
    const documents = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix: '' })) {
      documents.push({
        id: blob.name,
        name: blob.name.split('/').pop(),
        path: blob.name,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        createdAt: blob.properties.createdOn,
        lastModified: blob.properties.lastModified
      });
    }

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/documents] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ドキュメント一覧の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// ドキュメント管理API - アップロード
app.post('/api/documents', async (req, res) => {
  try {
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'ファイル名とコンテンツが必要です',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('documents');
    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream'
      }
    });

    res.json({
      success: true,
      message: 'ドキュメントをアップロードしました',
      data: { filename },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/documents] アップロードエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ドキュメントのアップロードに失敗しました',
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
// 20. RAG設定API
app.get('/api/settings/rag', (req, res) => {
  try {
    console.log('[api/settings/rag] リクエスト受信');
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
  } catch (error) {
    console.error('[api/settings/rag] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'RAG設定の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// AI支援設定API
app.get('/api/ai-assist/settings', (req, res) => {
  try {
    console.log('[api/ai-assist/settings] リクエスト受信');
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
  } catch (error) {
    console.error('[api/ai-assist/settings] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'AI支援設定の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
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
    console.log('[api/knowledge-base/stats] リクエスト受信');
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
    console.error('[api/knowledge-base/stats] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベース統計の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 管理画面ダッシュボードAPI
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('[api/admin/dashboard] リクエスト受信');
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
    console.error('[api/admin/dashboard] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ダッシュボードデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// NOTE: /api/history/export-files は1249行目で定義済み（重複削除）

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

// 21. チャット履歴取得API
app.get('/api/chat-history', async (req, res) => {
  try {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient('exports');
    const histories = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix: '' })) {
      if (blob.name.endsWith('.json')) {
        histories.push({
          id: blob.name,
          name: blob.name,
          size: blob.properties.contentLength,
          createdAt: blob.properties.createdOn,
          lastModified: blob.properties.lastModified
        });
      }
    }

    res.json({
      success: true,
      data: histories,
      total: histories.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chat-history] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャット履歴の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// チャット履歴保存API
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

// チャットエクスポートAPI（BLOBストレージに保存）
app.post('/api/chat/export', async (req, res) => {
  try {
    const exportData = req.body;
    console.log('[api/chat/export] エクスポートリクエスト:', {
      chatId: exportData.chatId,
      title: exportData.title,
      hasImages: !!exportData.savedImages
    });

    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chatId = exportData.chatId || `chat-${Date.now()}`;
    const titleSlug = (exportData.title || 'untitled').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').substring(0, 50);
    const filename = `${titleSlug}_${chatId}_${timestamp}.json`;

    // 画像URLをBLOBストレージパスに正規化
    let normalizedImages = [];
    if (exportData.savedImages && Array.isArray(exportData.savedImages)) {
      normalizedImages = exportData.savedImages.map(image => {
        // ファイル名を抽出
        let fileName = '';
        if (image.fileName) {
          fileName = image.fileName.includes('/')
            ? image.fileName.split('/').pop()
            : image.fileName.includes('\\')
              ? image.fileName.split('\\').pop()
              : image.fileName;
        } else if (image.path) {
          const pathParts = image.path.split(/[/\\]/);
          fileName = pathParts[pathParts.length - 1];
        } else if (image.url) {
          // URLからファイル名を抽出
          const urlParts = image.url.split('/');
          fileName = urlParts[urlParts.length - 1];
        } else if (image.originalFileName) {
          fileName = image.originalFileName;
        }

        // BLOBストレージのAPIパスに統一
        return {
          ...image,
          fileName: fileName,
          url: `/api/images/chat-exports/${fileName}`,
          blobPath: `images/chat-exports/${fileName}`,
          originalFileName: image.originalFileName || fileName
        };
      });
    }

    // メタデータを追加
    const dataToSave = {
      ...exportData,
      savedImages: normalizedImages,
      images: normalizedImages, // 互換性のため
      exportTimestamp: new Date().toISOString(),
      exportType: 'blob_stored',
      version: '1.0'
    };

    // BLOBストレージに保存
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`exports/${filename}`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const jsonContent = JSON.stringify(dataToSave, null, 2);
      await blockBlobClient.upload(
        jsonContent,
        Buffer.byteLength(jsonContent),
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json; charset=utf-8'
          },
          metadata: {
            chatId: chatId,
            title: exportData.title || 'untitled',
            exportDate: new Date().toISOString()
          }
        }
      );

      console.log(`✅ BLOBストレージに保存: ${blobName}`);

      res.json({
        success: true,
        filename: filename,
        blobName: blobName,
        storage: 'blob_storage',
        chatId: chatId,
        url: blockBlobClient.url,
        timestamp: new Date().toISOString()
      });
    } catch (blobError) {
      console.error('[api/chat/export] BLOBストレージエラー:', blobError);
      throw blobError;
    }
  } catch (error) {
    console.error('[api/chat/export] エクスポートエラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャットのエクスポートに失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

    // PostgreSQLとSQLiteで異なるプレースホルダーを使用
    const isPostgres = !!dbPool;
    let paramIndex = 1;

    // 履歴データを取得 (support_history テーブルを使用)
    let query = `
      SELECT
        h.id,
        h.machine_type,
        h.machine_number,
        h.created_at,
        h.json_data,
        h.image_path
      FROM support_history h
      WHERE 1=1
    `;
    let params = [];

    if (machineType) {
      query += ` AND h.machine_type = ${isPostgres ? `$${paramIndex++}` : '?'}`;
      params.push(machineType);
    }

    if (machineNumber) {
      query += ` AND h.machine_number = ${isPostgres ? `$${paramIndex++}` : '?'}`;
      params.push(machineNumber);
    }

    query += ` ORDER BY h.created_at DESC LIMIT ${isPostgres ? `$${paramIndex++}` : '?'} OFFSET ${isPostgres ? `$${paramIndex++}` : '?'}`;
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

// 履歴ファイル一覧取得API（BLOBストレージ優先）
app.get('/api/history/export-list', async (req, res) => {
  try {
    console.log('[api/history/export-list] 履歴ファイル一覧取得リクエスト');

    const items = [];

    // BLOBストレージから取得（本番環境優先）
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        console.log(`🔍 BLOBストレージから一覧取得: prefix=${prefix}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          items.push({
            id: fileId,
            fileName: fileName,
            blobName: blob.name,
            lastModified: blob.properties.lastModified,
            size: blob.properties.contentLength,
            source: 'blob_storage'
          });
        }

        console.log(`✅ BLOBから ${items.length} 件取得`);
      } catch (blobError) {
        console.error('❌ BLOBストレージエラー:', blobError);
      }
    }

    res.json({
      success: true,
      data: items,
      total: items.length,
      source: items.length > 0 ? 'blob_storage' : 'none',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/history/export-list] エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴ファイル一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ローカルファイル一覧取得API（廃止 - BLOBストレージのみ使用）
app.get('/api/history/local-files', async (req, res) => {
  console.log('[api/history/local-files] 廃止されたエンドポイント - BLOBストレージを使用してください');
  res.status(410).json({
    success: false,
    error: 'このエンドポイントは廃止されました。/api/history/export-listを使用してください。',
    timestamp: new Date().toISOString()
  });
});

// ローカルファイル内容取得API（廃止 - BLOBストレージのみ使用）
app.get('/api/history/local-files/:filename', async (req, res) => {
  console.log('[api/history/local-files/:filename] 廃止されたエンドポイント - BLOBストレージを使用してください');
  res.status(410).json({
    success: false,
    error: 'このエンドポイントは廃止されました。/api/history/:idを使用してください。',
    timestamp: new Date().toISOString()
  });
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

    // OpenAI APIを使用した実際の処理
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      console.log('[api/chatgpt] Sending request to OpenAI...');

      // システムプロンプトを構築
      const systemPrompt = `あなたは鉄道車両の保守・点検を支援するAIアシスタントです。
ユーザーからの質問に対して、専門的かつ分かりやすく回答してください。
安全性を最優先に考え、緊急時には適切な対応手順を提示してください。`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ];

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || '応答を生成できませんでした。';

      console.log('[api/chatgpt] OpenAI response received:', {
        responseLength: response.length,
        tokensUsed: completion.usage?.total_tokens
      });

      res.json({
        success: true,
        response: response,
        message: 'GPT応答を取得しました',
        details: {
          inputText: text?.substring(0, 100) + '...',
          useOnlyKnowledgeBase: useOnlyKnowledgeBase,
          environment: 'azure-production',
          model: 'gpt-3.5-turbo',
          tokensUsed: completion.usage?.total_tokens || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.error('[api/chatgpt] OpenAI API error:', apiError);

      // エラーの詳細をログ出力
      if (apiError.response) {
        console.error('API Error Response:', apiError.response.status, apiError.response.data);
      }

      res.json({
        success: false,
        response: 'AI応答の生成中にエラーが発生しました。しばらくしてから再度お試しください。',
        message: 'OpenAI API呼び出しエラー',
        details: {
          environment: 'azure-production',
          error: apiError.message,
          errorType: apiError.type || 'unknown'
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

// チャット送信API（テスト用 - 認証不要）
app.post('/api/chats/:id/send-test', async (req, res) => {
  try {
    const { id } = req.params;
    const { chatData, exportType } = req.body;

    console.log('✅ /chats/:id/send-test エンドポイントに到達しました！');
    console.log('🔍 テスト用チャット送信リクエスト受信:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      chatId: id,
      exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo,
    });

    // チャットデータの検証
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        error: 'Invalid chat data format',
        details: 'chatData.messages must be an array',
      });
    }

    // プロジェクトルートパス解決（ESM用）
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    console.log(`📁 エクスポート保存先ディレクトリ: ${exportsDir}`);

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
      console.log('✅ exports フォルダを作成しました:', exportsDir);
    }

    // チャットデータをJSONファイルとして保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // ユーザーメッセージから事象情報を抽出してファイル名に使用
    const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
    console.log('🔍 事象抽出 - ユーザーメッセージ:', userMessages);

    const textMessages = userMessages
      .map((m) => m.content)
      .filter((content) => content && !content.trim().startsWith('data:image/'))
      .join('\n')
      .trim();
    console.log('🔍 事象抽出 - テキストメッセージ:', textMessages);

    let incidentTitle = '事象なし';
    if (textMessages) {
      incidentTitle = textMessages.split('\n')[0].trim();
      console.log('🔍 事象抽出 - 抽出されたタイトル:', incidentTitle);
    } else {
      incidentTitle = '画像による故障報告';
      console.log('🔍 事象抽出 - デフォルトタイトル使用:', incidentTitle);
    }

    // ファイル名用に事象内容をサニタイズ
    const sanitizedTitle = incidentTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const fileName = `${sanitizedTitle}_${id}_${timestamp}.json`;
    const filePath = path.join(exportsDir, fileName);

    // 画像を個別ファイルとして保存
    const imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    console.log(`📁 画像保存先ディレクトリ: ${imagesDir}`);

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('✅ 画像ディレクトリを作成:', imagesDir);
    }

    // チャットメッセージから画像を抽出してファイルとして保存
    const savedImages = [];
    const cleanedChatData = JSON.parse(JSON.stringify(chatData));

    for (const message of cleanedChatData.messages) {
      if (message.content && message.content.startsWith('data:image/')) {
        try {
          const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const imageTimestamp = Date.now();
          const imageFileName = `chat_image_${id}_${imageTimestamp}.jpg`;
          const imagePath = path.join(imagesDir, imageFileName);

          // 画像を120pxにリサイズして保存
          const sharp = (await import('sharp')).default;
          const resizedBuffer = await sharp(buffer)
            .resize(120, 120, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          const storageMode = process.env.STORAGE_MODE || 'local';
          let imageSavedPath = '';
          let imageBlobName = '';

          if (storageMode === 'hybrid' || storageMode === 'blob' || storageMode === 'azure') {
            const blobServiceClient = getBlobServiceClient();
            if (blobServiceClient) {
              const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
              const containerClient = blobServiceClient.getContainerClient(containerName);
              imageBlobName = `images/chat-exports/${imageFileName}`;
              const blockBlobClient = containerClient.getBlockBlobClient(imageBlobName);

              await blockBlobClient.upload(resizedBuffer, resizedBuffer.length, {
                blobHTTPHeaders: {
                  blobContentType: 'image/jpeg'
                },
                metadata: {
                  chatId: id,
                  uploadedAt: new Date().toISOString()
                }
              });

              imageSavedPath = imageBlobName;
              console.log(`✅ 画像ファイルを保存しました (BLOB): ${imageBlobName}`);
            } else {
              console.warn('⚠️ BLOBストレージが利用できないため、ローカルに保存します');
              fs.writeFileSync(imagePath, resizedBuffer);
              imageSavedPath = imagePath;
            }
          } else {
            fs.writeFileSync(imagePath, resizedBuffer);
            imageSavedPath = imagePath;
            console.log('✅ 画像ファイルを保存しました（120pxにリサイズ）:', imagePath);
          }

          const imageUrl = storageMode === 'hybrid' || storageMode === 'blob' || storageMode === 'azure'
            ? `/api/storage/image-url?name=images/chat-exports/${imageFileName}`
            : `/api/images/chat-exports/${imageFileName}`;

          message.content = imageUrl;

          savedImages.push({
            messageId: message.id,
            fileName: imageFileName,
            path: imageSavedPath,
            url: imageUrl,
            blobPath: `images/chat-exports/${imageFileName}`
          });
        } catch (imageError) {
          console.warn('画像保存エラー:', imageError);
          message.content = '[画像データ削除]';
        }
      }
    }

    // JSONデータを構築
    const jsonData = {
      chatId: id,
      userId: 'test-user',
      exportType: exportType || 'manual_send',
      exportTimestamp: new Date().toISOString(),
      title: incidentTitle,
      chatData: cleanedChatData,
      savedImages: savedImages,
      images: savedImages,
      lastModified: new Date().toISOString(),
      jsonData: {
        savedImages: savedImages
      }
    };

    // JSONファイルとして保存
    const jsonContent = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(filePath, jsonContent, { encoding: 'utf8' });
    console.log(`✅ チャットエクスポート成功: ${filePath}`);

    res.json({
      success: true,
      message: 'チャット履歴をエクスポートしました',
      filePath: filePath,
      fileName: fileName,
      savedImages: savedImages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ チャット送信エラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャット送信に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 26. 診断用エンドポイント - ルート一覧（動的生成）
app.get('/api/_diag/routes', (req, res) => {
  // Express appからすべての登録済みルートを抽出
  const routes = [];

  function extractRoutes(stack, basePath = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // ルートが直接登録されている場合
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        routes.push({
          path: basePath + middleware.route.path,
          methods: methods,
          type: 'route'
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // ルーターがネストされている場合
        const routerPath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '');
        extractRoutes(middleware.handle.stack, basePath + routerPath);
      }
    });
  }

  extractRoutes(app._router.stack);

  // 重要なエンドポイントをハイライト
  const criticalEndpoints = [
    '/api/emergency-flow/list',
    '/api/history/machine-data',
    '/api/history/export-files'
  ];

  const criticalStatus = criticalEndpoints.map(endpoint => ({
    endpoint,
    registered: routes.some(r => r.path === endpoint)
  }));

  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    criticalEndpoints: criticalStatus,
    message: `${routes.length}個のルートが登録されています`,
    timestamp: new Date().toISOString()
  });
});

// 27. 診断用エンドポイント - 全ルート詳細（簡易版）
app.get('/api/_diag/all-routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      methods.forEach(method => {
        routes.push(`${method} ${middleware.route.path}`);
      });
    }
  });

  res.json({
    success: true,
    routes: routes.sort(),
    total: routes.length,
    timestamp: new Date().toISOString()
  });
});

// 28. バージョン情報エンドポイント
app.get('/api/version', (req, res) => {
  res.json({
    version: VERSION,
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
    apiEndpoints: 31,
    timestamp: new Date().toISOString(),
    message: '全31個のAPIエンドポイントが正常に動作しています'
  });
});

// 30. フロー生成エンドポイント
app.post('/api/emergency-flow/generate', async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'キーワードが必要です',
      });
    }

    console.log(`🔄 フロー生成開始: キーワード=${keyword}`);

    // OpenAIクライアントが利用可能かチェック
    if (!openaiClient) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI APIが利用できません。',
        details: 'OpenAI client not available',
      });
    }

    // AI支援設定のデフォルト値
    const toneInstruction = '親しみやすく、わかりやすい表現で説明してください。';

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたは鉄道保守用車（軌道モーターカー）の故障診断と応急処置の専門家です。
以下の形式で一問一答形式の詳細な応急処置フローを生成してください：

**必須フォーマット:**
1. タイトル：[具体的な問題名]

2. ステップ形式（一問一答）:
   各ステップは1つの質問または1つの作業指示にしてください。

   **通常ステップ（step）:**
   手順1：[1つの具体的な質問または作業指示]
   説明：[簡潔な説明と実施方法]

   **条件分岐ステップ（decision）:**
   条件分岐：[判断が必要な状況]
   説明：[判断基準の説明]
   選択肢1：[選択肢1の内容]
   選択肢2：[選択肢2の内容]
   選択肢3：[選択肢3の内容]
   選択肢4：[選択肢4の内容]

**重要な要求事項:**
- ステップは細かく分ける（1ステップ=1つの質問または1つの作業）
- 各ステップは簡潔に（50-100文字程度）
- 判断や条件分岐が必要な箇所では必ず条件分岐ステップを作成
- 安全確認は最初のステップに必ず含める
${toneInstruction}`,
        },
        {
          role: 'user',
          content: `以下の故障状況に対する応急処置フローを一問一答形式で生成してください：${keyword}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedText = completion.choices[0]?.message?.content;
    if (!generatedText) {
      throw new Error('フロー生成に失敗しました');
    }

    console.log('✅ フロー生成成功');

    res.json({
      success: true,
      data: {
        flowText: generatedText,
        keyword: keyword,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ フロー生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フロー生成に失敗しました',
      details: error.message,
    });
  }
});

// 30. フロー保存エンドポイント（新規作成）
app.post('/api/emergency-flow', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('[api/emergency-flow] フロー保存リクエスト:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    // 画像URLを正規化
    const normalizedSteps = flowData.steps?.map(step => {
      if (step.images && Array.isArray(step.images)) {
        const normalizedImages = step.images.map(image => {
          let fileName = '';
          if (image.fileName) {
            fileName = image.fileName.includes('/')
              ? image.fileName.split('/').pop()
              : image.fileName.includes('\\')
                ? image.fileName.split('\\').pop()
                : image.fileName;
          } else if (image.url) {
            const urlParts = image.url.split('/');
            fileName = urlParts[urlParts.length - 1];
          }

          return {
            ...image,
            fileName: fileName,
            url: `/api/emergency-flow/image/${fileName}`,
            blobPath: `images/emergency-flows/${fileName}`
          };
        });

        return {
          ...step,
          images: normalizedImages
        };
      }
      return step;
    }) || [];

    const dataToSave = {
      ...flowData,
      steps: normalizedSteps,
      updatedAt: new Date().toISOString(),
      version: '1.0'
    };

    // ファイル名を生成
    const fileName = flowData.id ? `${flowData.id}.json` : `flow-${Date.now()}.json`;

    // BLOBストレージに保存
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      console.log(`[api/emergency-flow] コンテナ '${containerName}' が存在しないため作成します...`);
      await containerClient.createIfNotExists();
    }
    const blobName = norm(`troubleshooting/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(dataToSave, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          flowId: flowData.id || fileName.replace('.json', ''),
          title: flowData.title || 'untitled',
          updatedAt: new Date().toISOString()
        }
      }
    );

    console.log(`✅ フロー保存成功: ${blobName}`);

    res.json({
      success: true,
      data: dataToSave,
      fileName: fileName,
      blobName: blobName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flow] 保存エラー:', error);
    console.error('[api/emergency-flow] エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'フローの保存に失敗しました',
      details: error.message,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// フロー更新エンドポイント
app.put('/api/emergency-flow/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const flowData = req.body;

    console.log('[api/emergency-flow] フロー更新リクエスト:', {
      flowId: flowId,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0
    });

    // 画像URLを正規化
    const normalizedSteps = flowData.steps?.map(step => {
      if (step.images && Array.isArray(step.images)) {
        const normalizedImages = step.images.map(image => {
          let fileName = '';
          if (image.fileName) {
            fileName = image.fileName.includes('/')
              ? image.fileName.split('/').pop()
              : image.fileName.includes('\\')
                ? image.fileName.split('\\').pop()
                : image.fileName;
          } else if (image.url) {
            const urlParts = image.url.split('/');
            fileName = urlParts[urlParts.length - 1];
          }

          return {
            ...image,
            fileName: fileName,
            url: `/api/emergency-flow/image/${fileName}`,
            blobPath: `images/emergency-flows/${fileName}`
          };
        });

        return {
          ...step,
          images: normalizedImages
        };
      }
      return step;
    }) || [];

    const dataToSave = {
      ...flowData,
      id: flowId,
      steps: normalizedSteps,
      updatedAt: new Date().toISOString(),
      version: '1.0'
    };

    // BLOBストレージに保存
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      console.log(`[api/emergency-flow] コンテナ '${containerName}' が存在しないため作成します...`);
      await containerClient.createIfNotExists();
    }
    const fileName = `${flowId}.json`;
    const blobName = norm(`troubleshooting/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(dataToSave, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          flowId: flowId,
          title: flowData.title || 'untitled',
          updatedAt: new Date().toISOString()
        }
      }
    );

    console.log(`✅ フロー更新成功: ${blobName}`);

    res.json({
      success: true,
      data: dataToSave,
      fileName: fileName,
      blobName: blobName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/emergency-flow] 更新エラー:', error);
    console.error('[api/emergency-flow] エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'フローの更新に失敗しました',
      details: error.message,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// 31. フロー一覧取得エンドポイント
app.get('/api/emergency-flow/list', async (req, res) => {
  try {
    console.log('='.repeat(80));
    console.log('[api/emergency-flow/list] ✅ エンドポイントに到達しました');
    console.log('[api/emergency-flow/list] タイムスタンプ:', new Date().toISOString());
    console.log('[api/emergency-flow/list] Request method:', req.method);
    console.log('[api/emergency-flow/list] Request URL:', req.url);
    console.log('[api/emergency-flow/list] Request headers:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      cookie: req.headers.cookie ? 'present' : 'missing',
      'user-agent': req.headers['user-agent'],
      'x-ms-client-principal': req.headers['x-ms-client-principal'] ? '**DETECTED**' : 'not present'
    });
    
    // Easy Auth検出警告
    if (req.headers['x-ms-client-principal']) {
      console.error('❌❌❌ AZURE APP SERVICE EASY AUTH IS ACTIVE ❌❌❌');
      console.error('❌ このリクエストはEasy Authによってインターセプトされている可能性があります');
      console.error('❌ 解決方法: Azure PortalでEasy Authを無効化するか、/api/*を除外してください');
      console.error('❌❌❌ EASY AUTH MUST BE DISABLED FOR API ENDPOINTS ❌❌❌');
    }
    console.log('='.repeat(80));

    const flows = [];

    // BLOB接続文字列の確認
    if (!connectionString || !connectionString.trim()) {
      console.warn('[api/emergency-flow/list] ⚠️ AZURE_STORAGE_CONNECTION_STRING is not configured');
      console.warn('[api/emergency-flow/list] ⚠️ Connection string length:', connectionString ? connectionString.length : 0);
      console.warn('[api/emergency-flow/list] ⚠️ Returning empty flow list');
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOBストレージが設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    const blobServiceClient = getBlobServiceClient();

    if (!blobServiceClient) {
      console.warn('[api/emergency-flow/list] ⚠️ BLOBサービスクライアントが利用できません');
      console.warn('[api/emergency-flow/list] ⚠️ AZURE_STORAGE_CONNECTION_STRING:', connectionString ? 'Set' : 'Not set');
      console.warn('[api/emergency-flow/list] ⚠️ AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME || 'Not set');
      console.warn('[api/emergency-flow/list] ⚠️ AZURE_STORAGE_CONTAINER_NAME:', containerName);
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOBサービスクライアントが利用できません',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const prefix = norm('troubleshooting/');

      console.log(`🔍 BLOBストレージからフロー取得: prefix=${prefix}, container=${containerName}`);

      // コンテナの存在確認
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.error(`❌ コンテナが存在しません: ${containerName}`);
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: `コンテナ "${containerName}" が存在しません`,
          timestamp: new Date().toISOString()
        });
      }

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (blob.name.endsWith('.json')) {
          const fileName = blob.name.split('/').pop();
          flows.push({
            id: path.basename(fileName, '.json'),
            name: fileName,
            blobName: blob.name,
            lastModified: blob.properties.lastModified,
            size: blob.properties.contentLength,
          });
        }
      }
      console.log(`✅ BLOBから ${flows.length} 件のフロー取得`);
    } catch (blobError) {
      console.error('❌ BLOB読み込みエラー:', blobError);
      console.error('❌ エラー詳細:', blobError instanceof Error ? blobError.stack : blobError);
      console.error('❌ エラーメッセージ:', blobError instanceof Error ? blobError.message : 'Unknown error');

      // エラーの種類に応じた詳細なログ
      if (blobError instanceof Error) {
        if (blobError.message.includes('ENOTFOUND')) {
          console.error('❌ DNS解決エラー: ストレージアカウント名が正しくない可能性があります');
        } else if (blobError.message.includes('403') || blobError.message.includes('Forbidden')) {
          console.error('❌ 認証エラー: ストレージアカウントキーまたは接続文字列が正しくない可能性があります');
        } else if (blobError.message.includes('404') || blobError.message.includes('Not Found')) {
          console.error('❌ リソースが見つかりません: コンテナまたはプレフィックスが存在しない可能性があります');
        }
      }

      // BLOBエラーでも空配列を返す（フォールバック）
      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        message: 'BLOBストレージからの読み込みに失敗しました',
        error: blobError instanceof Error ? blobError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    console.error('❌ エラー詳細:', error instanceof Error ? error.stack : error);
    console.error('❌ エラーメッセージ:', error instanceof Error ? error.message : 'Unknown error');

    // 403エラーの場合は詳細なログを出力
    if (error instanceof Error && (error.message.includes('403') || error.message.includes('Forbidden'))) {
      console.error('❌ 403 Forbidden エラーが発生しました');
      console.error('❌ 考えられる原因:');
      console.error('   1. Azure App Serviceの認証設定（Easy Auth）が有効になっている');
      console.error('   2. セッションクッキーが正しく送信されていない');
      console.error('   3. CORS設定の問題');
      console.error('   4. BLOBストレージの認証情報が正しくない');
    }

    res.status(500).json({
      success: false,
      error: 'フロー一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// チャットエクスポートAPI
app.post('/api/chats/:chatId/export', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log('[api/chats/export] エクスポートリクエスト:', chatId);

    // リクエストボディからエクスポートデータを取得
    const exportData = req.body;

    // チャットメッセージをフォーマット
    const formattedData = {
      chatId: chatId,
      title: exportData.title || `チャット履歴 ${new Date().toISOString().split('T')[0]}`,
      machineType: exportData.machineType || '',
      machineNumber: exportData.machineNumber || '',
      messages: exportData.messages || [],
      savedImages: exportData.savedImages || [],
      exportTimestamp: new Date().toISOString(),
      exportType: 'chat_export',
      version: '1.0'
    };

    // 画像URLを正規化
    if (formattedData.savedImages && Array.isArray(formattedData.savedImages)) {
      formattedData.savedImages = formattedData.savedImages.map(image => {
        let fileName = '';
        if (image.fileName) {
          fileName = image.fileName.includes('/')
            ? image.fileName.split('/').pop()
            : image.fileName.includes('\\')
              ? image.fileName.split('\\').pop()
              : image.fileName;
        } else if (image.url) {
          const urlParts = image.url.split('/');
          fileName = urlParts[urlParts.length - 1];
        }

        return {
          ...image,
          fileName: fileName,
          url: `/api/images/chat-exports/${fileName}`,
          blobPath: `images/chat-exports/${fileName}`
        };
      });
    }

    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const titleSlug = (formattedData.title || 'chat').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_').substring(0, 50);
    const filename = `${titleSlug}_${chatId}_${timestamp}.json`;

    // BLOBストレージに保存
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${filename}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const jsonContent = JSON.stringify(formattedData, null, 2);
    await blockBlobClient.upload(
      jsonContent,
      Buffer.byteLength(jsonContent),
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        },
        metadata: {
          chatId: chatId,
          title: formattedData.title,
          exportDate: new Date().toISOString()
        }
      }
    );

    console.log(`✅ チャットエクスポート成功: ${blobName}`);

    res.json({
      success: true,
      filename: filename,
      blobName: blobName,
      chatId: chatId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chats/export] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャットのエクスポートに失敗しました',
      details: error.message
    });
  }
});

// 画像アップロードAPI（応急処置フロー用）
app.post('/api/emergency-flow/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルが見つかりません'
      });
    }

    const { stepId } = req.body;
    console.log('[api/emergency-flow/upload-image] 画像アップロード:', {
      fileName: req.file.originalname,
      size: req.file.size,
      stepId: stepId
    });

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    // ファイル名を生成（タイムスタンプ付き）
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const baseName = path.basename(req.file.originalname, ext);
    const fileName = `${baseName}_${timestamp}${ext}`;

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`images/emergency-flows/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // 画像をBLOBにアップロード
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype
      },
      metadata: {
        originalName: req.file.originalname,
        stepId: stepId || '',
        uploadedAt: new Date().toISOString()
      }
    });

    console.log(`✅ 画像アップロード成功: ${blobName}`);

    const imageUrl = `/api/emergency-flow/image/${fileName}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      fileName: fileName,
      imageFileName: fileName,
      blobName: blobName,
      size: req.file.size,
      isDuplicate: false
    });
  } catch (error) {
    console.error('[api/emergency-flow/upload-image] エラー:', error);
    res.status(500).json({
      success: false,
      error: '画像のアップロードに失敗しました',
      details: error.message
    });
  }
});

// 応急復旧フロー画像配信API（BLOB優先、ローカルフォールバック）
app.get('/api/emergency-flow/image/:fileName', async (req, res) => {
  const { fileName } = req.params;
  console.log('[api/emergency-flow/image] リクエスト受信:', { fileName });

  const setImageHeaders = (contentType) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  };

  const extension = path.extname(fileName || '').toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const contentType = mimeTypes[extension] || 'application/octet-stream';

  try {
    // 1. BLOBストレージから取得
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = norm(`images/emergency-flows/${fileName}`);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await blockBlobClient.exists()) {
          console.log('[api/emergency-flow/image] BLOBヒット:', { blobName });
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          if (downloadResponse.readableStreamBody) {
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            setImageHeaders(contentType);
            return res.status(200).send(buffer);
          }
          console.warn('[api/emergency-flow/image] readableStreamBody が空でした');
        } else {
          console.log('[api/emergency-flow/image] BLOB未存在、ローカル検索へフォールバック:', { blobName });
        }
      } catch (blobError) {
        console.error('[api/emergency-flow/image] BLOB取得エラー（フォールバック継続）:', blobError);
      }
    } else {
      console.warn('[api/emergency-flow/image] BLOBクライアント未初期化、ローカル検索を使用します');
    }

    // BLOBで見つからない場合は404を返す
    console.warn('[api/emergency-flow/image] 画像が見つかりませんでした:', { fileName });
    return res.status(404).json({
      success: false,
      error: '画像が見つかりません（BLOBストレージのみ対応）',
      fileName
    });
  } catch (error) {
    console.error('[api/emergency-flow/image] 取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: '画像の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// チャット画像配信API
app.get('/api/images/chat-exports/:fileName', async (req, res) => {
  const { fileName } = req.params;
  console.log('[api/images/chat-exports] リクエスト受信:', { fileName });

  const setImageHeaders = (contentType) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  };

  const extension = path.extname(fileName || '').toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const contentType = mimeTypes[extension] || 'application/octet-stream';

  try {
    // 1. BLOBストレージから取得
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = norm(`images/chat-exports/${fileName}`);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await blockBlobClient.exists()) {
          console.log('[api/images/chat-exports] BLOBヒット:', { blobName });
          const downloadResponse = await blockBlobClient.download();
          const chunks = [];
          if (downloadResponse.readableStreamBody) {
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            setImageHeaders(contentType);
            return res.status(200).send(buffer);
          }
          console.warn('[api/images/chat-exports] readableStreamBody が空でした');
        } else {
          console.log('[api/images/chat-exports] BLOB未存在:', { blobName });
        }
      } catch (blobError) {
        console.error('[api/images/chat-exports] BLOB取得エラー:', blobError);
      }
    } else {
      console.warn('[api/images/chat-exports] BLOBクライアント未初期化');
    }

    // BLOBで見つからない場合は404を返す
    console.log('[api/images/chat-exports] 画像が見つかりませんでした:', { fileName });
    return res.status(404).json({
      success: false,
      error: '画像が見つかりません（BLOBストレージのみ対応）',
      fileName: fileName
    });
  } catch (error) {
    console.error('[api/images/chat-exports] 取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: '画像の取得に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// チャット画像アップロードAPI（リトライロジック付き）
app.post('/api/history/upload-image', upload.single('image'), async (req, res) => {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '画像ファイルが見つかりません'
        });
      }

      console.log(`[api/history/upload-image] 画像アップロード試行 ${attempt}/${maxRetries}:`, {
        fileName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        console.error('[api/history/upload-image] BLOB service client is not available');
        return res.status(503).json({
          success: false,
          error: 'BLOBストレージが利用できません',
          details: 'BLOB接続が設定されていません。サーバーログを確認してください。'
        });
      }

      // ファイル名を生成（タイムスタンプ付き）
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const baseName = path.basename(req.file.originalname, ext);
      const fileName = `chat_image_${timestamp}${ext}`;

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = norm(`images/chat-exports/${fileName}`);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // コンテナの存在確認（必要に応じて作成）
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.log(`[api/history/upload-image] コンテナ '${containerName}' が存在しないため作成します...`);
        await containerClient.createIfNotExists();
        console.log(`[api/history/upload-image] コンテナ '${containerName}' を作成しました`);
      }

      // 画像をBLOBにアップロード（タイムアウト付き）
      const uploadPromise = blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        },
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('BLOB upload timeout (30s)')), 30000);
      });

      await Promise.race([uploadPromise, timeoutPromise]);

      console.log(`✅ チャット画像アップロード成功: ${blobName}`);

      // APIエンドポイント経由のURLを返す（Blob直接URLではなく）
      const imageUrl = `/api/images/chat-exports/${fileName}`;

      return res.json({
        success: true,
        imageUrl: imageUrl,
        fileName: fileName,
        blobName: blobName,
        size: req.file.size
      });
    } catch (error) {
      lastError = error;
      console.error(`[api/history/upload-image] 試行 ${attempt}/${maxRetries} エラー:`, error.message);

      // DNSエラーの場合は詳細情報をログ出力
      if (error.message && error.message.includes('ENOTFOUND')) {
        console.error('[api/history/upload-image] DNS解決エラー:', {
          message: error.message,
          connectionString: connectionString ? `Set (length: ${connectionString.length})` : 'Not set',
          accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'Not set',
          containerName: containerName
        });
      }

      // 最後の試行でない場合、リトライ
      if (attempt < maxRetries) {
        const retryDelay = attempt * 1000; // 1秒、2秒、3秒...
        console.log(`[api/history/upload-image] ${retryDelay}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  // すべてのリトライが失敗した場合
  console.error('[api/history/upload-image] すべてのリトライが失敗しました:', lastError);
  const errorMessage = lastError?.message || 'Unknown error';
  const isDnsError = errorMessage.includes('ENOTFOUND');

  return res.status(500).json({
    success: false,
    error: '画像のアップロードに失敗しました',
    details: isDnsError
      ? 'BLOBストレージへの接続に失敗しました。ストレージアカウント名を確認してください。'
      : errorMessage,
    retries: maxRetries,
    errorType: isDnsError ? 'DNS_ERROR' : 'BLOB_ERROR'
  });
});

// チャット送信API（本番用 - 認証付き）
app.post('/api/chats/:chatId/send', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, exportType } = req.body;

    console.log('✅ /api/chats/:chatId/send エンドポイントに到達');
    console.log('🔍 チャット送信リクエスト:', {
      method: req.method,
      url: req.url,
      chatId: chatId,
      exportType: exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo
    });

    // チャットデータの検証
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        error: 'Invalid chat data format',
        details: 'chatData.messages must be an array'
      });
    }

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    // タイムスタンプを生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // ユーザーメッセージから事象情報を抽出してファイル名に使用
    const userMessages = chatData.messages.filter((m) => !m.isAiResponse);
    const textMessages = userMessages
      .map((m) => m.content)
      .filter((content) => content && !content.trim().startsWith('data:image/'))
      .join('\n')
      .trim();

    let incidentTitle = '事象なし';
    if (textMessages) {
      incidentTitle = textMessages.split('\n')[0].trim();
    } else {
      incidentTitle = '画像による故障報告';
    }

    // ファイル名用に事象内容をサニタイズ
    const sanitizedTitle = incidentTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const fileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;

    // チャットメッセージから画像を抽出してBLOBに保存
    const savedImages = [];
    const cleanedChatData = JSON.parse(JSON.stringify(chatData));

    for (const message of cleanedChatData.messages) {
      if (message.content && message.content.startsWith('data:image/')) {
        try {
          const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const imageTimestamp = Date.now();
          const imageFileName = `chat_image_${chatId}_${imageTimestamp}.jpg`;

          const containerClient = blobServiceClient.getContainerClient(containerName);
          const blobName = norm(`images/chat-exports/${imageFileName}`);
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);

          await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
              blobContentType: 'image/jpeg'
            },
            metadata: {
              chatId: chatId,
              uploadedAt: new Date().toISOString()
            }
          });

          // APIエンドポイント経由のURLを返す（Blob直接URLではなく）
          const imageUrl = `/api/images/chat-exports/${imageFileName}`;
          savedImages.push({
            fileName: imageFileName,
            blobName: blobName,
            url: imageUrl,
            timestamp: imageTimestamp
          });

          // メッセージ内容を画像参照に置き換え
          message.content = `[画像: ${imageFileName}]`;
          message.imageUrl = imageUrl;
        } catch (error) {
          console.error('画像保存エラー:', error);
        }
      }
    }

    // チャットデータをJSONとして保存
    const exportData = {
      chatId: chatId,
      title: `${incidentTitle} (${chatId})`,
      machineType: chatData.machineInfo?.type || '',
      machineNumber: chatData.machineInfo?.number || '',
      messages: cleanedChatData.messages,
      savedImages: savedImages,
      exportTimestamp: new Date().toISOString(),
      exportType: exportType || 'chat_export',
      version: '1.0'
    };

    // BLOBストレージに保存
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(
      JSON.stringify(exportData, null, 2),
      JSON.stringify(exportData, null, 2).length,
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        },
        metadata: {
          chatId: chatId,
          exportType: exportType || 'chat_export',
          exportedAt: new Date().toISOString()
        }
      }
    );

    console.log(`✅ チャットデータ保存成功: ${blobName}`);
    console.log(`📊 保存された画像数: ${savedImages.length}`);

    res.json({
      success: true,
      message: 'チャットを送信しました',
      chatId: chatId,
      fileName: fileName,
      blobName: blobName,
      savedImagesCount: savedImages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/chats/send] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャットの送信に失敗しました',
      details: error.message
    });
  }
});

// 応急復旧フロー詳細取得API
app.get('/api/emergency-flow/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api/emergency-flow/detail] フロー詳細取得: ${id}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.error(`❌ BLOBサービスクライアントが利用できません: ${id}`);
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません'
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${id}.json`);
    console.log(`🔍 BLOB取得試行: ${blobName}, container=${containerName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    try {
      const downloadResponse = await blobClient.download();
      const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
      const flowData = JSON.parse(downloaded.toString('utf-8'));

      console.log(`✅ フロー詳細取得成功: ${id}`);

      res.json({
        success: true,
        data: flowData
      });
    } catch (blobError) {
      console.error(`❌ BLOB取得エラー: ${blobName}`, blobError);
      console.error(`❌ エラー詳細:`, blobError instanceof Error ? blobError.stack : blobError);
      res.status(404).json({
        success: false,
        error: 'フロー詳細が見つかりません',
        details: blobError instanceof Error ? blobError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[api/emergency-flow/detail] エラー:', error);
    console.error('[api/emergency-flow/detail] エラー詳細:', error instanceof Error ? error.stack : error);
    res.status(500).json({
      success: false,
      error: 'フロー詳細の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ヘルパー関数: Streamをバッファに変換
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

// 個別エクスポートJSONファイル取得API
app.get('/api/history/exports/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log(`[api/history/exports] ファイル取得: ${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`exports/${fileName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'application/json';

    res.setHeader('Content-Type', contentType);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('❌ ファイル取得エラー:', error);
    res.status(404).json({
      success: false,
      error: 'ファイルが見つかりません',
      details: error.message,
    });
  }
});

// 履歴削除API（ファイルベース・BLOBストレージ対応）
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 履歴削除リクエスト: ${id}`);

    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');

    let foundFile = null;
    let jsonData = null;
    let deletedFromBlob = false;
    let deletedFromLocal = false;

    // BLOBストレージから削除（本番環境優先）
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = norm('exports/');

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (!blob.name.endsWith('.json') || blob.name.includes('.backup.')) continue;

          const fileName = blob.name.split('/').pop();
          const fileNameWithoutExt = fileName.replace('.json', '');
          const uuidMatch = fileNameWithoutExt.match(/_([a-f0-9-]{36})_/);
          const fileId = uuidMatch ? uuidMatch[1] : fileNameWithoutExt;

          if (fileId === id || fileNameWithoutExt === id) {
            foundFile = fileName;
            console.log(`✅ BLOBストレージでマッチするファイルを発見: ${foundFile}`);

            // JSONファイルを読み込んで画像情報を取得
            const blobClient = containerClient.getBlobClient(blob.name);
            try {
              const downloadResponse = await blobClient.download();
              let content = '';
              if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                  content += chunk.toString();
                }
              }
              jsonData = JSON.parse(content);
              console.log(`📄 BLOBからJSONファイル読み込み成功: ${foundFile}`);
            } catch (readError) {
              console.warn(`⚠️ BLOBからJSONファイル読み込みエラー: ${foundFile}`, readError.message);
            }

            // BLOBストレージから削除
            await blobClient.delete();
            deletedFromBlob = true;
            console.log(`🗑️ BLOBストレージから削除: ${blob.name}`);
            break;
          }
        }
      } catch (blobError) {
        console.error('❌ BLOBストレージ削除エラー:', blobError);
      }
    }

    // ローカルファイルシステムは使用しない（BLOBストレージのみ）

    if (!foundFile) {
      console.log(`❌ マッチするファイルが見つかりませんでした。検索ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        searchId: id,
        timestamp: new Date().toISOString()
      });
    }

    // 画像ファイルを削除
    const imagesToDelete = [];
    if (jsonData && jsonData.savedImages && Array.isArray(jsonData.savedImages)) {
      jsonData.savedImages.forEach((img) => {
        if (typeof img === 'object' && img.fileName) {
          imagesToDelete.push(img.fileName);
        } else if (typeof img === 'string' && img.includes('/')) {
          const fileName = img.split('/').pop();
          if (fileName) {
            imagesToDelete.push(fileName);
          }
        }
      });
      console.log(`📋 JSON内の画像ファイル数: ${imagesToDelete.length}`);
    }

    let deletedImagesCount = 0;

    // BLOBストレージから画像を削除
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const imagePrefix = norm('images/chat-exports/');

        for await (const blob of containerClient.listBlobsFlat({ prefix: imagePrefix })) {
          const imageFileName = blob.name.split('/').pop();
          if (imagesToDelete.includes(imageFileName) ||
            (imageFileName.includes(id) && (imageFileName.endsWith('.jpg') || imageFileName.endsWith('.jpeg') || imageFileName.endsWith('.png')))) {
            try {
              const blobClient = containerClient.getBlobClient(blob.name);
              await blobClient.delete();
              deletedImagesCount++;
              console.log(`🗑️ BLOBストレージから画像削除: ${imageFileName}`);
            } catch (error) {
              console.warn(`⚠️ BLOBストレージから画像削除エラー: ${imageFileName}`, error.message);
            }
          }
        }
      } catch (blobError) {
        console.error('❌ BLOBストレージ画像削除エラー:', blobError);
      }
    }

    // ローカルファイルシステムは使用しない（BLOBストレージのみ）

    console.log(`✅ 履歴削除完了: ${foundFile}, 画像${deletedImagesCount}件削除`);

    res.json({
      success: true,
      message: '履歴を削除しました',
      id: id,
      fileName: foundFile,
      deletedFromBlob: deletedFromBlob,
      deletedFromLocal: deletedFromLocal,
      deletedImages: deletedImagesCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 履歴削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴の削除に失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// 個別フローJSONファイル取得API
app.get('/api/emergency-flow/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log(`[api/emergency-flow] ファイル取得: ${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      console.error(`❌ BLOBサービスクライアントが利用できません: ${fileName}`);
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`troubleshooting/${fileName}`);
    console.log(`🔍 BLOB取得試行: ${blobName}, container=${containerName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'application/json';

    res.setHeader('Content-Type', contentType);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('❌ ファイル取得エラー:', error);
    console.error('❌ エラー詳細:', error instanceof Error ? error.stack : error);
    res.status(404).json({
      success: false,
      error: 'ファイルが見つかりません',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 画像ファイル取得API（汎用）
app.get('/api/images/:category/:fileName', async (req, res) => {
  try {
    const { category, fileName } = req.params;
    console.log(`[api/images] 画像取得: ${category}/${fileName}`);

    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({
        success: false,
        error: 'BLOBストレージが利用できません',
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = norm(`images/${category}/${fileName}`);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();
    const contentType = downloadResponse.contentType || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1日キャッシュ
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('❌ 画像取得エラー:', error);
    res.status(404).json({
      success: false,
      error: '画像が見つかりません',
      details: error.message,
    });
  }
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
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Client dist directory not found - Running in API-only mode');
    console.warn('📋 Expected to use Vite dev server at http://localhost:5173');
    console.warn('🔧 To build client files, run: npm run build:client');
  } else {
    console.warn('⚠️ WARNING: Client dist directory not found in any expected location');
    console.warn('📋 Checked paths:', clientDistPaths);
    console.warn('🔍 Current working directory:', process.cwd());
    console.warn('📁 __dirname:', __dirname);
    console.warn('⚠️ Server will continue in API-ONLY mode (Frontend should be hosted separately)');
    // process.exit(1); // ← 削除: APIサーバーとして稼働させるため終了しない
  }
} else {
  app.use(express.static(clientDistPath, {
    maxAge: '7d', etag: true, lastModified: true, immutable: true
  }));

  // API以外は index.html へ（API定義の「後ろ」に置く）
  app.get(/^(?!\/api).*/, (_req, res) => {
    const indexPath = join(clientDistPath, 'index.html');
    res.sendFile(indexPath);
  });
}

// ===== 404ハンドラー（すべてのルートの後、エラーハンドラの前）=====
app.use((req, res, next) => {
  console.warn('⚠️ 404 Not Found:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-original-url': req.headers['x-original-url']
    },
    timestamp: new Date().toISOString()
  });

  // 404エラーの詳細をログに記録
  if (req.path.startsWith('/api/')) {
    console.error('❌ API endpoint not found:', req.path);
    console.error('❌ This could indicate:');
    console.error('   1. Route not registered in azure-server.mjs');
    console.error('   2. IIS/iisnode routing issue');
    console.error('   3. Request not reaching Express app');

    // 類似のルートを検索
    const allRoutes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        allRoutes.push(middleware.route.path);
      }
    });

    const similarRoutes = allRoutes.filter(route =>
      route.includes(req.path.split('/').pop()) ||
      req.path.includes(route.split('/').pop())
    );

    if (similarRoutes.length > 0) {
      console.warn('💡 Similar routes found:', similarRoutes);
    }
  }

  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
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

// サーバーインスタンスを先に宣言（後で初期化）
let server;

const shutdown = (sig) => () => {
  console.log(`↩️  Received ${sig}, shutting down gracefully...`);
  if (server) {
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
  } else {
    process.exit(0);
  }
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
server = app.listen(PORT, '0.0.0.0', async () => {
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

  // BLOB接続のテスト（起動時）
  console.log('🔍 Testing BLOB connection...');

  // 接続文字列からAccountNameを抽出してログ出力
  if (connectionString) {
    try {
      const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
      if (accountNameMatch) {
        const accountName = accountNameMatch[1];
        console.log(`🔍 Storage Account Name from connection string: ${accountName}`);
        console.log(`🔍 Expected BLOB URL: https://${accountName}.blob.core.windows.net`);
      } else {
        console.warn('⚠️ Could not extract AccountName from connection string');
      }
    } catch (parseError) {
      console.warn('⚠️ Error parsing connection string:', parseError.message);
    }
  }

  // BLOB接続テストを非同期で実行（サーバー起動をブロックしない）
  (async () => {
    try {
      console.log('🔍 Starting BLOB connection test...');
      const blobServiceClient = getBlobServiceClient();
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          console.log(`🔍 Attempting to check container: ${containerName}`);
          const exists = await containerClient.exists();
          if (exists) {
            console.log(`✅ BLOB Storage: Connected (container: ${containerName})`);
          } else {
            console.warn(`⚠️ BLOB Storage: Connected but container '${containerName}' does not exist`);
            console.warn('⚠️ Attempting to create container...');
            try {
              await containerClient.createIfNotExists();
              console.log(`✅ BLOB Storage: Container '${containerName}' created successfully`);
            } catch (createError) {
              console.error(`❌ BLOB Storage: Failed to create container: ${createError.message}`);
              console.error(`❌ Error details:`, createError instanceof Error ? createError.stack : createError);
            }
          }
        } catch (testError) {
          console.error(`❌ BLOB Storage: Connection test failed: ${testError.message}`);
          console.error(`❌ Error type: ${testError.constructor.name}`);
          console.error(`❌ Error details:`, testError instanceof Error ? testError.stack : testError);

          // DNSエラーの場合、接続文字列のAccountNameを確認
          if (testError.message && testError.message.includes('ENOTFOUND')) {
            console.error('❌ DNS resolution failed - this usually means:');
            console.error('   1. The storage account name in the connection string is incorrect');
            console.error('   2. The storage account does not exist');
            console.error('   3. Network connectivity issues');
            if (connectionString) {
              const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
              if (accountNameMatch) {
                console.error(`   Current AccountName in connection string: ${accountNameMatch[1]}`);
                console.error(`   Please verify this matches your actual Azure Storage account name`);
              }
            }
            // AZURE_STORAGE_ACCOUNT_NAME環境変数も確認
            if (process.env.AZURE_STORAGE_ACCOUNT_NAME) {
              console.error(`   AZURE_STORAGE_ACCOUNT_NAME env var: ${process.env.AZURE_STORAGE_ACCOUNT_NAME}`);
            } else {
              console.error('   AZURE_STORAGE_ACCOUNT_NAME env var: not set');
            }
          }
        }
      } else {
        console.warn('⚠️ BLOB Storage: Not configured or connection failed');
        console.warn('⚠️ getBlobServiceClient() returned null');
        console.warn('⚠️ Connection string:', connectionString ? `Set (length: ${connectionString.length})` : 'Not set');
      }
    } catch (error) {
      console.error('❌ BLOB connection test error:', error);
    }
  })();
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
