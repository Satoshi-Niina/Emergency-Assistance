#!/usr/bin/env node
// -*- coding: utf-8 -*-

// 統合開発サーバー - フロントエンドとバックエンドを統合
// ホットリロード対応、ビルド不要、元データから直接起動
// UTF-8 (BOMなし) エンコード標準

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import multer from 'multer';
import OpenAI from 'openai';
import sharp from 'sharp';
import crypto from 'crypto';
import archiver from 'archiver';

// UTF-8環境設定
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
// 開発環境では.env.developmentを優先、なければ.envを読み込む
const nodeEnv = process.env.NODE_ENV || 'development';
const rootEnvPath = path.join(__dirname, '..', '.env');
const serverEnvPath = path.join(__dirname, '.env');
const serverEnvDevPath = path.join(__dirname, '.env.development');

// 開発環境用の.env.developmentを優先的に読み込む
if (nodeEnv === 'development' && fs.existsSync(serverEnvDevPath)) {
  dotenv.config({ path: serverEnvDevPath, encoding: 'utf8' });
  console.log('📄 Loaded .env.development from:', serverEnvDevPath);
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, encoding: 'utf8' });
  console.log('📄 Loaded .env file from:', rootEnvPath);
}

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, encoding: 'utf8', override: true });
  console.log('📄 Loaded server/.env file from:', serverEnvPath);
}

if (!fs.existsSync(serverEnvDevPath) && !fs.existsSync(rootEnvPath) && !fs.existsSync(serverEnvPath)) {
  console.warn('⚠️ .env file not found, using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// データベース接続プール
let dbPool = null;

// データベース接続テスト関数
async function testDatabaseConnection() {
  if (!dbPool) {
    return { connected: false, error: 'Database pool not initialized' };
  }

  try {
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    return { connected: true };
  } catch (error) {
    // AggregateErrorの場合、個々のエラーを取得
    let errorMessage = error.message || String(error);
    let errorCode = error.code || 'UNKNOWN';

    // AggregateErrorの場合は、最初のエラーを取得
    if (error.name === 'AggregateError' && error.errors && error.errors.length > 0) {
      const firstError = error.errors[0];
      errorMessage = firstError.message || errorMessage;
      errorCode = firstError.code || errorCode;
    }

    // エラーメッセージが空の場合は、エラーの種類を表示
    if (!errorMessage || errorMessage === 'AggregateError') {
      errorMessage = `Database connection failed: ${errorCode || 'Unknown error'}`;
    }

    console.error('❌ Database connection test failed:', {
      name: error.name,
      message: errorMessage,
      code: errorCode,
      stack: error.stack
    });

    return {
      connected: false,
      error: errorMessage || 'Unknown database connection error',
      errorCode: errorCode
    };
  }
}

// データベース初期化
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing database connection...');

    // DATABASE_URLを正規化（localhostを127.0.0.1に変換してIPv6問題を回避）
    let databaseUrl = process.env.DATABASE_URL;

    // localhostを127.0.0.1に変換（IPv6の::1への接続を回避）
    if (databaseUrl.includes('localhost')) {
      databaseUrl = databaseUrl.replace(/localhost/g, '127.0.0.1');
      console.log('🔧 Converted localhost to 127.0.0.1 to avoid IPv6 connection issues');
    }

    // DATABASE_URLから秘密情報をマスク
    const maskedDbUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');

    const isLocalhost = databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost');

    // DATABASE_URLをパースして接続情報を表示
    try {
      const url = new URL(databaseUrl);
      console.log('📊 Database connection info:', {
        host: url.hostname,
        port: url.port || '5432 (default)',
        database: url.pathname.replace('/', '') || 'not specified',
        user: url.username || 'not specified',
        ssl: isLocalhost ? 'disabled (localhost)' : 'enabled'
      });
    } catch (parseError) {
      console.warn('⚠️ Could not parse DATABASE_URL:', parseError.message);
    }

    const sslConfig = isLocalhost
      ? false
      : process.env.PG_SSL === 'require'
        ? { rejectUnauthorized: false }
        : process.env.PG_SSL === 'disable'
          ? false
          : { rejectUnauthorized: false };

    dbPool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 接続タイムアウトを短くしてエラーを早く検出
    });

    console.log('✅ Database pool initialized', isLocalhost ? '(localhost)' : `(${maskedDbUrl.split('@')[1] || 'remote'})`);

    // 接続テストを実行
    testDatabaseConnection().then(result => {
      if (result.connected) {
        console.log('✅ Database connection test successful');
      } else {
        console.error('❌ Database connection test failed:', result.error);
        console.error('❌ Error code:', result.errorCode);
        console.error('💡 Troubleshooting tips:');
        console.error('   1. PostgreSQLサーバーが起動しているか確認してください');
        console.error('   2. DATABASE_URLの接続情報（ホスト、ポート、データベース名）が正しいか確認してください');
        console.error('   3. ファイアウォールやネットワーク設定を確認してください');
        if (isLocalhost) {
          console.error('   4. ローカル環境の場合: psql -h localhost -p 5432 -U postgres -d webappdb_dev で接続テストを実行してください');
        }
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

// データベース初期化
initializeDatabase();

// CORS設定
// 注意: 本番環境では必ずSTATIC_WEB_APP_URL環境変数を設定してください
const staticWebAppUrl = process.env.STATIC_WEB_APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
const clientPort = process.env.CLIENT_PORT || '5173';
const allowOrigins = [
  staticWebAppUrl,
  frontendUrl,
  `http://localhost:${clientPort}`,
  `http://localhost:${parseInt(clientPort) + 1}`,
  `http://localhost:${parseInt(clientPort) + 2}`,
  `http://localhost:${parseInt(clientPort) + 3}`,
  `http://localhost:${parseInt(clientPort) + 4}`,
  `http://localhost:${parseInt(clientPort) + 5}`,
  `http://127.0.0.1:${clientPort}`,
  `http://127.0.0.1:${parseInt(clientPort) + 1}`,
  `http://127.0.0.1:${parseInt(clientPort) + 2}`,
  `http://127.0.0.1:${parseInt(clientPort) + 3}`,
  `http://127.0.0.1:${parseInt(clientPort) + 4}`,
  `http://127.0.0.1:${parseInt(clientPort) + 5}`,
  ...(process.env.CORS_ALLOW_ORIGINS?.split(',') || [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // オリジンなし（同一オリジンまたはモバイルアプリなど）を許可
    if (!origin) {
      return callback(null, true);
    }

    // Azure Static Web Apps ドメインの場合（ワイルドカード対応）
    if (origin.includes('azurestaticapps.net')) {
      console.log('🌐 Azure Static Web Apps origin allowed:', origin);
      return callback(null, true);
    }

    // localhost の場合（開発環境）
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('🏠 Localhost origin allowed:', origin);
      return callback(null, true);
    }

    // 許可リストに含まれているかチェック
    if (allowOrigins.includes(origin) || allowOrigins.includes('*')) {
      console.log('✅ Origin allowed:', origin);
      return callback(null, true);
    }

    console.warn('❌ CORS blocked origin:', origin);
    console.warn('   Allowed origins:', allowOrigins);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
  maxAge: 86400 // 24時間
}));

// プリフライト（OPTIONS）リクエストの明示的な処理
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔍 OPTIONS request from origin:', origin);

  // オリジンの許可チェック
  let originAllowed = false;

  if (!origin) {
    originAllowed = true; // オリジンなしは許可
  } else if (origin.includes('azurestaticapps.net')) {
    originAllowed = true; // Azure Static Web Apps
    console.log('🌐 Azure Static Web Apps origin allowed:', origin);
  } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    originAllowed = true; // ローカル開発環境
    console.log('🏠 Localhost origin allowed:', origin);
  } else if (allowOrigins.includes(origin) || allowOrigins.includes('*')) {
    originAllowed = true; // 許可リストに含まれている
    console.log('✅ Origin allowed:', origin);
  }

  if (originAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400'); // 24時間キャッシュ
    console.log('✅ OPTIONS request approved for origin:', origin);
  } else {
    console.warn('❌ OPTIONS request denied for origin:', origin);
    console.warn('   Allowed origins:', allowOrigins);
  }

  res.status(204).end();
});

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// UTF-8レスポンス設定
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Vite開発サーバーへのプロキシ設定
let viteServer = null;
let viteServerReady = false;

function startViteServer() {
  viteServerReady = false;
  if (viteServer) {
    console.log('🔄 Restarting Vite server...');
    viteServer.kill();
  }

  console.log('🚀 Starting Vite development server...');

  const clientDir = path.join(__dirname, '..', 'client');

  // Windows環境でのnpmコマンドの解決
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  viteServer = spawn(npmCommand, ['run', 'vite-only'], {
    cwd: clientDir,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PORT: CLIENT_PORT,
      VITE_API_BASE_URL: '/api'
    }
  });

  viteServer.stdout.on('data', (data) => {
    const output = data.toString('utf8');
    console.log('Vite:', output.trim());
    if (output.includes('Local:') || output.includes('ready')) {
      viteServerReady = true;
      console.log('✅ Vite server started');
    }
  });

  viteServer.stderr.on('data', (data) => {
    console.error('Vite error:', data.toString('utf8').trim());
  });

  viteServer.on('error', (error) => {
    console.error('❌ Failed to start Vite server:', error);
  });

  viteServer.on('exit', (code) => {
    console.log(`🛑 Vite server exited with code ${code}`);
    viteServer = null;
    viteServerReady = false;
  });
}

// 環境に応じてViteサーバーを起動または静的ファイルを配信
if (isDevelopment) {
  // 開発環境: Viteサーバーを起動
  startViteServer();

  // Vite開発サーバーへのプロキシ（WebSocket対応）
  app.use('/', (req, res, next) => {
    // APIルートは除外
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Viteサーバーが起動していない場合は待機
    if (!viteServer || !viteServerReady) {
      return res.status(503).send('Vite server is starting, please wait...');
    }

    // Viteサーバーへのプロキシ
    const proxyUrl = `http://localhost:${CLIENT_PORT}${req.path}`;

    fetch(proxyUrl)
      .then(response => {
        if (response.ok) {
          response.text().then(text => {
            // ヘッダーを安全に設定する
            response.headers.forEach((value, key) => {
              try {
                // 特定のヘッダーのみを転送し、有効な値のみを設定
                if (key.toLowerCase() === 'content-type' && value && typeof value === 'string') {
                  res.set(key, value);
                }
              } catch (headerError) {
                console.warn(`Header setting error for ${key}:`, headerError.message);
              }
            });
            res.send(text);
          });
        } else {
          res.status(response.status).send(response.statusText);
        }
      })
      .catch(error => {
        console.error('Proxy error:', error);
        res.status(503).send('Vite server not available');
      });
  });
} else {
  // 本番環境: ビルド済み静的ファイルを配信
  const publicDir = path.join(__dirname, 'public');
  const clientDistDir = path.join(__dirname, '..', 'client', 'dist');

  // publicディレクトリが存在する場合は使用（優先）
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { maxAge: '1y' }));
    console.log('✅ 静的ファイル配信: publicディレクトリ');
  } else if (fs.existsSync(clientDistDir)) {
    // client/distディレクトリから配信
    app.use(express.static(clientDistDir, { maxAge: '1y' }));
    console.log('✅ 静的ファイル配信: client/distディレクトリ');
  } else {
    console.warn('⚠️ 静的ファイルディレクトリが見つかりません。publicまたはclient/distが必要です。');
  }

  // SPAのルーティング対応: すべてのリクエストをindex.htmlにフォールバック
  app.get('*', (req, res, next) => {
    // APIルートは除外
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // 静的ファイル（拡張子あり）は除外
    if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
      return next();
    }

    // index.htmlを配信（SPAルーティング）
    const indexPath = fs.existsSync(publicDir)
      ? path.join(publicDir, 'index.html')
      : fs.existsSync(clientDistDir)
        ? path.join(clientDistDir, 'index.html')
        : null;

    if (indexPath && fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Page not found');
    }
  });
}

// 開発環境かどうかをチェック（認証用）
const isDevForAuth = process.env.NODE_ENV !== 'production';

// シークレット情報をマスクするユーティリティ関数
function maskSensitiveInfo(data) {
  if (!data) return data;

  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('bearer')) {
        // JWTトークンの場合、最初の10文字と最後の4文字を表示
        masked[key] = value.length > 20 ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}` : '***';
      } else if (key.toLowerCase().includes('cookie')) {
        // クッキーの場合、マスクする
        masked[key] = value ? '*** (masked)' : value;
      } else {
        masked[key] = value;
      }
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// JWT認証ミドルウェア
function authenticateToken(req, res, next) {
  // 開発環境では認証をスキップ
  if (isDevForAuth) {
    console.log('🔓 Development mode: スキップ認証 for', req.method, req.path);
    req.user = { id: 'dev-user', username: 'developer' }; // 開発用ユーザー情報
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'access_token_required',
      message: 'アクセストークンが必要です'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-32-characters-long', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'invalid_token',
        message: '無効なトークンです'
      });
    }
    req.user = user;
    next();
  });
}

// API router
const apiRouter = express.Router();

// multer設定（ファイルアップロード用）
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.xlsx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('サポートされていないファイル形式です'));
    }
  },
});

// 画像アップロード用multer設定（メモリストレージ）
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  },
});

// ファイルハッシュ計算関数
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ハッシュで既存画像を検索する関数
function findExistingImageByHash(uploadDir, fileHash) {
  if (!fs.existsSync(uploadDir)) {
    return null;
  }

  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    try {
      const filePath = path.join(uploadDir, file);
      if (fs.statSync(filePath).isFile()) {
        const fileBuffer = fs.readFileSync(filePath);
        const existingHash = calculateFileHash(fileBuffer);
        if (existingHash === fileHash) {
          return file;
        }
      }
    } catch (error) {
      console.warn(`ファイルハッシュ計算エラー: ${file}`, error);
      continue;
    }
  }
  return null;
}

// OpenAIクライアントの初期化（条件付き）
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dev-mock-key') {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // APIキーをマスクしてログ出力（セキュリティのため）
    const maskedKey = process.env.OPENAI_API_KEY.substring(0, 7) + '...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4);
    console.log(`✅ OpenAI client initialized (key: ${maskedKey})`);
  } catch (error) {
    console.warn('⚠️ OpenAI client initialization failed:', error.message);
  }
} else {
  console.log('[DEV] OpenAI client not initialized - API key not available');
}

// ヘルスチェック
apiRouter.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance API',
      database: dbPool ? 'connected' : 'disconnected',
      vite: viteServer ? 'running' : 'stopped',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// システムチェック用のデータベース接続確認エンドポイント
apiRouter.get('/system-check/db-check', async (req, res) => {
  try {
    console.log('[api/system-check/db-check] データベース接続チェックリクエスト');

    if (!dbPool) {
      return res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        message: 'データベース接続プールが初期化されていません',
        details: {
          environment: process.env.NODE_ENV || 'development',
          database: 'not_initialized',
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
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
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
        environment: process.env.NODE_ENV || 'development',
        database: 'connection_failed',
        error: error.message,
        error_type: error.constructor.name,
        database_url_set: !!process.env.DATABASE_URL
      },
      timestamp: new Date().toISOString()
    });
  }
});

// システムチェック用のGPT接続確認エンドポイント
apiRouter.post('/system-check/gpt-check', (req, res) => {
  console.log('[api/system-check/gpt-check] GPT接続チェックリクエスト');

  // OpenAI APIキーの設定を確認
  const isOpenAIConfigured = process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'dev-mock-key' &&
    process.env.OPENAI_API_KEY.startsWith('sk-');

  if (!isOpenAIConfigured || !openai) {
    return res.json({
      success: false,
      status: 'ERROR',
      connected: false,
      message: 'OpenAI APIキーが設定されていません',
      error: 'APIキーが未設定または無効です',
      details: {
        environment: process.env.NODE_ENV || 'development',
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
      environment: process.env.NODE_ENV || 'development',
      apiKey: 'configured',
      model: 'available',
      client_initialized: !!openai
    },
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報取得エンドポイント
apiRouter.get('/auth/me', async (req, res) => {
  try {
    const requestDetails = {
      hasSession: !!req.session,
      sessionId: req.session?.id,
      sessionUser: req.session?.user,
      sessionUserId: req.session?.userId,
      cookies: req.headers.cookie,
      authHeader: req.headers.authorization
    };
    console.log('[auth/me] リクエスト詳細:', maskSensitiveInfo(requestDetails));

    // セッションベースの認証をチェック
    if (req.session?.user) {
      console.log('[auth/me] Session-based auth:', req.session.user);
      return res.json({
        success: true,
        user: req.session.user,
        authenticated: true
      });
    }

    // Bearer token認証をチェック
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-32-characters-long');
        // セキュリティのため、トークンのペイロードはログに出力しない（ユーザーIDのみ）
        console.log('[auth/me] Token-based auth: user authenticated (userId:', payload.uid || payload.id || 'unknown', ')');
        return res.json({
          success: true,
          user: {
            id: payload.id || payload.sub,
            username: payload.username,
            role: payload.role
          },
          authenticated: true
        });
      } catch (tokenError) {
        console.log('[auth/me] Invalid token:', tokenError.message);
        return res.status(401).json({
          success: false,
          error: 'invalid_token',
          message: '無効なトークンです'
        });
      }
    }

    // 開発環境ではダミーユーザーを返す
    if (process.env.NODE_ENV === 'development' || process.env.BYPASS_DB_FOR_LOGIN === 'true') {
      console.log('[auth/me] Development mode: Returning demo user');
      return res.json({
        success: true,
        user: {
          id: 'demo',
          username: 'demo',
          role: 'user',
          displayName: 'Demo User'
        },
        authenticated: true,
        demo: true
      });
    }

    // 未認証
    console.log('[auth/me] No authentication found');
    return res.status(401).json({
      success: false,
      error: 'authentication_required',
      message: '認証が必要です'
    });

  } catch (error) {
    console.error('[auth/me] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 認証API
apiRouter.post('/auth/login', async (req, res) => {
  try {
    // セキュリティのため、パスワードはログに出力しない
    console.log('Login attempt received:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({
        success: false,
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    console.log(`Attempting login for user: ${username}`);
    console.log(`Database pool available: ${!!dbPool}`);

    // データベース認証を試行
    if (dbPool) {
      try {
        console.log('Attempting database authentication...');
        const result = await dbPool.query(
          'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
          [username]
        );

        if (result.rows.length === 0) {
          console.log('User not found in database');
          return res.status(401).json({
            success: false,
            error: 'invalid_credentials',
            message: 'ユーザー名またはパスワードが正しくありません'
          });
        }

        const user = result.rows[0];
        console.log('User found in database:', user.username);
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          console.log('Password validation failed');
          return res.status(401).json({
            success: false,
            error: 'invalid_credentials',
            message: 'ユーザー名またはパスワードが正しくありません'
          });
        }

        console.log('Database authentication successful');

        // JWTトークンを生成
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },
          process.env.JWT_SECRET || 'dev-secret-key-32-characters-long',
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.display_name,
            display_name: user.display_name,
            department: user.department
          },
          token: token,
          message: 'ログインに成功しました'
        });
      } catch (dbError) {
        console.error('Database error, falling back to simple auth:', dbError.message);
        return handleSimpleAuth(username, password, res);
      }
    } else {
      return handleSimpleAuth(username, password, res);
    }

    function handleSimpleAuth(username, password, res) {
      console.log('Using simple authentication without database');
      console.log(`Login attempt: username="${username}"`);
      // セキュリティのため、パスワードはログに出力しない

      const testUsers = {
        'admin': { password: 'admin', role: 'admin', displayName: 'Administrator', department: 'IT' },
        'niina': { password: 'G&896845', role: 'admin', displayName: 'Satoshi Niina', department: 'IT' }
      };

      const user = testUsers[username];
      if (user && password === user.password) {
        console.log('Simple authentication successful');

        // JWTトークンを生成
        const token = jwt.sign(
          {
            id: 1,
            username: username,
            role: user.role
          },
          process.env.JWT_SECRET || 'dev-secret-key-32-characters-long',
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          user: {
            id: 1,
            username: username,
            role: user.role,
            displayName: user.displayName,
            display_name: user.displayName,
            department: user.department
          },
          token: token,
          message: 'ログインに成功しました'
        });
      } else {
        console.log('Simple authentication failed - invalid credentials');
        return res.status(401).json({
          success: false,
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'サーバーエラーが発生しました'
    });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

// 機種一覧取得API
apiRouter.get('/machines/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('🔍 dbPool:', dbPool ? 'INITIALIZED' : 'NOT INITIALIZED');

    if (!dbPool) {
      console.error('❌ Database pool not initialized');
      return res.status(503).json({
        success: false,
        error: 'データベース接続がありません',
        message: 'DATABASE_URL環境変数が設定されていないか、データベース接続の初期化に失敗しました',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // データベース接続テスト
      const connectionTest = await testDatabaseConnection();
      if (!connectionTest.connected) {
        console.error('❌ Database connection test failed:', connectionTest);
        const errorDetails = connectionTest.error || 'Unknown error';
        return res.status(503).json({
          success: false,
          error: 'データベース接続エラー',
          message: 'データベースに接続できませんでした',
          details: errorDetails,
          errorCode: connectionTest.errorCode || 'UNKNOWN',
          databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          timestamp: new Date().toISOString()
        });
      }

      const result = await dbPool.query(`
        SELECT id, machine_type_name as machine_type_name
        FROM machine_types
        ORDER BY machine_type_name
      `);

      console.log(`✅ 機種一覧取得成功: ${result.rows.length}件`);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      console.error('❌ Error code:', dbError.code);
      console.error('❌ Error message:', dbError.message);
      console.error('❌ Error stack:', dbError.stack);

      return res.status(500).json({
        success: false,
        error: 'データベースクエリエラー',
        message: '機種一覧の取得に失敗しました',
        details: dbError.message,
        errorCode: dbError.code,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種追加API
apiRouter.post('/machines/machine-types', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 ===== 機種追加APIリクエスト開始 =====');
    console.log('🔧 Request method:', req.method);
    console.log('🔧 Request URL:', req.url);
    console.log('🔧 Content-Type:', req.get('Content-Type'));
    console.log('🔧 機種追加リクエスト:', req.body);
    const { name, machine_type_name } = req.body;
    const typeName = machine_type_name || name; // フロントエンドとの互換性を保つ

    if (!typeName || !typeName.trim()) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機種名は必須です'
      });
    }

    if (dbPool) {
      try {
        // 重複チェック
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machine_types
          WHERE machine_type_name = $1
        `, [typeName.trim()]);

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機種名が既に存在します',
            message: 'この機種名は既に使用されています'
          });
        }

        const result = await dbPool.query(`
          INSERT INTO machine_types (machine_type_name)
          VALUES ($1)
          RETURNING id, machine_type_name
        `, [typeName.trim()]);

        console.log('✅ 機種追加成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が追加されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の追加に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種更新API
apiRouter.put('/machines/machine-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, machine_type_name } = req.body;
    const typeName = machine_type_name || name; // フロントエンドとの互換性を保つ

    console.log('🔧 機種更新リクエスト:', { id, typeName });

    if (!typeName || !typeName.trim()) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機種名は必須です'
      });
    }

    if (dbPool) {
      try {
        // 重複チェック（自分以外）
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machine_types
          WHERE machine_type_name = $1 AND id != $2
        `, [typeName.trim(), id]);

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機種名が既に存在します',
            message: 'この機種名は既に使用されています'
          });
        }

        const result = await dbPool.query(`
          UPDATE machine_types
          SET machine_type_name = $1
          WHERE id = $2
          RETURNING id, machine_type_name
        `, [typeName.trim(), id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機種が見つかりません',
            message: '指定されたIDの機種が存在しません'
          });
        }

        console.log('✅ 機種更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種削除API
apiRouter.delete('/machines/machine-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade } = req.query; // カスケード削除のオプション
    console.log('🗑️ 機種削除リクエスト:', { id, cascade: cascade === 'true' });

    if (dbPool) {
      try {
        // 関連する機械番号があるかチェック
        console.log('🔍 関連機械番号チェック中...');
        const relatedMachines = await dbPool.query(`
          SELECT id, machine_number FROM machines WHERE machine_type_id = $1 ORDER BY machine_number
        `, [id]);

        const relatedCount = relatedMachines.rows.length;
        console.log('🔍 関連機械番号数:', relatedCount);

        if (relatedCount > 0) {
          const machineNumbers = relatedMachines.rows.map(row => row.machine_number);

          if (cascade === 'true') {
            // カスケード削除：関連する機械番号も削除
            console.log('🗑️ カスケード削除実行中:', machineNumbers);

            // トランザクション開始
            await dbPool.query('BEGIN');

            try {
              // 関連する機械番号を削除
              const deletedMachines = await dbPool.query(`
                DELETE FROM machines WHERE machine_type_id = $1
                RETURNING id, machine_number
              `, [id]);

              console.log('✅ 関連機械番号削除完了:', deletedMachines.rows.length, '件');

              // 機種を削除
              const result = await dbPool.query(`
                DELETE FROM machine_types
                WHERE id = $1
                RETURNING id, machine_type_name
              `, [id]);

              if (result.rows.length === 0) {
                await dbPool.query('ROLLBACK');
                return res.status(404).json({
                  success: false,
                  error: '機種が見つかりません',
                  message: '指定されたIDの機種が存在しません'
                });
              }

              // トランザクションコミット
              await dbPool.query('COMMIT');

              console.log('✅ 機種削除成功（カスケード）:', result.rows[0]);
              return res.json({
                success: true,
                data: result.rows[0],
                message: `機種「${result.rows[0].machine_type_name}」と関連する${deletedMachines.rows.length}個の機械番号を削除しました`,
                deletedMachines: deletedMachines.rows,
                timestamp: new Date().toISOString()
              });

            } catch (error) {
              await dbPool.query('ROLLBACK');
              throw error;
            }

          } else {
            // カスケード削除が指定されていない場合は、関連情報と共にエラーを返す
            console.log('❌ 関連機械番号が存在するため削除不可:', machineNumbers);

            return res.status(400).json({
              success: false,
              error: '関連する機械番号が存在します',
              message: `この機種には${relatedCount}個の機械番号が登録されています。関連する機械番号を先に削除するか、一括削除を選択してください。`,
              relatedMachines: machineNumbers,
              details: {
                count: relatedCount,
                machines: machineNumbers.slice(0, 5), // 最初の5個のみ表示
                hasMore: relatedCount > 5
              }
            });
          }
        }

        console.log('✅ 関連機械番号なし、削除実行中...');

        const result = await dbPool.query(`
          DELETE FROM machine_types
          WHERE id = $1
          RETURNING id, machine_type_name
        `, [id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機種が見つかりません',
            message: '指定されたIDの機種が存在しません'
          });
        }

        console.log('✅ 機種削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機種が削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機種の削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機種削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号一覧取得API
apiRouter.get('/machines', async (req, res) => {
  try {
    const { type_id } = req.query;
    console.log('🔍 機械番号一覧取得リクエスト:', { type_id });
    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('🔍 dbPool:', dbPool ? 'INITIALIZED' : 'NOT INITIALIZED');

    if (!dbPool) {
      console.error('❌ Database pool not initialized');
      return res.status(503).json({
        success: false,
        error: 'データベース接続がありません',
        message: 'DATABASE_URL環境変数が設定されていないか、データベース接続の初期化に失敗しました',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // データベース接続テスト
      const connectionTest = await testDatabaseConnection();
      if (!connectionTest.connected) {
        console.error('❌ Database connection test failed:', connectionTest);
        const errorDetails = connectionTest.error || 'Unknown error';
        return res.status(503).json({
          success: false,
          error: 'データベース接続エラー',
          message: 'データベースに接続できませんでした',
          details: errorDetails,
          errorCode: connectionTest.errorCode || 'UNKNOWN',
          databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          timestamp: new Date().toISOString()
        });
      }

      let query, params;

      if (type_id) {
        // 特定の機種IDの機械番号のみ取得
        query = `
          SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
          FROM machines m
          LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
          WHERE m.machine_type_id = $1
          ORDER BY m.machine_number
        `;
        params = [type_id];
      } else {
        // 全機械番号を取得
        query = `
          SELECT m.id, m.machine_number, m.machine_type_id, mt.machine_type_name
          FROM machines m
          LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
          ORDER BY m.machine_number
        `;
        params = [];
      }

      const result = await dbPool.query(query, params);

      console.log(`✅ 機械番号一覧取得成功: ${result.rows.length}件`);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      console.error('❌ Error code:', dbError.code);
      console.error('❌ Error message:', dbError.message);
      console.error('❌ Error stack:', dbError.stack);

      return res.status(500).json({
        success: false,
        error: 'データベースクエリエラー',
        message: '機械番号一覧の取得に失敗しました',
        details: dbError.message,
        errorCode: dbError.code,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ 機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号追加API
apiRouter.post('/machines', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 ===== 機械番号追加APIリクエスト開始 =====');
    console.log('🔧 Request method:', req.method);
    console.log('🔧 Request URL:', req.url);
    console.log('🔧 Content-Type:', req.get('Content-Type'));
    console.log('🔧 機械番号追加リクエスト:', req.body);
    const { machine_number, machine_type_id } = req.body;

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機械番号と機種IDは必須です'
      });
    }

    if (dbPool) {
      try {
        // 重複チェック
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machines
          WHERE machine_number = $1 AND machine_type_id = $2
        `, [machine_number, machine_type_id]);

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機械番号が既に存在します',
            message: 'この機種に同じ機械番号は既に登録されています'
          });
        }

        const result = await dbPool.query(`
          INSERT INTO machines (machine_number, machine_type_id)
          VALUES ($1, $2)
          RETURNING id, machine_number, machine_type_id
        `, [machine_number, machine_type_id]);

        console.log('✅ 機械番号追加成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が追加されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23503') { // 外部キー制約エラー
          return res.status(400).json({
            success: false,
            error: '無効な機種IDです',
            message: '指定された機種IDが存在しません'
          });
        }
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の追加に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の追加に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号更新API
apiRouter.put('/machines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_number, machine_type_id } = req.body;

    console.log('🔧 機械番号更新リクエスト:', { id, machine_number, machine_type_id });

    if (!machine_number || !machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: '機械番号と機種IDは必須です'
      });
    }

    if (dbPool) {
      try {
        // 重複チェック（自分以外）
        const duplicateCheck = await dbPool.query(`
          SELECT id FROM machines
          WHERE machine_number = $1 AND machine_type_id = $2 AND id != $3
        `, [machine_number, machine_type_id, id]);

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: '機械番号が既に存在します',
            message: 'この機種に同じ機械番号は既に登録されています'
          });
        }

        const result = await dbPool.query(`
          UPDATE machines
          SET machine_number = $1, machine_type_id = $2
          WHERE id = $3
          RETURNING id, machine_number, machine_type_id
        `, [machine_number, machine_type_id, id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機械番号が見つかりません',
            message: '指定されたIDの機械番号が存在しません'
          });
        }

        console.log('✅ 機械番号更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23503') { // 外部キー制約エラー
          return res.status(400).json({
            success: false,
            error: '無効な機種IDです',
            message: '指定された機種IDが存在しません'
          });
        }
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号削除API
apiRouter.delete('/machines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 機械番号削除リクエスト:', { id });

    if (dbPool) {
      try {
        const result = await dbPool.query(`
          DELETE FROM machines
          WHERE id = $1
          RETURNING id, machine_number, machine_type_id
        `, [id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '機械番号が見つかりません',
            message: '指定されたIDの機械番号が存在しません'
          });
        }

        console.log('✅ 機械番号削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: '機械番号が削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: '機械番号の削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ 機械番号削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー一覧取得API
apiRouter.get('/users', async (req, res) => {
  try {
    console.log('🔍 ユーザー一覧取得リクエスト');
    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('🔍 dbPool:', dbPool ? 'INITIALIZED' : 'NOT INITIALIZED');

    if (!dbPool) {
      console.error('❌ Database pool not initialized');
      return res.status(503).json({
        success: false,
        error: 'データベース接続がありません',
        message: 'DATABASE_URL環境変数が設定されていないか、データベース接続の初期化に失敗しました',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // データベース接続テスト
      const connectionTest = await testDatabaseConnection();
      if (!connectionTest.connected) {
        console.error('❌ Database connection test failed:', connectionTest);
        const errorDetails = connectionTest.error || 'Unknown error';
        return res.status(503).json({
          success: false,
          error: 'データベース接続エラー',
          message: 'データベースに接続できませんでした',
          details: errorDetails,
          errorCode: connectionTest.errorCode || 'UNKNOWN',
          databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          timestamp: new Date().toISOString()
        });
      }

      const result = await dbPool.query(`
        SELECT id, username, display_name, role, department, description, created_at
        FROM users
        ORDER BY created_at DESC
      `);

      console.log(`✅ ユーザー一覧取得成功: ${result.rows.length}件`);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      console.error('❌ Error code:', dbError.code);
      console.error('❌ Error message:', dbError.message);
      console.error('❌ Error stack:', dbError.stack);

      return res.status(500).json({
        success: false,
        error: 'データベースクエリエラー',
        message: 'ユーザー一覧の取得に失敗しました',
        details: dbError.message,
        errorCode: dbError.code,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー作成API（認証を一時的に無効化）
apiRouter.post('/users', async (req, res) => {
  try {
    console.log('👤 ===== ユーザー作成APIリクエスト開始 =====');
    console.log('👤 Request method:', req.method);
    console.log('👤 Request URL:', req.url);
    console.log('👤 Content-Type:', req.get('Content-Type'));
    // セキュリティのため、パスワードはログに出力しない
    const { password: _password, ...safeBody } = req.body;
    console.log('👤 ユーザー作成リクエスト:', safeBody);
    const { username, password, display_name, role, department, description } = req.body;

    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: 'ユーザー名、パスワード、表示名は必須です'
      });
    }

    if (dbPool) {
      try {
        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await dbPool.query(`
          INSERT INTO users (username, password, display_name, role, department, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, username, display_name, role, department, description, created_at
        `, [username, hashedPassword, display_name, role || 'employee', department, description]);

        console.log('✅ ユーザー作成成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが作成されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
        console.error('❌ Database error code:', dbError.code);
        console.error('❌ Database error detail:', dbError.detail);
        if (dbError.code === '23505') { // 重複エラー
          return res.status(409).json({
            success: false,
            error: 'ユーザー名が既に存在します',
            message: 'このユーザー名は既に使用されています'
          });
        }
        throw dbError;
      }
    }

    console.error('❌ データベース接続がありません');
    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー作成に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー作成エラー:', error);
    console.error('❌ ユーザー作成エラースタック:', error.stack);
    res.status(500).json({
      success: false,
      error: 'ユーザーの作成に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー更新API（認証を一時的に無効化）
apiRouter.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, display_name, role, department, description } = req.body;

    // セキュリティのため、パスワードはログに出力しない
    const { password: _password, ...safeBody } = req.body;
    console.log('👤 ユーザー更新リクエスト:', { id, ...safeBody });

    if (!id || !username || !display_name) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています',
        message: 'ID、ユーザー名、表示名は必須です'
      });
    }

    if (dbPool) {
      try {
        let query, params;

        if (password) {
          // パスワードも更新する場合
          const hashedPassword = await bcrypt.hash(password, 10);
          query = `
            UPDATE users
            SET username = $1, password = $2, display_name = $3, role = $4, department = $5, description = $6
            WHERE id = $7
            RETURNING id, username, display_name, role, department, description, created_at
          `;
          params = [username, hashedPassword, display_name, role, department, description, id];
        } else {
          // パスワードは更新しない場合
          query = `
            UPDATE users
            SET username = $1, display_name = $2, role = $3, department = $4, description = $5
            WHERE id = $6
            RETURNING id, username, display_name, role, department, description, created_at
          `;
          params = [username, display_name, role, department, description, id];
        }

        const result = await dbPool.query(query, params);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'ユーザーが見つかりません',
            message: '指定されたユーザーが存在しません'
          });
        }

        console.log('✅ ユーザー更新成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが更新されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        if (dbError.code === '23505') { // 重複エラー
          return res.status(409).json({
            success: false,
            error: 'ユーザー名が既に存在します',
            message: 'このユーザー名は既に使用されています'
          });
        }
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー更新に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー削除API（認証を一時的に無効化）
apiRouter.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('👤 ユーザー削除リクエスト:', id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ユーザーIDが必要です',
        message: '削除するユーザーのIDを指定してください'
      });
    }

    if (dbPool) {
      try {
        const result = await dbPool.query(`
          DELETE FROM users
          WHERE id = $1
          RETURNING id, username, display_name
        `, [id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'ユーザーが見つかりません',
            message: '指定されたユーザーが存在しません'
          });
        }

        console.log('✅ ユーザー削除成功:', result.rows[0]);
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'ユーザーが削除されました',
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        throw dbError;
      }
    }

    res.status(503).json({
      success: false,
      error: 'データベース接続がありません',
      message: 'ユーザー削除に失敗しました'
    });
  } catch (error) {
    console.error('❌ ユーザー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの削除に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴関連の具体的なルートを先に定義（/:idパラメータ付きルートより前に）
// GET /api/history/export-files - エクスポートファイル一覧取得（先に定義）
apiRouter.get('/history/export-files', async (req, res) => {
  try {
    console.log('📂 エクスポートファイル一覧取得リクエスト受信');
    const cwd = process.cwd();
    console.log('📁 現在の作業ディレクトリ:', cwd);

    // 複数のパス候補を試す
    const projectRoot = path.resolve(__dirname, '..');
    const possiblePaths = [
      // 環境変数が設定されている場合
      process.env.KNOWLEDGE_EXPORTS_DIR,
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'exports'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'exports'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'exports'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'exports'),
    ].filter(Boolean); // undefined/nullを除外

    console.log('🔍 パス候補:', possiblePaths);

    let exportsDir = null;
    for (const testPath of possiblePaths) {
      if (!testPath) continue;
      const normalizedPath = path.resolve(testPath);
      console.log(`📂 試行パス: ${normalizedPath}, 存在: ${fs.existsSync(normalizedPath)}`);
      if (fs.existsSync(normalizedPath)) {
        const stats = fs.statSync(normalizedPath);
        if (stats.isDirectory()) {
          exportsDir = normalizedPath;
          console.log('✅ 有効なディレクトリを発見:', exportsDir);
          break;
        } else {
          console.warn(`⚠️ パスは存在するがディレクトリではありません: ${normalizedPath}`);
        }
      }
    }

    if (!exportsDir) {
      console.error('❌ エクスポートディレクトリが見つかりません。試行したパス:', possiblePaths);
      return res.json([]);
    }

    console.log('✅ エクスポートディレクトリ確認:', exportsDir);

    // ファイル一覧を取得（日本語ファイル名対応）
    const files = fs.readdirSync(exportsDir);
    console.log('📋 ディレクトリ内の全ファイル:', files);
    console.log('📋 ファイル数:', files.length);

    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('📋 JSONファイル数:', jsonFiles.length, 'ファイル:', jsonFiles);

    const exportFiles = jsonFiles
      .filter(file => !file.includes('.backup.')) // バックアップファイルを除外
      .filter(file => !file.startsWith('test-backup-')) // テストファイルを除外
      .map(file => {
        const filePath = path.join(exportsDir, file);
        console.log('🔍 ファイル処理中:', filePath);

        try {
          // ファイルの存在確認
          if (!fs.existsSync(filePath)) {
            console.warn('❌ ファイルが見つかりません:', filePath);
            return null;
          }

          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            console.warn('❌ ファイルではありません:', filePath);
            return null;
          }

          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          // 機種と機械番号を抽出（複数の形式に対応）
          const machineType =
            data.machineType ||
            data.chatData?.machineInfo?.machineTypeName ||
            data.machineInfo?.machineTypeName ||
            '';
          const machineNumber =
            data.machineNumber ||
            data.chatData?.machineInfo?.machineNumber ||
            data.machineInfo?.machineNumber ||
            '';

          const fileInfo = {
            fileName: file,
            filePath: filePath,
            chatId: data.chatId || data.id || 'unknown',
            title: data.title || data.problemDescription || 'タイトルなし',
            machineType: machineType,
            machineNumber: machineNumber,
            createdAt:
              data.createdAt ||
              data.exportTimestamp ||
              new Date().toISOString(),
            exportTimestamp: data.exportTimestamp || data.createdAt || new Date().toISOString(),
            lastModified: stats.mtime.toISOString(),
            size: stats.size,
            content: data, // 完全なJSONデータも含める
          };
          console.log('✅ ファイル読み込み成功:', file, 'タイトル:', fileInfo.title, '機種:', machineType, '機械番号:', machineNumber);
          return fileInfo;
        } catch (error) {
          console.error(`❌ ファイル読み込みエラー: ${filePath}`, error);
          if (error instanceof Error) {
            console.error('エラー詳細:', error.message, error.stack);
          }
          return null;
        }
      })
      .filter(item => item !== null);

    console.log('📦 最終エクスポートファイル数:', exportFiles.length);
    console.log('📋 返却ファイル一覧:', exportFiles.map(f => f.fileName));

    res.json(exportFiles);
  } catch (error) {
    console.error('❌ エクスポートファイル一覧取得エラー:', error);
    res.status(500).json({
      error: 'エクスポートファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 履歴一覧取得API（ファイルベース）
apiRouter.get('/history', async (req, res) => {
  try {
    console.log('📋 履歴一覧取得リクエスト（ファイルベース）');

    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'エクスポートディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') &&
      !file.includes('index') &&
      !file.includes('railway-maintenance-ai-prompt')
    );

    const { limit = 50, offset = 0 } = req.query;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = jsonFiles.slice(startIndex, endIndex);

    const historyItems = paginatedFiles.map(file => {
      try {
        const filePath = path.join(exportsDir, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf8' });
        const data = JSON.parse(content);

        const fileName = file.replace('.json', '');
        const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
        const actualId = uuidMatch ? uuidMatch[1] : fileName;

        const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
        let hasImages = false;
        let imageCount = 0;
        const images = [];

        if (fs.existsSync(imageDir)) {
          const imageFiles = fs.readdirSync(imageDir);
          const matchingImages = imageFiles.filter(imgFile =>
            imgFile.includes(actualId) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
          );

          if (matchingImages.length > 0) {
            hasImages = true;
            imageCount = matchingImages.length;
            images.push(...matchingImages.map(imgFile => ({
              fileName: imgFile,
              url: `/api/images/chat-exports/${imgFile}`,
              path: imgFile
            })));
          }
        }

        // 機種と機械番号を抽出（複数の形式に対応）
        const machineType =
          data.machineType ||
          data.chatData?.machineInfo?.machineTypeName ||
          data.machineInfo?.machineTypeName ||
          'Unknown';
        const machineNumber =
          data.machineNumber ||
          data.chatData?.machineInfo?.machineNumber ||
          data.machineInfo?.machineNumber ||
          'Unknown';

        return {
          id: actualId,
          fileName: file,
          title: data.title || 'タイトルなし',
          machineType: machineType,
          machineNumber: machineNumber,
          description: data.description || data.problemDescription || '',
          createdAt: data.createdAt || data.exportTimestamp || new Date().toISOString(),
          lastModified: data.lastModified || data.createdAt || data.exportTimestamp || new Date().toISOString(),
          source: 'files',
          imageCount: imageCount,
          images: images,
          hasImages: hasImages,
          status: 'active'
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);

    console.log(`✅ ファイルベース履歴一覧取得成功: ${historyItems.length}件`);

    res.json({
      success: true,
      data: historyItems,
      total: jsonFiles.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < jsonFiles.length,
      timestamp: new Date().toISOString(),
      source: 'files',
      version: '2.0'
    });
  } catch (error) {
    console.error('❌ 履歴一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴詳細取得API（ファイルベース）
// 注意: export-filesなどの具体的なルートは既に上で定義されているため、ここでは通常のIDのみを処理
apiRouter.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'unified', includeImages = 'true' } = req.query;
    console.log(`📋 履歴詳細取得リクエスト（ファイルベース）: ${id}`);

    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        success: false,
        error: 'エクスポートディレクトリが見つかりません',
        timestamp: new Date().toISOString()
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') &&
      !file.includes('index') &&
      !file.includes('railway-maintenance-ai-prompt')
    );

    let foundFile = null;
    let foundData = null;

    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;

      if (fileId === id || fileName === id) {
        try {
          const filePath = path.join(exportsDir, file);
          const content = fs.readFileSync(filePath, { encoding: 'utf8' });
          const data = JSON.parse(content);

          foundFile = file;
          foundData = data;
          break;
        } catch (error) {
          console.error(`ファイル読み込みエラー: ${file}`, error);
        }
      }
    }

    if (!foundData) {
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        timestamp: new Date().toISOString()
      });
    }

    const imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    let imageInfo = [];

    if (includeImages === 'true' && fs.existsSync(imageDir)) {
      const imageFiles = fs.readdirSync(imageDir);
      const matchingImages = imageFiles.filter(imgFile =>
        imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg'))
      );

      imageInfo = matchingImages.map(imgFile => ({
        fileName: imgFile,
        url: `/api/images/chat-exports/${imgFile}`,
        path: imgFile
      }));
    }

    const response = {
      success: true,
      id: id,
      fileName: foundFile,
      title: foundData.title || 'タイトルなし',
      machineType: foundData.machineType || 'Unknown',
      machineNumber: foundData.machineNumber || 'Unknown',
      description: foundData.description || foundData.problemDescription || '',
      createdAt: foundData.createdAt || new Date().toISOString(),
      lastModified: foundData.lastModified || foundData.createdAt || new Date().toISOString(),
      source: 'files',
      images: imageInfo,
      imageCount: imageInfo.length,
      hasImages: imageInfo.length > 0,
      status: 'active',
      data: foundData,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };

    console.log(`✅ ファイルベース履歴詳細取得成功: ${id}`);
    res.json(response);
  } catch (error) {
    console.error('❌ 履歴詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴詳細の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/history/upload-image - 編集画面から画像をアップロード（120pxにリサイズしてknowledge-base/images/chat-exportsに保存）
// 注意: このエンドポイントは /history/:id より前に定義する必要があります（ルーティングの順序が重要）
apiRouter.post('/history/upload-image', imageUpload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ 履歴編集画面からの画像アップロードリクエスト受信:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      mimetype: req.file?.mimetype,
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルが提供されていません',
      });
    }

    // ファイル形式チェック
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '対応していないファイル形式です',
      });
    }

    // ファイルサイズチェック（10MB）
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'ファイルサイズは10MB以下にしてください',
      });
    }

    // 保存先ディレクトリのパス
    const projectRoot = path.resolve(__dirname, '..');
    let imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    if (!fs.existsSync(imagesDir)) {
      const alternativePath = path.join(
        projectRoot,
        '..',
        'knowledge-base',
        'images',
        'chat-exports'
      );
      if (fs.existsSync(alternativePath)) {
        imagesDir = alternativePath;
      }
    }

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('📁 画像保存ディレクトリを作成しました:', imagesDir);
    }

    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    // リサイズ後は常にJPEG形式なので拡張子は.jpgに統一
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `history_${timestamp}_${randomStr}.jpg`;
    const filePath = path.join(imagesDir, fileName);

    // 画像を120pxにリサイズして保存
    try {
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(120, 120, {
          fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
          withoutEnlargement: true, // 拡大しない
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      fs.writeFileSync(filePath, resizedBuffer);
      console.log('✅ 画像ファイルを保存しました（120pxにリサイズ）:', filePath);

      const imageUrl = `/api/images/chat-exports/${fileName}`;

      res.json({
        success: true,
        imageUrl,
        fileName,
        url: imageUrl,
      });
    } catch (resizeError) {
      console.error('❌ 画像リサイズエラー:', resizeError);
      // リサイズに失敗した場合は元の画像を保存
      fs.writeFileSync(filePath, req.file.buffer);
      const imageUrl = `/api/images/chat-exports/${fileName}`;
      res.json({
        success: true,
        imageUrl,
        fileName,
        url: imageUrl,
        warning: 'リサイズに失敗しましたが、元の画像を保存しました',
      });
    }
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    res.status(500).json({
      success: false,
      error: '画像のアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 履歴削除API（ファイルベース）
apiRouter.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 履歴削除リクエスト（ファイルベース）: ${id}`);

    // 履歴一覧取得APIと同じパス解決方法を使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    console.log(`📂 プロジェクトルート: ${projectRoot}`);
    console.log(`📂 エクスポートディレクトリ: ${exportsDir}`);
    console.log(`📂 ディレクトリ存在確認: ${fs.existsSync(exportsDir)}`);

    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        success: false,
        error: 'エクスポートディレクトリが見つかりません',
        exportsDir: exportsDir,
        timestamp: new Date().toISOString()
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') &&
      !file.includes('index') &&
      !file.includes('railway-maintenance-ai-prompt')
    );

    console.log(`📋 検出されたJSONファイル数: ${jsonFiles.length}`);

    let foundFile = null;
    let jsonData = null;

    for (const file of jsonFiles) {
      const fileName = file.replace('.json', '');
      const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
      const fileId = uuidMatch ? uuidMatch[1] : fileName;

      console.log(`🔍 ファイルチェック: ${file}, fileName: ${fileName}, fileId: ${fileId}, id: ${id}`);

      if (fileId === id || fileName === id) {
        foundFile = file;
        console.log(`✅ マッチするファイルを発見: ${foundFile}`);

        // JSONファイルを読み込んで画像情報を取得
        try {
          const filePath = path.join(exportsDir, foundFile);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          jsonData = JSON.parse(fileContent);
          console.log(`📄 JSONファイル読み込み成功: ${foundFile}`);
        } catch (readError) {
          console.warn(`⚠️ JSONファイル読み込みエラー: ${foundFile}`, readError.message);
        }
        break;
      }
    }

    if (!foundFile) {
      console.log(`❌ マッチするファイルが見つかりませんでした。検索ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: '履歴が見つかりません',
        searchId: id,
        availableFiles: jsonFiles.slice(0, 10), // デバッグ用に最初の10ファイルを返す
        timestamp: new Date().toISOString()
      });
    }

    const filePath = path.join(exportsDir, foundFile);

    // 画像ディレクトリのパス解決
    let imageDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
    if (!fs.existsSync(imageDir)) {
      const alternativePath = path.join(
        projectRoot,
        '..',
        'knowledge-base',
        'images',
        'chat-exports'
      );
      if (fs.existsSync(alternativePath)) {
        imageDir = alternativePath;
      }
    }

    const imagesToDelete = [];

    // JSONファイル内のsavedImagesから画像ファイル名を取得
    if (jsonData && jsonData.savedImages && Array.isArray(jsonData.savedImages)) {
      jsonData.savedImages.forEach((img) => {
        if (typeof img === 'object' && img.fileName) {
          imagesToDelete.push(img.fileName);
        } else if (typeof img === 'string' && img.includes('/')) {
          // URL形式の場合、ファイル名を抽出
          const fileName = img.split('/').pop();
          if (fileName) {
            imagesToDelete.push(fileName);
          }
        }
      });
      console.log(`📋 JSON内の画像ファイル数: ${imagesToDelete.length}`);
    }

    // 画像ファイルを削除
    if (fs.existsSync(imageDir)) {
      const imageFiles = fs.readdirSync(imageDir);
      const matchingImages = imageFiles.filter(imgFile => {
        // JSON内の画像ファイル名と一致するか、IDを含む画像ファイル
        return imagesToDelete.includes(imgFile) ||
          (imgFile.includes(id) && (imgFile.endsWith('.jpg') || imgFile.endsWith('.jpeg') || imgFile.endsWith('.png')));
      });

      console.log(`🖼️ 削除対象の画像ファイル数: ${matchingImages.length}`);

      matchingImages.forEach(imgFile => {
        const imgPath = path.join(imageDir, imgFile);
        try {
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
            console.log(`🗑️ 画像ファイル削除: ${imgFile}`);
          }
        } catch (error) {
          console.warn(`⚠️ 画像ファイル削除エラー: ${imgFile}`, error.message);
        }
      });
    } else {
      console.log(`📂 画像ディレクトリが存在しません: ${imageDir}`);
    }

    // JSONファイルを削除
    console.log(`🗑️ ファイル削除実行: ${filePath}`);
    fs.unlinkSync(filePath);
    console.log(`✅ ファイル削除完了: ${foundFile}`);

    console.log(`✅ ファイルベース履歴削除完了: ${foundFile}`);

    res.json({
      success: true,
      message: '履歴を削除しました',
      id: id,
      fileName: foundFile,
      deletedImages: imagesToDelete.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 履歴削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴の削除に失敗しました',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー一覧取得API
apiRouter.get('/emergency-flow/list', async (req, res) => {
  try {
    console.log('🔍 応急処置フロー一覧取得リクエスト');

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }

    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const flows = jsonFiles.map(file => {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
        const jsonData = JSON.parse(fileContent);

        return {
          id: jsonData.id || file.replace('.json', ''),
          title: jsonData.title || 'タイトルなし',
          description: jsonData.description || '',
          fileName: file,
          filePath: `knowledge-base/troubleshooting/${file}`,
          createdAt: jsonData.createdAt || new Date().toISOString(),
          updatedAt: jsonData.updatedAt || new Date().toISOString(),
          triggerKeywords: jsonData.triggerKeywords || [],
          category: jsonData.category || '',
          steps: jsonData.steps || [],
          dataSource: 'file'
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);

    // 作成日時でソート（新しい順）
    flows.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({
      success: true,
      data: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー詳細取得API（/:id形式）
apiRouter.get('/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 応急処置フロー詳細取得リクエスト (/:id): ${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }

    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let flowData = null;
    let fileName = null;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
      }
    }

    if (!flowData) {
      return res.status(404).json({
        success: false,
        error: '指定されたフローが見つかりません',
        id: id,
        timestamp: new Date().toISOString()
      });
    }

    // 画像URLを変換（相対パスの場合は完全なURLに変換）
    if (flowData.steps) {
      flowData.steps.forEach((step, index) => {
        if (step.images && Array.isArray(step.images)) {
          step.images = step.images.map(img => {
            if (img.url && !img.url.startsWith('http') && !img.url.startsWith('/')) {
              img.url = `/api/emergency-flow/image/${img.fileName || img.url}`;
            } else if (img.url && img.url.startsWith('/api/emergency-flow/image/')) {
              // 既に正しい形式
            } else if (img.fileName && !img.url) {
              img.url = `/api/emergency-flow/image/${img.fileName}`;
            }
            return img;
          });
        }
      });
    }

    console.log('✅ 応急処置フロー詳細取得成功:', {
      id: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      fileName: fileName
    });

    res.json({
      success: true,
      data: flowData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー詳細の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー詳細取得API（/detail/:id形式 - 互換性のため残す）
apiRouter.get('/emergency-flow/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 応急処置フロー詳細取得リクエスト: ${id}`);

    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }

    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let flowData = null;
    let fileName = null;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          flowData = data;
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
      }
    }

    if (!flowData) {
      return res.status(404).json({
        success: false,
        error: 'フローが見つかりません',
        details: `ID: ${id} のフローデータが見つかりませんでした`,
        timestamp: new Date().toISOString()
      });
    }

    // 画像URLを変換
    if (flowData.steps) {
      flowData.steps.forEach((step, index) => {
        if (step.images && Array.isArray(step.images)) {
          step.images.forEach((img, imgIndex) => {
            if (img.url && !img.url.startsWith('http')) {
              // 既にAPIパスが含まれている場合はそのまま使用
              if (img.url.startsWith('/api/')) {
                img.url = `${req.protocol}://${req.get('host')}${img.url}`;
              } else {
                // ファイル名のみの場合は適切なAPIエンドポイントに変換
                img.url = `${req.protocol}://${req.get('host')}/api/emergency-flow/image/${img.url}`;
              }
            }
          });
        }
      });
    }

    res.json({
      success: true,
      data: flowData,
      fileName: fileName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 応急処置フロー詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー詳細の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GPTレスポンスから手順を抽出するフォールバック関数
function extractStepsFromResponse(response, keyword) {
  const steps = [];
  const lines = response.split('\n').filter(line => line.trim());

  // 段落ごとに手順として抽出
  let currentStep = null;
  let stepCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 新しい段落の開始を検出
    if (
      trimmedLine &&
      !trimmedLine.startsWith('**') &&
      !trimmedLine.startsWith('例:') &&
      !trimmedLine.startsWith('タイトル：') &&
      !trimmedLine.startsWith('手順：') &&
      !trimmedLine.match(/^手順\d+：/) &&
      !trimmedLine.match(/^\d+\./)
    ) {
      if (currentStep) {
        steps.push(currentStep);
      }

      stepCount++;
      currentStep = {
        id: `step_${stepCount}`,
        title:
          trimmedLine.substring(0, 50) + (trimmedLine.length > 50 ? '...' : ''),
        description: trimmedLine,
        message: trimmedLine,
        type: 'step',
        imageUrl: '',
        options: [],
      };
    } else if (currentStep && trimmedLine) {
      // 既存の手順に詳細を追加
      currentStep.description += '\n' + trimmedLine;
      currentStep.message += '\n' + trimmedLine;
    }
  }

  if (currentStep) {
    steps.push(currentStep);
  }

  // 手順が抽出できない場合は、キーワードベースでデフォルト手順を生成
  if (steps.length === 0) {
    steps.push({
      id: 'step_1',
      title: `${keyword}の安全確認`,
      description: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
      message: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
      type: 'step',
      imageUrl: '',
      options: [],
    });

    steps.push({
      id: 'step_2',
      title: `${keyword}の詳細点検`,
      description: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
      message: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
      type: 'step',
      imageUrl: '',
      options: [],
    });

    steps.push({
      id: 'step_3',
      title: '専門技術者への連絡',
      description:
        '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
      message:
        '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
      type: 'step',
      imageUrl: '',
      options: [],
    });
  }

  return steps;
}

// POST /api/emergency-flow/upload-image - 画像アップロードエンドポイント
apiRouter.post('/emergency-flow/upload-image', imageUpload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ 画像アップロードリクエスト受信:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      mimetype: req.file?.mimetype,
      body: req.body
    });

    if (!req.file) {
      console.log('❌ 画像ファイルが提供されていません');
      return res.status(400).json({
        success: false,
        error: '画像ファイルが提供されていません',
      });
    }

    // ファイル形式チェック
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '対応していないファイル形式です',
      });
    }

    // ファイルサイズチェック（10MB）
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'ファイルサイズは10MB以下にしてください',
      });
    }

    // 画像を150pxにリサイズ
    let resizedBuffer;
    try {
      resizedBuffer = await sharp(req.file.buffer)
        .resize(150, 150, {
          fit: 'inside', // アスペクト比を維持しながら、150x150以内に収める
          withoutEnlargement: true, // 小さい画像は拡大しない
        })
        .jpeg({ quality: 85 }) // JPEG形式で保存（品質85%）
        .toBuffer();

      console.log('✅ 画像リサイズ成功:', {
        originalSize: req.file.size,
        resizedSize: resizedBuffer.length,
        reduction: `${Math.round((1 - resizedBuffer.length / req.file.size) * 100)}%`
      });
    } catch (resizeError) {
      console.error('❌ 画像リサイズエラー:', resizeError);
      // リサイズに失敗した場合は元の画像を使用
      resizedBuffer = req.file.buffer;
      console.warn('⚠️ 元の画像を使用します');
    }

    // ファイル名を生成（タイムスタンプ + オリジナル名）
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = 'jpg'; // リサイズ後は常にJPEG形式
    const fileName = `emergency-flow-step${timestamp}.${extension}`;

    // 保存先ディレクトリを作成
    const uploadDir = path.join(
      process.cwd(),
      'knowledge-base',
      'images',
      'emergency-flows'
    );
    const alternativeDir = path.join(
      process.cwd(),
      '..',
      'knowledge-base',
      'images',
      'emergency-flows'
    );

    let targetDir = uploadDir;
    if (!fs.existsSync(uploadDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        fs.mkdirSync(uploadDir, { recursive: true });
        targetDir = uploadDir;
      }
    }

    console.log('📁 アップロードディレクトリ:', targetDir);

    // ファイルの重複チェック
    let fileHash;
    try {
      fileHash = calculateFileHash(resizedBuffer);
      console.log('🔍 ファイルハッシュ計算:', { fileHash: fileHash.substring(0, 16) + '...' });
    } catch (hashError) {
      console.error('❌ ハッシュ計算エラー:', hashError);
      throw new Error(`ファイルハッシュの計算に失敗しました: ${hashError instanceof Error ? hashError.message : 'Unknown error'}`);
    }

    let existingFile = null;
    try {
      existingFile = findExistingImageByHash(targetDir, fileHash);
    } catch (searchError) {
      console.warn('⚠️ 重複ファイル検索エラー（続行）:', searchError);
    }

    let finalFileName = fileName;
    let isDuplicate = false;

    if (existingFile) {
      console.log('🔄 重複画像を検出、既存ファイルを使用:', existingFile);
      finalFileName = existingFile;
      isDuplicate = true;
    } else {
      // 新しいファイルを保存
      const filePath = path.join(targetDir, fileName);
      console.log('💾 ファイル保存中:', {
        filePath,
        fileSize: resizedBuffer.length,
        fileName,
      });

      try {
        fs.writeFileSync(filePath, resizedBuffer);
        console.log('✅ ファイル保存成功:', filePath);
      } catch (writeError) {
        console.error('❌ ファイル保存エラー:', writeError);
        throw new Error(`ファイルの保存に失敗しました: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
      }
    }

    // APIエンドポイントのURLを生成
    const imageUrl = `/api/emergency-flow/image/${finalFileName}`;

    console.log('✅ 画像アップロード成功:', {
      fileName: finalFileName,
      imageUrl,
      fileSize: resizedBuffer.length,
      isDuplicate,
    });

    res.json({
      success: true,
      imageUrl,
      fileName: finalFileName,
      imageFileName: finalFileName, // 互換性のため
      isDuplicate,
    });
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    res.status(500).json({
      success: false,
      error: '画像のアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/emergency-flow/:id - フロー更新エンドポイント
apiRouter.put('/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flowData = req.body;
    console.log('🔄 フロー更新開始:', { id, title: flowData.title });

    // IDの一致確認
    if (id !== flowData.id) {
      return res.status(400).json({
        success: false,
        error: 'URLのIDとデータのIDが一致しません',
      });
    }

    // 必須フィールドの検証
    if (!flowData.title) {
      return res.status(400).json({
        success: false,
        error: 'タイトルは必須です',
      });
    }

    // knowledge-baseディレクトリのパス解決
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({
          success: false,
          error: 'トラブルシューティングディレクトリが見つかりません',
        });
      }
    }

    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let fileName = null;

    // IDに一致するファイルを検索
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.id === id || file.replace('.json', '') === id) {
          fileName = file;
          break;
        }
      } catch (error) {
        console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
      }
    }

    if (!fileName) {
      return res.status(404).json({
        success: false,
        error: '更新対象のフローが見つかりません',
      });
    }

    // 既存ファイルの読み込み
    const filePath = path.join(targetDir, fileName);
    let originalData = null;
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        originalData = JSON.parse(fileContent);
        console.log('📖 既存データ読み込み成功:', {
          id: originalData.id,
          title: originalData.title,
          stepsCount: originalData.steps?.length || 0,
          hasImages: originalData.steps?.some(step => step.images && step.images.length > 0) || false
        });
      } catch (error) {
        console.error('❌ 既存ファイル読み込みエラー:', error);
        originalData = null;
      }
    }

    // 差分を適用して更新（深いマージ）
    const mergeData = (original, updates) => {
      const result = { ...original };

      for (const [key, value] of Object.entries(updates)) {
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          // オブジェクトの場合は再帰的にマージ
          result[key] = mergeData(result[key] || {}, value);
        } else if (Array.isArray(value) && key === 'steps') {
          // steps配列の場合は特別な処理
          if (result[key] && Array.isArray(result[key])) {
            // 既存のstepsと新しいstepsをマージ
            result[key] = value.map(newStep => {
              const existingStep = result[key].find(step => step.id === newStep.id);
              if (existingStep) {
                // 既存のステップがある場合は、画像データを保持してマージ
                return {
                  ...existingStep,
                  ...newStep,
                  // 画像データは新しいデータを優先するが、既存の画像も保持
                  images: newStep.images || existingStep.images || []
                };
              }
              return newStep;
            });
          } else {
            result[key] = value;
          }
        } else {
          // プリミティブ値やその他の配列は直接代入
          result[key] = value;
        }
      }

      return result;
    };

    // 画像情報の検証とクリーニング
    if (flowData.steps) {
      flowData.steps.forEach((step, index) => {
        // 画像配列が存在しない場合は空配列を設定
        if (!step.images) {
          step.images = [];
        }

        // 画像配列が存在する場合の処理
        if (step.images && step.images.length > 0) {
          console.log(`🖼️ ステップ[${index}]の画像情報:`, {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: step.images.length,
            images: step.images.map(img => ({
              fileName: img.fileName,
              url: img.url?.substring(0, 100) + '...',
              urlValid: img.url && img.url.trim() !== '',
              fileNameValid: img.fileName && img.fileName.trim() !== ''
            }))
          });

          // 画像情報の検証と修正
          step.images = step.images.filter(img => {
            if (!img || !img.url || img.url.trim() === '') {
              console.log(`❌ 無効な画像情報を除外:`, img);
              return false;
            }

            // ファイル名が無い場合はURLから抽出
            if (!img.fileName || img.fileName.trim() === '') {
              if (img.url.includes('/')) {
                img.fileName = img.url.split('/').pop() || '';
              } else if (img.url.includes('\\')) {
                img.fileName = img.url.split('\\').pop() || '';
              } else {
                img.fileName = img.url;
              }
              console.log(`📁 ファイル名を補完:`, { url: img.url, fileName: img.fileName });
            }

            return true;
          });
        } else {
          console.log(`📝 ステップ[${index}]に画像なし:`, {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: 0
          });
        }
      });
    }

    const updatedFlowData = mergeData(originalData || {}, {
      ...flowData,
      updatedAt: new Date().toISOString(),
      // 更新履歴を追加
      updateHistory: [
        ...(originalData?.updateHistory || []),
        {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(flowData),
          updatedBy: 'user',
        },
      ],
    });

    // 画像データの最終的な検証と修正
    if (updatedFlowData.steps) {
      updatedFlowData.steps.forEach((step, index) => {
        if (step.images && Array.isArray(step.images)) {
          // 画像配列の検証とクリーニング
          step.images = step.images.filter(img => {
            if (!img || typeof img !== 'object') {
              console.log(`❌ 無効な画像オブジェクトを除外:`, img);
              return false;
            }

            if (!img.url || typeof img.url !== 'string' || img.url.trim() === '') {
              console.log(`❌ URLが無効な画像を除外:`, img);
              return false;
            }

            // ファイル名が無い場合はURLから抽出
            if (!img.fileName || img.fileName.trim() === '') {
              if (img.url.includes('/')) {
                img.fileName = img.url.split('/').pop() || '';
              } else if (img.url.includes('\\')) {
                img.fileName = img.url.split('\\').pop() || '';
              } else {
                img.fileName = img.url;
              }
              console.log(`📁 ファイル名を補完:`, { url: img.url, fileName: img.fileName });
            }

            return true;
          });

          console.log(`🖼️ ステップ[${index}]の最終画像データ:`, {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: step.images.length,
            images: step.images.map(img => ({
              fileName: img.fileName,
              url: img.url?.substring(0, 100) + '...',
              urlValid: img.url && img.url.trim() !== ''
            }))
          });
        }
      });
    }

    // JSONファイルを更新
    fs.writeFileSync(filePath, JSON.stringify(updatedFlowData, null, 2), 'utf-8');

    console.log('✅ フロー更新成功:', {
      id: updatedFlowData.id,
      title: updatedFlowData.title,
      stepsCount: updatedFlowData.steps?.length || 0,
      stepsWithImages: updatedFlowData.steps?.filter(step => step.images && step.images.length > 0).length || 0,
      filePath: filePath,
    });

    res.json({
      success: true,
      data: updatedFlowData,
      message: 'フローが正常に更新されました',
    });
  } catch (error) {
    console.error('❌ フロー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/emergency-flow/generate - フロー生成エンドポイント
apiRouter.post('/emergency-flow/generate', async (req, res) => {
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
    if (!openai) {
      return res.status(503).json({
        success: false,
        error:
          'OpenAI APIが利用できません。開発環境ではAPIキーを設定してください。',
        details: 'OpenAI client not available',
      });
    }

    // AI支援カスタマイズ設定を読み込む
    let aiAssistSettings = null;
    try {
      const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
      if (fs.existsSync(AI_ASSIST_SETTINGS_FILE)) {
        const settingsData = fs.readFileSync(AI_ASSIST_SETTINGS_FILE, 'utf-8');
        aiAssistSettings = JSON.parse(settingsData);
        console.log('✅ AI支援設定をフロー生成に適用しました');
      } else {
        // デフォルト設定
        aiAssistSettings = {
          conversationStyle: 'frank',
          customInstructions: '',
          questionFlow: {
            step1: '具体的な症状を教えてください',
            step2: 'いつ頃から発生していますか？',
            step3: '作業環境や状況を教えてください',
            step4: '他に気になることはありますか？',
            step5: '緊急度を教えてください'
          },
        };
      }
    } catch (error) {
      console.warn('AI支援設定の読み込みに失敗しました。デフォルト値を使用します:', error);
      aiAssistSettings = {
        conversationStyle: 'frank',
        customInstructions: '',
        questionFlow: {
          step1: '具体的な症状を教えてください',
          step2: 'いつ頃から発生していますか？',
          step3: '作業環境や状況を教えてください',
          step4: '他に気になることはありますか？',
          step5: '緊急度を教えてください'
        },
      };
    }

    // 会話スタイルに応じたトーンの調整
    let toneInstruction = '';
    if (aiAssistSettings.conversationStyle === 'business') {
      toneInstruction = '丁寧で正式なビジネス用語を使用し、専門的な表現を心がけてください。';
    } else if (aiAssistSettings.conversationStyle === 'technical') {
      toneInstruction = '専門用語を中心に、技術的な説明を重視してください。';
    } else {
      toneInstruction = '親しみやすく、わかりやすい表現で説明してください。';
    }

    // カスタム指示を追加
    let customInstructionText = '';
    if (aiAssistSettings.customInstructions) {
      customInstructionText = `\n\n【追加の指示事項】\n${aiAssistSettings.customInstructions}`;
    }

    // 質問フロー設定を参考にした構造化ガイド
    let questionFlowGuide = '';
    if (aiAssistSettings.questionFlow) {
      const flowSteps = Object.values(aiAssistSettings.questionFlow)
        .filter(q => q && q.trim())
        .map((q, idx) => `- ${q}`)
        .join('\n');
      if (flowSteps) {
        questionFlowGuide = `\n\n【推奨される情報収集フロー】\n以下の順序で情報を収集することを推奨します：\n${flowSteps}`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたは、**鉄道の保守用車（軌道モーターカー）**に関する専門的な知識を持つAIアシスタントです。

【厳守事項】

回答の範囲: 回答は、あなたが保持している保守用車（軌道モーターカー）の仕様、機能、および故障事例に関するナレッジデータのみに基づいて行い、このナレッジにない情報については回答できません。

情報源の限定: インターネット検索や外部情報源を参照することは一切禁止します。

ナレッジの不足時の対応: 質問に対する情報がナレッジデータ内に存在しない場合は、「申し訳ありませんが、その情報（または、その詳細）は、現在の私の保守用車に関するナレッジデータには含まれておりません。」と明確に回答し、それ以上の推測や一般的な情報の提供は行わないでください。

【回答の品質】

専門性: 鉄道保守・車両工学の専門用語を用いて、正確かつ技術的な観点から回答してください。

構造化: 仕様、機能、故障のデータは、箇条書きや表を用いて、利用者が理解しやすいよう構造化して提示してください。

具体的なデータとの紐づけ: 可能な限り、具体的な仕様名、機能名称、故障コード、または特定の構成部品と紐づけて回答してください。

【タスク例】

特定の車種（例：〇〇型軌道モーターカー）のエンジン出力や最大牽引力の仕様を問い合わせられた場合。

油圧駆動システムの機能について説明を求められた場合。

特定の故障コード（例：E-123）が発生した場合の考えられる原因や一次的な対処法を問い合わせられた場合。

上記を厳守し、専門家として、ユーザーの質問に正確に回答してください。

---

あなたは鉄道保守用車（軌道モーターカー）の故障診断と応急処置の専門家です。
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

   各選択肢の次のステップ：[対応する次のステップの説明]

**重要な要求事項:**
- ステップは細かく分ける（1ステップ=1つの質問または1つの作業）
- 各ステップは簡潔に（50-100文字程度）
- 判断や条件分岐が必要な箇所では必ず条件分岐ステップを作成
- 条件分岐では4つの選択肢を提供（例：「正常」「異常あり」「不明」「緊急」など）
- 安全確認は最初のステップに必ず含める
- 必要な工具や部品があれば明記
- 専門技術者への連絡が必要な場合は最後のステップに含める
${toneInstruction}${questionFlowGuide}${customInstructionText}

**例:**
タイトル：エンジン始動不良

手順1（step）：エンジンが完全に停止しているか確認してください。
説明：キーを回してエンジンが全く反応しないか、クランキング音がしないかを確認します。

条件分岐1（decision）：エンジンの状態を確認してください。
説明：エンジンルームを開いて状態を確認します。
選択肢1：エンジンは停止している（正常な停止状態）
選択肢2：エンジンから異常音がする
選択肢3：異臭がする
選択肢4：異常な発熱がある

手順2（step）：バッテリーの端子を目視で確認してください。
説明：バッテリー端子の緩み、腐食、接続状態を確認します。

条件分岐2（decision）：バッテリー端子の状態はどうですか？
説明：端子の状態を確認し、問題があれば選択してください。
選択肢1：端子はしっかり接続されている（正常）
選択肢2：端子が緩んでいる
選択肢3：端子に腐食がある
選択肢4：端子が外れている

手順3（step）：バッテリー電圧をテスターで測定してください。
説明：テスターのプラス端子をバッテリーのプラス極、マイナス端子をマイナス極に接続して電圧を測定します。

条件分岐3（decision）：バッテリー電圧は何ボルトですか？
説明：測定結果に応じて選択してください。
選択肢1：12.6V以上（正常）
選択肢2：10V以上12.6V未満（充電不足）
選択肢3：10V未満（深刻な問題）
選択肢4：測定できない（接続不良）

最終ステップ（step）：測定結果と状態を専門技術者に報告し、指示を仰いでください。
説明：確認した内容（エンジン状態、バッテリー状態、電圧値）を専門技術者に伝え、次の対応を指示してもらいます。`,
        },
        {
          role: 'user',
          content: `以下の故障状況に対する応急処置フローを一問一答形式で生成してください：${keyword}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const generatedContent = completion.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('フロー生成に失敗しました');
    }

    // 生成されたコンテンツをパースしてフロー構造に変換（一問一答形式・条件分岐対応）
    console.log('🔍 GPTレスポンスの解析開始:', {
      contentLength: generatedContent.length,
      lineCount: generatedContent.split('\n').length,
    });

    const lines = generatedContent.split('\n').filter(line => line.trim());
    const title =
      lines
        .find(line => line.includes('タイトル：') || line.includes('タイトル:'))
        ?.replace(/タイトル[：:]/, '')
        .trim() || keyword;

    console.log('📝 抽出されたタイトル:', title);

    const steps = [];
    let currentStep = null;
    let isInDecision = false;
    let currentDecisionOptions = [];
    let stepCounter = 0;

    // ステップを細かく分割し、条件分岐を検出する関数
    function parseStepsFromContent(content) {
      const parsedSteps = [];
      let currentStepObj = null;
      let inDecision = false;
      let decisionOptions = [];
      let decisionTitle = '';
      let decisionDescription = '';
      let stepNum = 0;

      const allLines = content.split('\n').filter(l => l.trim());

      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i].trim();

        // タイトル行をスキップ
        if (line.includes('タイトル')) continue;

        // 条件分岐の検出
        if (line.includes('条件分岐') || line.match(/条件分岐\d+/)) {
          // 前のステップを保存
          if (currentStepObj && currentStepObj.type === 'step') {
            parsedSteps.push(currentStepObj);
            currentStepObj = null;
          }

          inDecision = true;
          decisionTitle = line.replace(/条件分岐\d*[：:]?/, '').trim();
          decisionOptions = [];
          decisionDescription = '';
          continue;
        }

        // 通常の手順ステップの検出
        if ((line.includes('手順') && (line.includes('(step)') || line.match(/手順\d+[（(]step[）)]/))) ||
          (line.match(/^\d+\./) && !inDecision)) {
          // 前のステップを保存
          if (currentStepObj) {
            parsedSteps.push(currentStepObj);
          }
          if (inDecision) {
            // 条件分岐ステップを保存
            stepNum++;
            // 選択肢が4つ未満の場合は補完
            let finalOptions = [...decisionOptions];
            if (finalOptions.length < 4) {
              // 不足分を補完（例：「その他」「不明」「確認が必要」など）
              const defaultOptions = ['その他', '不明', '確認が必要', '緊急'];
              while (finalOptions.length < 4) {
                const defaultOption = defaultOptions[finalOptions.length - decisionOptions.length] || `選択肢${finalOptions.length + 1}`;
                finalOptions.push(defaultOption);
              }
            }

            parsedSteps.push({
              id: `step_${stepNum}`,
              title: decisionTitle || '状態を確認してください',
              description: decisionDescription || decisionTitle,
              message: decisionDescription || decisionTitle,
              type: 'decision',
              imageUrl: '',
              options: finalOptions.slice(0, 4).map((opt, idx) => ({
                text: opt,
                nextStepId: `step_${stepNum + 1 + idx}`,
                isTerminal: false,
                conditionType: idx === 0 ? 'yes' : idx === 1 ? 'no' : idx === 2 ? 'maybe' : 'other',
                condition: opt,
              })),
            });
            inDecision = false;
            decisionOptions = [];
          }

          stepNum++;
          const stepTitle = line
            .replace(/手順\d*[（(]step[）)]?[：:]?/, '')
            .replace(/^\d+\./, '')
            .trim();

          currentStepObj = {
            id: `step_${stepNum}`,
            title: stepTitle,
            description: stepTitle,
            message: stepTitle,
            type: 'step',
            imageUrl: '',
            options: [],
          };
          continue;
        }

        // 説明行の処理
        if (line.includes('説明：') || line.includes('説明:')) {
          const desc = line.replace(/説明[：:]/, '').trim();
          if (inDecision) {
            decisionDescription += (decisionDescription ? '\n' : '') + desc;
          } else if (currentStepObj) {
            currentStepObj.description = desc;
            currentStepObj.message = desc;
          }
          continue;
        }

        // 選択肢の検出（選択肢1-4）
        if (line.match(/選択肢[1234][：:]/) || line.match(/^[1234][．.][：:]/)) {
          if (inDecision) {
            const optionText = line
              .replace(/選択肢[1234][：:]/, '')
              .replace(/^[1234][．.][：:]/, '')
              .trim();
            if (optionText) {
              decisionOptions.push(optionText);
            }
          }
          continue;
        }

        // その他の行を説明に追加
        if (line && !line.startsWith('**') && !line.startsWith('例') && !line.match(/^[*-]/)) {
          if (inDecision && !line.includes('選択肢') && !line.includes('タイトル')) {
            if (!decisionDescription && decisionTitle) {
              decisionDescription = line;
            } else if (decisionDescription && !decisionOptions.includes(line)) {
              decisionDescription += '\n' + line;
            }
          } else if (currentStepObj && !line.includes('条件分岐')) {
            currentStepObj.description += (currentStepObj.description !== currentStepObj.title ? '\n' : '') + line;
            currentStepObj.message += (currentStepObj.message !== currentStepObj.title ? '\n' : '') + line;
          }
        }
      }

      // 最後のステップを保存
      if (currentStepObj) {
        parsedSteps.push(currentStepObj);
      }
      if (inDecision) {
        stepNum++;
        // 選択肢が4つ未満の場合は補完
        let finalOptions = [...decisionOptions];
        if (finalOptions.length < 4) {
          const defaultOptions = ['その他', '不明', '確認が必要', '緊急'];
          while (finalOptions.length < 4) {
            const defaultOption = defaultOptions[finalOptions.length - decisionOptions.length] || `選択肢${finalOptions.length + 1}`;
            finalOptions.push(defaultOption);
          }
        }

        parsedSteps.push({
          id: `step_${stepNum}`,
          title: decisionTitle || '状態を確認してください',
          description: decisionDescription || decisionTitle,
          message: decisionDescription || decisionTitle,
          type: 'decision',
          imageUrl: '',
          options: finalOptions.slice(0, 4).map((opt, idx) => ({
            text: opt,
            nextStepId: `step_${stepNum + 1 + idx}`,
            isTerminal: false,
            conditionType: idx === 0 ? 'yes' : idx === 1 ? 'no' : idx === 2 ? 'maybe' : 'other',
            condition: opt,
          })),
        });
      }

      return parsedSteps;
    }

    // パース処理を実行
    steps.push(...parseStepsFromContent(generatedContent));

    // ステップが細かく分割されていない場合、さらに細分化
    if (steps.length < 5) {
      console.log('⚠️ ステップ数が少ないため、さらに細分化します');

      const refinedSteps = [];
      steps.forEach((step, index) => {
        if (step.type === 'step' && step.description.length > 150) {
          // 長い説明を複数のステップに分割
          const sentences = step.description.split(/[。\n]/).filter(s => s.trim().length > 10);
          sentences.forEach((sentence, sIdx) => {
            refinedSteps.push({
              id: `step_${index + 1}_${sIdx + 1}`,
              title: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''),
              description: sentence.trim(),
              message: sentence.trim(),
              type: 'step',
              imageUrl: '',
              options: [],
            });
          });
        } else {
          refinedSteps.push(step);
        }
      });

      steps.length = 0;
      steps.push(...refinedSteps);
    }

    // ステップIDを再割り当てし、decisionステップの次のステップリンクを設定
    steps.forEach((step, idx) => {
      const newId = `step_${idx + 1}`;
      step.id = newId;

      // decisionステップのoptionsのnextStepIdを更新
      // 選択肢1→次のステップ、選択肢2→その次のステップ...という形でリンク
      if (step.type === 'decision' && step.options && step.options.length > 0) {
        step.options.forEach((opt, optIdx) => {
          // 次のステップが存在する場合は次のステップ、存在しない場合は最後のステップにリンク
          const nextStepIdx = Math.min(idx + 1 + optIdx, steps.length - 1);
          opt.nextStepId = `step_${nextStepIdx + 1}`;

          // 条件分岐の選択肢が4つ未満の場合は、デフォルトで次のステップに進むように設定
          if (optIdx >= step.options.length - 1 && nextStepIdx < steps.length - 1) {
            opt.nextStepId = `step_${nextStepIdx + 1}`;
          }
        });
      }
    });

    console.log('📊 手順抽出結果:', {
      totalSteps: steps.length,
      stepTypes: steps.map(s => ({ id: s.id, type: s.type, hasOptions: s.options?.length > 0 })),
      stepTitles: steps.map(s => s.title),
      decisionSteps: steps.filter(s => s.type === 'decision').length,
      normalSteps: steps.filter(s => s.type === 'step').length,
    });

    // 手順が生成されていない場合のフォールバック処理
    if (steps.length === 0) {
      console.log('⚠️ 手順が生成されていないため、フォールバック処理を実行');

      // GPTの生のレスポンスから手順を抽出（一問一答形式に対応）
      const fallbackSteps = extractStepsFromResponse(generatedContent, keyword);

      // フォールバック処理でも細分化を試みる
      const refinedFallbackSteps = [];
      fallbackSteps.forEach((step, index) => {
        if (step.type === 'step' && step.description && step.description.length > 100) {
          // 長い説明を複数のステップに分割
          const sentences = step.description.split(/[。\n]/).filter(s => s.trim().length > 10);
          sentences.forEach((sentence, sIdx) => {
            refinedFallbackSteps.push({
              id: `step_${index + 1}_${sIdx + 1}`,
              title: sentence.substring(0, 60) + (sentence.length > 60 ? '...' : ''),
              description: sentence.trim(),
              message: sentence.trim(),
              type: 'step',
              imageUrl: '',
              options: [],
            });
          });
        } else {
          refinedFallbackSteps.push(step);
        }
      });

      // ステップIDを再割り当て
      refinedFallbackSteps.forEach((step, idx) => {
        step.id = `step_${idx + 1}`;
      });

      steps.push(...refinedFallbackSteps);

      console.log('🔄 フォールバック手順生成完了:', {
        fallbackStepsCount: fallbackSteps.length,
        refinedStepsCount: refinedFallbackSteps.length,
        totalStepsAfterFallback: steps.length,
      });
    }

    const flowData = {
      id: `flow_${Date.now()}`,
      title: title,
      description: `自動生成された${keyword}の応急処置フロー`,
      triggerKeywords: [keyword],
      steps: steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // knowledge-base/troubleshootingフォルダに保存
    try {
      const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
      const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

      let targetDir = troubleshootingDir;
      if (!fs.existsSync(troubleshootingDir)) {
        if (fs.existsSync(alternativeDir)) {
          targetDir = alternativeDir;
        } else {
          fs.mkdirSync(troubleshootingDir, { recursive: true });
          targetDir = troubleshootingDir;
        }
      }

      const filePath = path.join(targetDir, `${flowData.id}.json`);

      // ファイルに保存
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');

      console.log('✅ 生成フロー保存成功:', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps.length,
        filePath: filePath,
      });
    } catch (fileError) {
      console.error('❌ ファイル保存エラー:', fileError);
      // ファイル保存に失敗しても、レスポンスは返す
    }

    // 生成されたフローの詳細情報を含むレスポンス
    const responseData = {
      success: true,
      flowData: flowData,
      response: generatedContent, // フロントエンドが期待する形式
      message: 'フローが正常に生成されました',
      generatedContent: generatedContent, // GPTの生のレスポンス
      extractedSteps: steps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        type: step.type,
        optionsCount: step.options?.length || 0,
      })),
      summary: {
        totalSteps: steps.length,
        decisionSteps: steps.filter(s => s.type === 'decision').length,
        normalSteps: steps.filter(s => s.type === 'step').length,
        hasSpecificActions: steps.some(
          step =>
            step.description.includes('確認') ||
            step.description.includes('点検') ||
            step.description.includes('測定') ||
            step.description.includes('調整')
        ),
        safetyNotes: steps.some(
          step =>
            step.description.includes('安全') ||
            step.description.includes('危険') ||
            step.description.includes('停止')
        ),
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error('❌ フロー生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// フロー削除エンドポイント
apiRouter.delete('/emergency-flow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ フロー削除開始: ID=${id}`);

    // 複数のパス候補を試す
    const cwd = process.cwd();
    const projectRoot = path.resolve(__dirname, '..');

    // トラブルシューティングディレクトリのパス候補
    const troubleshootingPaths = [
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'troubleshooting'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'troubleshooting'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'troubleshooting'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'troubleshooting'),
    ].map(p => path.resolve(p));

    console.log('🔍 troubleshooting パス候補:', troubleshootingPaths);
    console.log('📁 現在の作業ディレクトリ:', cwd);
    console.log('📁 プロジェクトルート:', projectRoot);

    let targetDir = null;
    let fileName = null;

    // 各パス候補を試す
    for (const testDir of troubleshootingPaths) {
      if (!fs.existsSync(testDir)) {
        console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
        continue;
      }

      console.log(`🔍 ディレクトリを検索中: ${testDir}`);
      const files = fs.readdirSync(testDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      console.log(`📄 見つかったJSONファイル数: ${jsonFiles.length}`);

      // IDに一致するファイルを検索
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(testDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContent);

          if (data.id === id || file.replace('.json', '') === id) {
            targetDir = testDir;
            fileName = file;
            console.log('✅ 削除対象のファイルを発見:', {
              dir: targetDir,
              file: fileName,
              id
            });
            break;
          }
        } catch (error) {
          console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
        }
      }

      if (fileName) {
        break;
      }
    }

    if (!fileName || !targetDir) {
      console.error('❌ 削除対象のフローが見つかりません:', {
        id,
        searchedPaths: troubleshootingPaths,
      });
      return res.status(404).json({
        success: false,
        error: '削除対象のフローが見つかりません',
        id,
        searchedPaths: troubleshootingPaths.map(p => ({
          path: p,
          exists: fs.existsSync(p),
        })),
      });
    }

    // JSONファイルを削除
    const filePath = path.join(targetDir, fileName);
    fs.unlinkSync(filePath);

    console.log(`🗑️ フロー削除完了: ${id}, ファイル: ${fileName}, パス: ${filePath}`);
    res.json({
      success: true,
      message: 'フローが削除されました',
      deletedId: id,
      deletedFile: fileName,
    });
  } catch (error) {
    console.error('❌ フロー削除エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'フローの削除に失敗しました',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// チャット送信API（テスト用 - 認証不要）
apiRouter.post('/chats/:id/send-test', async (req, res) => {
  try {
    const { id } = req.params;
    const { chatData, exportType } = req.body;

    console.log('🔍 テスト用チャット送信リクエスト受信:', {
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

    // プロジェクトルートの取得
    const projectRoot = path.resolve(__dirname, '..');
    const cwd = process.cwd();

    // knowledge-base/exports フォルダを作成（複数のパスを試す）
    const possibleExportsDirs = [
      path.join(projectRoot, 'knowledge-base', 'exports'),
      path.join(cwd, 'knowledge-base', 'exports'),
      path.join(cwd, '..', 'knowledge-base', 'exports'),
      path.join(__dirname, '..', 'knowledge-base', 'exports'),
    ];

    let exportsDir = null;
    for (const testDir of possibleExportsDirs) {
      if (!fs.existsSync(testDir)) {
        try {
          fs.mkdirSync(testDir, { recursive: true });
          exportsDir = testDir;
          console.log('exports フォルダを作成しました:', exportsDir);
          break;
        } catch (err) {
          continue;
        }
      } else {
        exportsDir = testDir;
        break;
      }
    }

    if (!exportsDir) {
      // 最後の手段として、プロジェクトルートを使用
      exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
      fs.mkdirSync(exportsDir, { recursive: true });
      console.log('exports フォルダを作成しました（フォールバック）:', exportsDir);
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
      // テキストがある場合は最初の行を使用
      incidentTitle = textMessages.split('\n')[0].trim();
      console.log('🔍 事象抽出 - 抽出されたタイトル:', incidentTitle);
    } else {
      // テキストがない場合（画像のみ）は、デフォルトタイトルを使用
      incidentTitle = '画像による故障報告';
      console.log('🔍 事象抽出 - デフォルトタイトル使用:', incidentTitle);
    }

    // ファイル名用に事象内容をサニタイズ（特殊文字を除去）
    const sanitizedTitle = incidentTitle
      .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
      .replace(/\s+/g, '_') // スペースをアンダースコアに変換
      .substring(0, 50); // 長さを制限

    const fileName = `${sanitizedTitle}_${id}_${timestamp}.json`;
    const filePath = path.join(exportsDir, fileName);

    // 画像を個別ファイルとして保存（chat-exportsディレクトリに保存）
    const possibleImagesDirs = [
      path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
      path.join(cwd, 'knowledge-base', 'images', 'chat-exports'),
      path.join(cwd, '..', 'knowledge-base', 'images', 'chat-exports'),
      path.join(__dirname, '..', 'knowledge-base', 'images', 'chat-exports'),
    ];

    let imagesDir = null;
    for (const testDir of possibleImagesDirs) {
      if (!fs.existsSync(testDir)) {
        try {
          fs.mkdirSync(testDir, { recursive: true });
          imagesDir = testDir;
          console.log('画像保存ディレクトリを作成しました:', imagesDir);
          break;
        } catch (err) {
          continue;
        }
      } else {
        imagesDir = testDir;
        break;
      }
    }

    if (!imagesDir) {
      // 最後の手段として、プロジェクトルートを使用
      imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('画像保存ディレクトリを作成しました（フォールバック）:', imagesDir);
    }

    // チャットメッセージから画像を抽出してファイルとして保存
    const savedImages = [];
    const cleanedChatData = JSON.parse(JSON.stringify(chatData)); // ディープコピー

    for (const message of cleanedChatData.messages) {
      if (message.content && message.content.startsWith('data:image/')) {
        try {
          // Base64データから画像を抽出
          const base64Data = message.content.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          // ファイル名を生成
          const imageTimestamp = Date.now();
          const imageFileName = `chat_image_${id}_${imageTimestamp}.jpg`;
          const imagePath = path.join(imagesDir, imageFileName);

          // 画像を120pxにリサイズして保存（chat-exports用）
          const resizedBuffer = await sharp(buffer)
            .resize(120, 120, {
              fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
              withoutEnlargement: true, // 拡大しない
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          fs.writeFileSync(imagePath, resizedBuffer);
          console.log('画像ファイルを保存しました（120pxにリサイズ）:', imagePath);

          const imageUrl = `/api/images/chat-exports/${imageFileName}`;

          // base64をURLに置き換え
          message.content = imageUrl;

          savedImages.push({
            messageId: message.id,
            fileName: imageFileName,
            path: imagePath,
            url: imageUrl,
          });
        } catch (imageError) {
          console.warn('画像保存エラー:', imageError);
          // エラー時はbase64を削除
          message.content = '[画像データ削除]';
        }
      }
    }

    // base64を完全に除去する関数
    const removeBase64Recursively = (obj) => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      if (typeof obj === 'string') {
        // base64文字列を検出して削除
        if (obj.startsWith('data:image/')) {
          console.warn('⚠️ base64を検出、削除します:', obj.substring(0, 50) + '...');
          return '[画像データ削除 - base64は使用不可]';
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => removeBase64Recursively(item));
      }
      if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cleaned[key] = removeBase64Recursively(obj[key]);
          }
        }
        return cleaned;
      }
      return obj;
    };

    // exportDataを作成（base64を含まないクリーンなデータのみ）
    const exportData = {
      chatId: id,
      userId: 'test-user',
      exportType: exportType || 'manual_send',
      exportTimestamp: new Date().toISOString(),
      title: incidentTitle, // 事象情報をタイトルとして追加
      chatData: removeBase64Recursively(cleanedChatData),
      savedImages: savedImages,
    };

    // titleフィールドの値でファイル名を再生成
    const finalSanitizedTitle = exportData.title
      .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
      .replace(/\s+/g, '_') // スペースをアンダースコアに変換
      .substring(0, 50); // 長さを制限
    console.log('🔍 事象抽出 - 最終サニタイズ済みタイトル:', finalSanitizedTitle);

    const finalFileName = `${finalSanitizedTitle}_${id}_${timestamp}.json`;
    const finalFilePath = path.join(exportsDir, finalFileName);
    console.log('🔍 事象抽出 - 最終ファイル名:', finalFileName);

    // エクスポートデータは既にbase64が除去されているので、そのまま使用
    const cleanedExportData = exportData;

    // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
    const jsonString = JSON.stringify(cleanedExportData, null, 2);
    try {
      // UTF-8 BOMなしで保存
      fs.writeFileSync(finalFilePath, jsonString, 'utf8');
      console.log('チャットデータを保存しました:', finalFilePath);
      console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
    } catch (writeError) {
      console.error('ファイル保存エラー:', writeError);
      throw writeError;
    }

    // ファイルベースの保存のみ（DB保存は削除）
    console.log('チャットエクスポートがファイルに保存されました');

    // 成功レスポンス
    res.json({
      success: true,
      message: 'チャットデータが正常に保存されました（テスト用）',
      filePath: finalFilePath,
      fileName: finalFileName,
      messageCount: chatData.messages.length,
    });
  } catch (error) {
    console.error('Error sending chat data:', error);
    res.status(500).json({
      error: 'Failed to send chat data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// チャット送信API
apiRouter.post('/chats/:id/send', (req, res) => {
  const { id } = req.params;
  const { chatData } = req.body;

  console.log('📤 チャット送信リクエスト:', { id, messageCount: chatData?.messages?.length || 0 });

  // プロジェクトルートの取得
  const projectRoot = path.resolve(__dirname, '..');
  const cwd = process.cwd();

  // knowledge-base/exports フォルダを作成（複数のパスを試す）
  const possibleExportsDirs = [
    path.join(projectRoot, 'knowledge-base', 'exports'),
    path.join(cwd, 'knowledge-base', 'exports'),
    path.join(cwd, '..', 'knowledge-base', 'exports'),
    path.join(__dirname, '..', 'knowledge-base', 'exports'),
  ];

  let exportsDir = null;
  for (const testDir of possibleExportsDirs) {
    if (!fs.existsSync(testDir)) {
      try {
        fs.mkdirSync(testDir, { recursive: true });
        exportsDir = testDir;
        console.log('exports フォルダを作成しました:', exportsDir);
        break;
      } catch (err) {
        continue;
      }
    } else {
      exportsDir = testDir;
      break;
    }
  }

  if (!exportsDir) {
    // 最後の手段として、プロジェクトルートを使用
    exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');
    fs.mkdirSync(exportsDir, { recursive: true });
    console.log('exports フォルダを作成しました（フォールバック）:', exportsDir);
  }

  const fileName = `chat_${id}_${Date.now()}.json`;
  const filePath = path.join(exportsDir, fileName);

  const exportData = {
    chatId: id,
    title: chatData.title || 'チャット履歴',
    machineType: chatData.machineInfo?.machineTypeName || '',
    machineNumber: chatData.machineInfo?.machineNumber || '',
    exportTimestamp: new Date().toISOString(),
    chatData: chatData,
    exportType: 'manual'
  };

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), { encoding: 'utf8' });

  res.json({
    success: true,
    message: 'チャット内容をサーバーに送信しました',
    fileName: fileName,
    timestamp: new Date().toISOString()
  });
});

// 履歴の機種・機械番号データ取得API
apiRouter.get('/history/machine-data', async (req, res) => {
  try {
    console.log('📋 機種・機械番号データ取得リクエスト（履歴用）');

    if (dbPool) {
      try {
        const machineTypesResult = await dbPool.query(`
          SELECT id, machine_type_name as "machineTypeName"
          FROM machine_types
          ORDER BY machine_type_name
        `);

        const machinesResult = await dbPool.query(`
          SELECT m.id, m.machine_number as "machineNumber", m.machine_type_id as "machineTypeId",
                 mt.machine_type_name as "machineTypeName"
          FROM machines m
          LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
          ORDER BY m.machine_number
        `);

        return res.json({
          success: true,
          machineTypes: machineTypesResult.rows,
          machines: machinesResult.rows,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }

    res.json({
      success: true,
      machineTypes: [],
      machines: [],
      message: 'データベース接続がありません',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種・機械番号データの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ナレッジベースAPI
apiRouter.get('/knowledge-base', async (req, res) => {
  try {
    console.log('📚 ナレッジベース取得リクエスト');

    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base');

    let targetDir = knowledgeBaseDir;
    if (!fs.existsSync(knowledgeBaseDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.json({
          success: true,
          data: [],
          message: 'ナレッジベースディレクトリが見つかりません',
          timestamp: new Date().toISOString()
        });
      }
    }

    const files = fs.readdirSync(targetDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const knowledgeItems = jsonFiles.map(file => {
      try {
        const filePath = path.join(targetDir, file);
        const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
        const jsonData = JSON.parse(fileContent);

        return {
          id: file.replace('.json', ''),
          fileName: file,
          title: jsonData.title || 'タイトルなし',
          category: jsonData.category || 'unknown',
          createdAt: jsonData.createdAt || new Date().toISOString(),
          lastModified: jsonData.lastModified || new Date().toISOString()
        };
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
        return null;
      }
    }).filter(item => item !== null);

    res.json({
      success: true,
      data: knowledgeItems,
      total: knowledgeItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジベース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/knowledge-base/stats - ナレッジベース統計情報
apiRouter.get('/knowledge-base/stats', async (req, res) => {
  try {
    console.log('📊 ナレッジベース統計情報取得リクエスト');

    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base');

    let targetDir = knowledgeBaseDir;
    if (!fs.existsSync(knowledgeBaseDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.json({
          success: true,
          data: {
            total: 0,
            totalSize: 0,
            categoryCount: {},
            typeStats: {},
            lastMaintenance: undefined,
            oldData: 0,
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // documentsディレクトリから統計情報を取得
    const documentsDir = path.join(targetDir, 'documents');
    let total = 0;
    const categoryCount = {};
    const typeStats = {};

    if (fs.existsSync(documentsDir)) {
      const docDirs = fs.readdirSync(documentsDir).filter(item => {
        const itemPath = path.join(documentsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      total = docDirs.length;

      // メタデータからカテゴリとタイプを集計
      for (const dir of docDirs) {
        try {
          const metadataPath = path.join(documentsDir, dir, 'metadata.json');
          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const category = metadata.category || 'uncategorized';
            const type = metadata.type || 'unknown';

            categoryCount[category] = (categoryCount[category] || 0) + 1;
            typeStats[type] = (typeStats[type] || 0) + 1;
          }
        } catch (error) {
          console.warn(`メタデータ読み込みエラー: ${dir}`, error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        total,
        totalSize: 0,
        categoryCount,
        typeStats,
        lastMaintenance: undefined,
        oldData: 0,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジベース統計情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベース統計情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 設定RAG API
apiRouter.get('/settings/rag', async (req, res) => {
  try {
    console.log('⚙️ RAG設定取得リクエスト');

    // RAG設定ファイルから読み込む
    const RAG_SETTINGS_FILE = path.join(__dirname, '../data/rag-settings.json');
    const DEFAULT_RAG_SETTINGS = {
      chunkSize: 500,
      chunkOverlap: 200,
      similarityThreshold: 0.7,
      maxResults: 5,
      useSemanticSearch: true,
      useKeywordSearch: true,
      removeDuplicates: true,
      preprocessingOptions: {
        removeStopWords: true,
        lowercaseText: true,
        removeSpecialChars: false,
      },
      customPrompt: '',
      temperature: 0.7,
      maxTokens: 2000,
    };

    let ragSettings = DEFAULT_RAG_SETTINGS;
    try {
      if (fs.existsSync(RAG_SETTINGS_FILE)) {
        const settingsData = fs.readFileSync(RAG_SETTINGS_FILE, 'utf-8');
        ragSettings = { ...DEFAULT_RAG_SETTINGS, ...JSON.parse(settingsData) };
        console.log('✅ RAG設定ファイルから読み込み成功');
      } else {
        console.log('📝 RAG設定ファイルが存在しないため、デフォルト設定を使用');
      }
    } catch (fileError) {
      console.warn('⚠️ RAG設定ファイルの読み込みに失敗。デフォルト設定を使用:', fileError);
    }

    res.json({
      success: true,
      data: ragSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'RAG設定の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// RAG設定API（エイリアス）
apiRouter.get('/config/rag', async (req, res) => {
  try {
    console.log('⚙️ RAG設定取得リクエスト（エイリアス）');

    res.json({
      success: true,
      data: {
        enabled: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        chunkSize: 500,  // 精度向上のため500文字に変更
        overlap: 100,   // 20%のオーバーラップ
        minChunkSize: 50,
        processingMethod: 'semantic-boundary-aware',
        features: {
          semanticBoundarySplitting: true,
          keywordExtraction: true,
          textNormalization: true,
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'RAG設定の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AI支援設定API
apiRouter.get('/ai-assist/settings', async (req, res) => {
  try {
    console.log('⚙️ AI支援設定取得リクエスト');

    // AI支援設定ファイルから読み込む
    const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
    console.log('📁 AI支援設定ファイルパス:', AI_ASSIST_SETTINGS_FILE);
    console.log('📁 __dirname:', __dirname);

    const DEFAULT_AI_ASSIST_SETTINGS = {
      initialPrompt: '何か問題がありましたか？お困りの事象を教えてください！',
      conversationStyle: 'frank', // 'frank', 'business', 'technical'
      questionFlow: {
        step1: '具体的な症状を教えてください',
        step2: 'いつ頃から発生していますか？',
        step3: '作業環境や状況を教えてください',
        step4: '他に気になることはありますか？',
        step5: '緊急度を教えてください'
      },
      branchingConditions: {
        timeCheck: true,
        detailsCheck: true,
        toolsCheck: true,
        safetyCheck: true
      },
      responsePattern: 'step_by_step', // 'step_by_step', 'comprehensive', 'minimal'
      escalationTime: 20, // 分
      customInstructions: '',
      enableEmergencyContact: true
    };

    let aiAssistSettings = DEFAULT_AI_ASSIST_SETTINGS;
    try {
      if (fs.existsSync(AI_ASSIST_SETTINGS_FILE)) {
        console.log('✅ AI支援設定ファイルが存在します');
        const settingsData = fs.readFileSync(AI_ASSIST_SETTINGS_FILE, 'utf-8');
        const parsedSettings = JSON.parse(settingsData);
        aiAssistSettings = { ...DEFAULT_AI_ASSIST_SETTINGS, ...parsedSettings };
        console.log('✅ AI支援設定ファイルから読み込み成功');
      } else {
        console.log('📝 AI支援設定ファイルが存在しないため、デフォルト設定を使用');
        console.log('📝 ファイルパス:', AI_ASSIST_SETTINGS_FILE);
      }
    } catch (fileError) {
      console.warn('⚠️ AI支援設定ファイルの読み込みに失敗。デフォルト設定を使用:', fileError);
      console.warn('⚠️ エラー詳細:', fileError.message);
      console.warn('⚠️ スタック:', fileError.stack);
    }

    res.json({
      success: true,
      data: aiAssistSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI支援設定取得エラー:', error);
    console.error('❌ エラー詳細:', error.message);
    console.error('❌ スタック:', error.stack);
    res.status(500).json({
      success: false,
      error: 'AI支援設定の取得に失敗しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// AI支援設定保存API
apiRouter.post('/ai-assist/settings', async (req, res) => {
  try {
    console.log('💾 AI支援設定保存リクエスト');

    const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
    const settings = req.body;

    // データディレクトリを確保
    const dataDir = path.dirname(AI_ASSIST_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 設定をファイルに保存
    fs.writeFileSync(
      AI_ASSIST_SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );

    console.log('✅ AI支援設定保存成功');
    res.json({
      success: true,
      message: 'AI支援設定が保存されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI支援設定保存エラー:', error);
    res.status(500).json({
      success: false,
      error: 'AI支援設定の保存に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 管理者ダッシュボードAPI
apiRouter.get('/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 管理者ダッシュボード取得リクエスト');

    res.json({
      success: true,
      data: {
        totalUsers: 0,
        totalMachines: 0,
        totalHistory: 0,
        totalFlows: 0,
        systemStatus: 'running',
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 管理者ダッシュボード取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '管理者ダッシュボードの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// emergency-flows画像ファイル取得エンドポイント
apiRouter.get('/images/emergency-flows/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`🖼️ emergency-flows画像ファイル取得: ${filename}`);

    const projectRoot = path.resolve(__dirname, '..');
    const imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'emergency-flows');

    const imagePath = path.resolve(imagesDir, filename);

    if (!fs.existsSync(imagePath)) {
      console.log(`❌ 画像ファイルが見つかりません: ${imagePath}`);
      return res.status(404).json({
        success: false,
        error: '画像ファイルが見つかりません',
      });
    }

    // Content-Typeを設定
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('❌ emergency-flows画像ファイル取得エラー:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '画像ファイルの取得に失敗しました',
        details: error.message,
      });
    }
  }
});

// chat-exports画像ファイル取得エンドポイント
apiRouter.get('/images/chat-exports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`🖼️ chat-exports画像ファイル取得: ${filename}`);

    // プロジェクトルートを取得（__dirnameベース）
    const projectRoot = path.resolve(__dirname, '..');
    const imagesDir = path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports');

    console.log(`🔍 画像検索開始:`, { filename, imagesDir, exists: fs.existsSync(imagesDir) });

    // ディレクトリが存在しない場合は404を返す
    if (!fs.existsSync(imagesDir)) {
      console.log(`❌ 画像ディレクトリが存在しません: ${imagesDir}`);
      return res.status(404).json({
        success: false,
        error: '画像ディレクトリが見つかりません',
        imagesDir: imagesDir
      });
    }

    let imagePath = null;
    let actualFilename = filename;
    let searchedPatterns = [];
    let patterns = []; // エラーハンドリング用にスコープ外で定義

    // 1. 直接ファイル名で検索
    const directPath = path.join(imagesDir, filename);
    if (fs.existsSync(directPath)) {
      imagePath = directPath;
      actualFilename = filename;
      console.log(`✅ 直接ファイル名で発見: ${filename}`);
    } else {
      // 2. UUIDを抽出してパターンマッチング
      const uuidMatch = filename.match(/([a-f0-9-]{36})/);
      if (uuidMatch) {
        const uuid = uuidMatch[1];
        console.log(`🔍 UUID抽出: ${uuid}`);

        // UUIDを含むファイルを検索
        try {
          const files = fs.readdirSync(imagesDir);
          console.log(`📁 ディレクトリ内のファイル数: ${files.length}`);

          // UUIDを含むファイルを検索（複数のパターンを試行）
          patterns = [
            `${uuid}_3_0.jpeg`,
            `${uuid}_2_0.jpeg`,
            `${uuid}_1_0.jpeg`,
            `${uuid}_0_0.jpeg`,
            `${uuid}.jpg`,
            `${uuid}.jpeg`,
            `chat_image_${uuid}_*.jpg`,
            `chat_image_${uuid}_*.jpeg`
          ];
          searchedPatterns = patterns;

          // パターンマッチング
          for (const pattern of patterns) {
            // ワイルドカードパターンの処理
            if (pattern.includes('*')) {
              const prefix = pattern.replace('*', '');
              const matchingFile = files.find(file =>
                file.startsWith(prefix.replace('.jpg', '').replace('.jpeg', '')) &&
                (file.endsWith('.jpg') || file.endsWith('.jpeg'))
              );

              if (matchingFile) {
                imagePath = path.join(imagesDir, matchingFile);
                actualFilename = matchingFile;
                console.log(`✅ ワイルドカードパターンで発見: ${matchingFile}`);
                break;
              }
            } else {
              // 完全一致パターン
              const testPath = path.join(imagesDir, pattern);
              if (fs.existsSync(testPath)) {
                imagePath = testPath;
                actualFilename = pattern;
                console.log(`✅ パターンマッチで発見: ${pattern}`);
                break;
              }
            }
          }

          // UUIDを含むすべてのファイルを検索（フォールバック）
          if (!imagePath) {
            const uuidFiles = files.filter(file =>
              file.includes(uuid) &&
              (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            );

            if (uuidFiles.length > 0) {
              // 最初に見つかったファイルを使用
              imagePath = path.join(imagesDir, uuidFiles[0]);
              actualFilename = uuidFiles[0];
              console.log(`✅ UUID検索で発見: ${uuidFiles[0]} (他${uuidFiles.length - 1}件)`);
            }
          }
        } catch (dirError) {
          console.error('❌ ディレクトリ読み込みエラー:', dirError.message);
          console.error('ディレクトリパス:', imagesDir);
        }
      }

      // 3. ファイル名から履歴IDを抽出して検索
      if (!imagePath) {
        const historyId = filename.replace(/\.(jpg|jpeg|png)$/i, '').replace(/_3_0$|_2_0$|_1_0$|_0_0$/, '');
        if (historyId && historyId !== filename) {
          console.log(`🔍 履歴ID抽出: ${historyId}`);
          try {
            const files = fs.readdirSync(imagesDir);
            const matchingFile = files.find(file =>
              file.includes(historyId) &&
              (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            );

            if (matchingFile) {
              imagePath = path.join(imagesDir, matchingFile);
              actualFilename = matchingFile;
              console.log(`✅ 履歴ID検索で発見: ${matchingFile}`);
            }
          } catch (dirError) {
            console.warn('ディレクトリ読み込みエラー:', dirError.message);
          }
        }
      }
    }

    if (!imagePath) {
      console.log(`❌ 画像ファイルが見つかりません: ${filename}`);
      return res.status(404).json({
        success: false,
        error: '画像ファイルが見つかりません',
        filename: filename,
        searchedPatterns: searchedPatterns || patterns || [],
        imagesDir: imagesDir
      });
    }

    const stat = fs.statSync(imagePath);
    const ext = path.extname(actualFilename).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    console.log(`✅ 画像ファイル配信: ${actualFilename} (${stat.size} bytes)`);
    const readStream = fs.createReadStream(imagePath);

    // ストリーミングエラーハンドリング
    readStream.on('error', (streamError) => {
      console.error('❌ 画像ストリーミングエラー:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '画像ファイルの読み込みに失敗しました',
          details: streamError.message
        });
      }
    });

    readStream.pipe(res);

  } catch (error) {
    console.error('❌ chat-exports画像ファイル取得エラー:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '画像ファイルの取得に失敗しました',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// 汎用画像ファイル配信API
apiRouter.get('/images/*', (req, res) => {
  try {
    const imagePath = req.params[0];
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');

    let targetDir = troubleshootingDir;
    if (!fs.existsSync(troubleshootingDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        return res.status(404).json({ error: 'ディレクトリが見つかりません' });
      }
    }

    const fullPath = path.join(targetDir, imagePath);

    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      res.status(404).json({ error: '画像ファイルが見つかりません' });
    }
  } catch (error) {
    console.error('❌ 汎用画像配信エラー:', error);
    res.status(500).json({ error: '画像の配信に失敗しました' });
  }
});

// emergency-flow画像配信エンドポイント
apiRouter.get('/emergency-flow/image/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    // CORSヘッダーを設定（本番環境対応）
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');

    // 大文字小文字を区別しないファイル検索関数
    const findFileCaseInsensitive = (dir, targetFileName) => {
      if (!fs.existsSync(dir)) {
        return null;
      }

      const files = fs.readdirSync(dir);
      const lowerTarget = targetFileName.toLowerCase();

      // 完全一致を優先
      if (files.includes(targetFileName)) {
        return path.join(dir, targetFileName);
      }

      // 大文字小文字を区別しない検索
      const foundFile = files.find(file => file.toLowerCase() === lowerTarget);
      if (foundFile) {
        console.log('✅ 大文字小文字を区別しない検索でファイルを発見:', {
          requested: targetFileName,
          found: foundFile
        });
        return path.join(dir, foundFile);
      }

      return null;
    };

    // 複数のパス候補を試す
    const cwd = process.cwd();
    const projectRoot = path.resolve(__dirname, '..');

    // emergency-flowsディレクトリのパス候補
    const emergencyFlowsPaths = [
      // プロジェクトルートから
      path.join(projectRoot, 'knowledge-base', 'images', 'emergency-flows'),
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'images', 'emergency-flows'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'images', 'emergency-flows'),
      // __dirnameから
      path.join(__dirname, '..', 'knowledge-base', 'images', 'emergency-flows'),
    ].map(p => path.resolve(p));

    console.log('🔍 emergency-flows パス候補:', emergencyFlowsPaths);
    console.log('📁 現在の作業ディレクトリ:', cwd);
    console.log('📁 プロジェクトルート:', projectRoot);

    let uploadDir = null;
    let filePath = null;

    // emergency-flowsディレクトリを検索
    for (const testDir of emergencyFlowsPaths) {
      if (!fs.existsSync(testDir)) {
        console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
        continue;
      }
      const foundPath = findFileCaseInsensitive(testDir, fileName);
      if (foundPath) {
        uploadDir = testDir;
        filePath = foundPath;
        console.log('✅ emergency-flowsディレクトリとファイルを発見:', {
          dir: uploadDir,
          file: filePath,
          fileName
        });
        break;
      }
    }

    // emergency-flows にファイルがない場合は chat-exports を確認
    if (!filePath) {
      const chatExportsPaths = [
        path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
        path.join(cwd, 'knowledge-base', 'images', 'chat-exports'),
        path.join(cwd, '..', 'knowledge-base', 'images', 'chat-exports'),
        path.join(__dirname, '..', 'knowledge-base', 'images', 'chat-exports'),
      ].map(p => path.resolve(p));

      console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
        fileName,
        chatExportsPaths,
      });

      for (const testDir of chatExportsPaths) {
        if (!fs.existsSync(testDir)) {
          continue;
        }
        const foundPath = findFileCaseInsensitive(testDir, fileName);
        if (foundPath) {
          uploadDir = testDir;
          filePath = foundPath;
          console.log('✅ chat-exportsディレクトリとファイルを発見:', {
            dir: uploadDir,
            file: filePath,
            fileName
          });
          break;
        }
      }
    }

    // デバッグログ強化
    console.log('🖼️ 画像リクエスト:', {
      fileName,
      uploadDir,
      filePath,
      exists: !!filePath,
      filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).slice(0, 10) : [],
    });

    if (!filePath) {
      // デバッグ情報をより詳細に収集
      const debugInfo = {
        error: 'ファイルが存在しません',
        fileName,
        searchedPaths: {
          emergencyFlows: emergencyFlowsPaths.map(p => ({
            path: p,
            exists: fs.existsSync(p),
            files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
          })),
          chatExports: chatExportsPaths.map(p => ({
            path: p,
            exists: fs.existsSync(p),
            files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
          })),
        },
        currentWorkingDirectory: cwd,
        projectRoot,
      };

      console.error('❌ 画像ファイルが見つかりません:', debugInfo);

      return res.status(404).json(debugInfo);
    }

    // ファイルのMIMEタイプを判定
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // ファイルを読み込んでレスポンス
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
    res.send(fileBuffer);

    console.log('✅ 画像配信成功:', {
      requestedFileName: fileName,
      actualFilePath: filePath,
      contentType,
      fileSize: fileBuffer.length,
      sourceDir: uploadDir.includes('emergency-flows')
        ? 'emergency-flows'
        : 'chat-exports',
    });
  } catch (error) {
    console.error('❌ 画像配信エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: req.params.fileName,
    });
    res.status(500).json({
      success: false,
      error: '画像の配信に失敗しました',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// 履歴ルート: knowledge-base/exports内のJSONファイルから検索・フィルター
// TypeScriptファイルを直接インポートできないため、エンドポイントを直接実装
// 注意: /history/export-filesは上で既に定義されているため、ここでは重複しない

// GET /api/history/exports/search - キーワード検索
apiRouter.get('/history/exports/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    console.log('🔍 検索リクエスト受信:', { keyword, type: typeof keyword });

    if (!keyword || typeof keyword !== 'string') {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが指定されていません',
      });
    }

    // 既存のhistoryエンドポイントと同じパス解決ロジックを使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // 検索語を正規化（小文字化）
    const keywordLower = keyword.toLowerCase().trim();
    const searchTerms = keywordLower.split(/\s+/).filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが無効です',
      });
    }

    console.log('🔍 検索開始:', { keyword, keywordLower, searchTerms, totalFiles: jsonFiles.length });

    const results = [];

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // JSON全体を文字列化して検索対象にする
        const fullText = JSON.stringify(jsonData).toLowerCase();

        // すべての検索語が含まれているか確認
        const matches = searchTerms.every(term => fullText.includes(term));

        if (matches) {
          // SupportHistoryItem形式に変換
          // savedImagesを画像URL形式に変換
          const processedSavedImages = (jsonData.savedImages || []).map((img) => {
            if (typeof img === 'string') {
              return img;
            }
            if (img && typeof img === 'object') {
              // fileNameがある場合は、それをURLとして使用
              if (img.fileName) {
                return {
                  ...img,
                  url: `/api/images/chat-exports/${img.fileName}`,
                  fileName: img.fileName
                };
              }
              // urlやpathがある場合はそのまま使用
              if (img.url || img.path) {
                return img;
              }
            }
            return img;
          });

          const item = {
            id: jsonData.chatId || fileName.replace('.json', ''),
            type: 'export',
            fileName: fileName,
            chatId: jsonData.chatId || '',
            userId: jsonData.userId || '',
            exportType: jsonData.exportType || 'manual_send',
            exportTimestamp: jsonData.exportTimestamp || new Date().toISOString(),
            messageCount: jsonData.chatData?.messages?.length || 0,
            machineType: jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '',
            machineNumber: jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '',
            machineInfo: jsonData.chatData?.machineInfo || {},
            title: jsonData.title || '',
            problemDescription: jsonData.problemDescription || '',
            extractedComponents: [],
            extractedSymptoms: [],
            possibleModels: [],
            conversationHistory: jsonData.conversationHistory || [],
            metadata: {},
            savedImages: processedSavedImages,
            images: processedSavedImages.map((img) => ({
              fileName: typeof img === 'string' ? img : (img.fileName || img.url || img.path || ''),
              url: typeof img === 'string' ? img : (img.url || `/api/images/chat-exports/${img.fileName || img.path || ''}`),
              path: typeof img === 'string' ? img : (img.path || img.fileName || '')
            })),
            fileSize: 0,
            lastModified: jsonData.lastModified || jsonData.exportTimestamp || new Date().toISOString(),
            createdAt: jsonData.exportTimestamp || new Date().toISOString(),
            jsonData: jsonData,
          };
          results.push(item);
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    console.log('🔍 検索完了:', {
      keyword,
      totalFiles: jsonFiles.length,
      resultsCount: results.length
    });

    res.json({
      success: true,
      data: results,
      total: results.length,
      keyword: keyword,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ エクスポート検索エラー:', error);
    res.status(500).json({
      success: false,
      error: 'エクスポート検索に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/history/machine-data - 機種・機械番号マスターデータを取得（PostgreSQLから）
apiRouter.get('/history/machine-data', async (req, res) => {
  try {
    console.log('📋 機種・機械番号データ取得リクエスト（PostgreSQLから）');

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    if (!dbPool) {
      return res.status(503).json({
        success: false,
        error: 'データベース接続が利用できません',
        machineTypes: [],
        machines: []
      });
    }

    // PostgreSQLのmachine_typesテーブルから機種一覧を取得
    const machineTypesResult = await dbPool.query(
      'SELECT id, machine_type_name AS "machineTypeName" FROM machine_types ORDER BY machine_type_name'
    );
    const machineTypesData = machineTypesResult.rows.map(row => ({
      id: row.id,
      machineTypeName: row.machineTypeName
    }));

    console.log('📋 PostgreSQLから取得した機種データ:', machineTypesData.length, '件');

    // PostgreSQLのmachinesテーブルから機械番号一覧を取得（機種名も含む）
    const machinesResult = await dbPool.query(`
      SELECT
        m.id,
        m.machine_number AS "machineNumber",
        m.machine_type_id AS "machineTypeId",
        mt.machine_type_name AS "machineTypeName"
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      ORDER BY m.machine_number
    `);
    const machinesData = machinesResult.rows.map(row => ({
      id: row.id,
      machineNumber: row.machineNumber,
      machineTypeId: row.machineTypeId,
      machineTypeName: row.machineTypeName
    }));

    console.log('📋 PostgreSQLから取得した機械データ:', machinesData.length, '件');

    const result = {
      machineTypes: machineTypesData,
      machines: machinesData,
    };

    console.log('📋 機種・機械番号データ取得結果:', {
      machineTypes: machineTypesData.length,
      machines: machinesData.length,
      sampleMachineTypes: machineTypesData.slice(0, 3),
      sampleMachines: machinesData.slice(0, 3),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種・機械番号データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      machineTypes: [],
      machines: []
    });
  }
});

// GET /api/history/exports/filter-data - 機種・機械番号のリスト取得
apiRouter.get('/history/exports/filter-data', async (req, res) => {
  try {
    // 既存のhistoryエンドポイントと同じパス解決ロジックを使用
    const projectRoot = path.resolve(__dirname, '..');
    const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        machineTypes: [],
        machineNumbers: [],
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const machineTypeSet = new Set();
    const machineNumberSet = new Set();

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // 機種を抽出
        const machineType = jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '';
        if (machineType && machineType.trim()) {
          machineTypeSet.add(machineType.trim());
        }

        // 機械番号を抽出
        const machineNumber = jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '';
        if (machineNumber && machineNumber.trim()) {
          machineNumberSet.add(machineNumber.trim());
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    const machineTypes = Array.from(machineTypeSet).sort();
    const machineNumbers = Array.from(machineNumberSet).sort();

    res.json({
      success: true,
      machineTypes: machineTypes,
      machineNumbers: machineNumbers,
      total: jsonFiles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ フィルターデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フィルターデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/history/summarize - JSONデータをGPTで要約する
apiRouter.post('/history/summarize', async (req, res) => {
  try {
    const { jsonData } = req.body;

    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'JSONデータが必要です',
      });
    }

    console.log('📝 GPT要約リクエスト受信（統一サーバー）');

    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI APIが利用できません。OPENAI_API_KEY環境変数を設定してください。',
      });
    }

    // JSONデータから要約用のテキストを構築
    const summaryParts = [];

    // 1. 事象タイトル
    if (jsonData.title) {
      summaryParts.push(`事象: ${jsonData.title}`);
    }

    // 2. 発生事象の詳細
    if (jsonData.problemDescription) {
      summaryParts.push(`問題説明: ${jsonData.problemDescription}`);
    }

    // 3. 会話履歴からテキストメッセージを抽出
    if (Array.isArray(jsonData.conversationHistory)) {
      const conversationTexts = [];
      jsonData.conversationHistory.forEach((msg) => {
        if (msg && typeof msg === 'object' && typeof msg.content === 'string') {
          // 画像データは除外
          if (!msg.content.startsWith('data:image/')) {
            conversationTexts.push(msg.content);
          }
        }
      });
      if (conversationTexts.length > 0) {
        summaryParts.push(`会話内容: ${conversationTexts.join(' ')}`);
      }
    }

    // 4. 影響コンポーネント
    if (Array.isArray(jsonData.extractedComponents) && jsonData.extractedComponents.length > 0) {
      summaryParts.push(`影響コンポーネント: ${jsonData.extractedComponents.join(', ')}`);
    }

    // 5. 症状
    if (Array.isArray(jsonData.extractedSymptoms) && jsonData.extractedSymptoms.length > 0) {
      summaryParts.push(`症状: ${jsonData.extractedSymptoms.join(', ')}`);
    }

    // 6. 処置内容
    if (jsonData.answer) {
      summaryParts.push(`処置内容: ${jsonData.answer}`);
    }

    // 要約用のテキストを作成
    const textToSummarize = summaryParts.join('\n\n');

    if (!textToSummarize || textToSummarize.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '要約する内容がありません',
      });
    }

    // 長すぎるテキストを切り詰める
    const truncatedText = textToSummarize.length > 4000 ? textToSummarize.substring(0, 4000) + '...' : textToSummarize;

    // GPTで要約を生成
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは技術文書の要約を行う専門家です。文章の要点を保ちながら、簡潔に要約してください。',
        },
        {
          role: 'user',
          content: `以下のテキストを100語程度に要約してください:\n\n${truncatedText}`,
        },
      ],
      temperature: 0.3,
    });

    const summary = response.choices[0].message.content || '';

    console.log('✅ GPT要約生成完了:', summary.substring(0, 100) + '...');

    res.json({
      success: true,
      summary: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ GPT要約エラー:', error);
    res.status(500).json({
      success: false,
      error: '要約の生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/history/update-item/:id - 履歴アイテムの更新（JSONファイルに差分で上書き保存）
apiRouter.put('/history/update-item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedData, updatedBy = 'user' } = req.body;

    console.log('📝 履歴アイテム更新リクエスト（統一サーバー）:', {
      id,
      updatedDataType: typeof updatedData,
      updatedDataKeys: updatedData ? Object.keys(updatedData) : [],
      updatedBy,
    });

    // IDを正規化（export_プレフィックス除去など）
    let normalizedId = id;
    if (id.startsWith('export_')) {
      normalizedId = id.replace('export_', '');
      // ファイル名の場合は拡張子も除去
      if (normalizedId.endsWith('.json')) {
        normalizedId = normalizedId.replace('.json', '');
      }
      // ファイル名からchatIdを抽出（_で区切られた2番目の部分）
      const parts = normalizedId.split('_');
      if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
        normalizedId = parts[1];
      }
    }

    console.log('📝 正規化されたID:', normalizedId, '元のID:', id);

    // 元のJSONファイルを検索
    const projectRoot = path.resolve(__dirname, '..');
    let exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(exportsDir)) {
      console.log('📁 exportsディレクトリを作成:', exportsDir);
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log('📂 検索対象ファイル数:', jsonFiles.length);

    let targetFile = null;
    let originalData = null;

    // ファイルを検索（chatIdを含むファイルを探す）
    for (const file of jsonFiles) {
      const filePath = path.join(exportsDir, file);

      // ファイル名にIDが含まれているかチェック
      if (file.includes(normalizedId)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          // chatIdで確認
          if (data.chatId === normalizedId || data.id === normalizedId || file.includes(normalizedId)) {
            targetFile = filePath;
            originalData = data;
            console.log('✅ 対象ファイルを発見:', file);
            break;
          }
        } catch (error) {
          console.warn(`ファイル読み込みエラー: ${filePath}`, error);
        }
      }
    }

    if (!targetFile || !originalData) {
      console.log('❌ 対象ファイルが見つかりません:', {
        id,
        normalizedId,
        exportsDir,
        filesFound: jsonFiles.length,
      });

      return res.status(404).json({
        success: false,
        error: '対象の履歴ファイルが見つかりません',
        id: id,
        normalizedId: normalizedId,
        searchedDirectory: exportsDir,
        availableFiles: jsonFiles.slice(0, 10),
      });
    }

    // 差分を適用して更新（既存データを保持し、変更されたフィールドのみ更新）
    const mergeData = (original, updates) => {
      const result = { ...original };

      for (const [key, value] of Object.entries(updates)) {
        // undefinedの値はスキップ（既存の値を保持）
        if (value === undefined) {
          continue;
        }

        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          // オブジェクトの場合は再帰的にマージ（既存の値を保持）
          if (original[key] && typeof original[key] === 'object' && !Array.isArray(original[key])) {
            result[key] = mergeData(original[key], value);
          } else {
            // 既存のオブジェクトがない場合は、新しい値を設定（既存データがあればマージ）
            result[key] = { ...(original[key] || {}), ...value };
          }
        } else {
          // プリミティブ値や配列、Dateは直接代入（更新される）
          result[key] = value;
        }
      }

      return result;
    };

    // 既存のデータを保持しながら、更新データをマージ
    const updatedJsonData = mergeData(originalData, {
      ...updatedData,
      lastModified: new Date().toISOString(),
    });

    // 更新履歴を追加（既存のupdateHistoryは保持）
    if (!updatedJsonData.updateHistory || !Array.isArray(updatedJsonData.updateHistory)) {
      updatedJsonData.updateHistory = [];
    }

    // 新しい更新履歴を追加（既存の履歴は保持）
    updatedJsonData.updateHistory.push({
      timestamp: new Date().toISOString(),
      updatedFields: Object.keys(updatedData).filter(key => updatedData[key] !== undefined),
      updatedBy: updatedBy,
    });

    // バックアップを作成（簡易版：タイムスタンプ付きファイル名）
    let backupPath = null;
    try {
      const backupDir = path.join(exportsDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${timestamp}_${path.basename(targetFile)}`;
      backupPath = path.join(backupDir, backupFileName);
      fs.copyFileSync(targetFile, backupPath);
      console.log('💾 バックアップ作成完了:', backupPath);
    } catch (backupError) {
      console.warn('⚠️ バックアップ作成に失敗:', backupError);
      // バックアップに失敗しても続行
    }

    // ファイルに上書き保存
    fs.writeFileSync(
      targetFile,
      JSON.stringify(updatedJsonData, null, 2),
      'utf8'
    );

    console.log('✅ 履歴ファイル更新完了:', targetFile);
    console.log('📊 更新されたフィールド:', Object.keys(updatedData).filter(key => updatedData[key] !== undefined));

    res.json({
      success: true,
      message: '履歴ファイルが更新されました',
      updatedFile: path.basename(targetFile),
      updatedData: updatedJsonData,
      backupFile: backupPath ? path.basename(backupPath) : null,
      backupPath: backupPath,
    });
  } catch (error) {
    console.error('❌ 履歴アイテム更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴アイテムの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

console.log('✅ History exports endpoints registered');

// Knowledge Base Cleanup Endpoints
// 自動アーカイブ処理（1年以上経過データ）
async function autoArchiveOldData() {
  try {
    console.log('📦 自動アーカイブ処理開始（1年以上経過データ）');

    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const archivesDir = path.join(knowledgeBaseDir, 'archives');

    // アーカイブディレクトリが存在しない場合は作成
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
      console.log('📁 アーカイブディレクトリを作成しました:', archivesDir);
    }

    // アーカイブ対象ディレクトリ
    const directoriesToArchive = ['documents', 'text', 'qa', 'troubleshooting'];
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    let archivedCount = 0;
    let filesToArchive = [];

    // 1年以上経過したファイルを収集
    for (const dirName of directoriesToArchive) {
      const targetDir = path.join(knowledgeBaseDir, dirName);
      if (!fs.existsSync(targetDir)) {
        continue;
      }

      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < oneYearAgo) {
              filesToArchive.push({
                path: filePath,
                dirName: dirName,
                fileName: file
              });
            }
          } catch (fileError) {
            console.error(`❌ ファイル情報取得エラー: ${filePath}`, fileError);
          }
        }
      } catch (dirError) {
        console.error(`❌ ディレクトリ処理エラー: ${targetDir}`, dirError);
      }
    }

    // アーカイブ対象がある場合のみ処理
    if (filesToArchive.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const archiveFileName = `auto-archive-${timestamp}.zip`;
      const archiveFilePath = path.join(archivesDir, archiveFileName);

      const output = fs.createWriteStream(archiveFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.pipe(output);

      // ファイルをアーカイブに追加
      for (const fileInfo of filesToArchive) {
        try {
          if (fs.statSync(fileInfo.path).isDirectory()) {
            archive.directory(fileInfo.path, `${fileInfo.dirName}/${fileInfo.fileName}`);
          } else {
            archive.file(fileInfo.path, { name: `${fileInfo.dirName}/${fileInfo.fileName}` });
          }
          archivedCount++;
        } catch (err) {
          console.error(`❌ アーカイブ追加エラー: ${fileInfo.path}`, err);
        }
      }

      // アーカイブ完了を待つ
      await new Promise((resolve, reject) => {
        output.on('close', () => {
          resolve();
        });
        archive.on('error', (err) => {
          reject(err);
        });
        archive.finalize();
      });

      // アーカイブ後、元のファイルを削除
      for (const fileInfo of filesToArchive) {
        try {
          if (fs.statSync(fileInfo.path).isDirectory()) {
            fs.rmSync(fileInfo.path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fileInfo.path);
          }
        } catch (err) {
          console.error(`❌ ファイル削除エラー: ${fileInfo.path}`, err);
        }
      }

      const stats = fs.statSync(archiveFilePath);
      console.log(`✅ 自動アーカイブ完了: ${archivedCount}件をアーカイブ (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    } else {
      console.log('📦 アーカイブ対象のファイルはありませんでした');
    }
  } catch (error) {
    console.error('❌ 自動アーカイブエラー:', error);
  }
}

// 自動メンテナンス処理（整理・重複解消・状況更新）
async function autoMaintenance() {
  try {
    console.log('🔧 自動メンテナンス処理開始');

    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');

    // 1. 自動整理: 空のディレクトリや一時ファイルのクリーンアップ
    const directoriesToCheck = ['documents', 'text', 'qa', 'troubleshooting'];
    let cleanedCount = 0;

    for (const dirName of directoriesToCheck) {
      const targetDir = path.join(knowledgeBaseDir, dirName);
      if (!fs.existsSync(targetDir)) continue;

      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          try {
            const stats = fs.statSync(filePath);
            // 空のファイルや破損したファイルを削除（将来的に拡張可能）
            if (stats.size === 0 && stats.isFile()) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          } catch (err) {
            // エラーは無視
          }
        }
      } catch (err) {
        // エラーは無視
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 自動整理完了: ${cleanedCount}件のファイルを整理`);
    }

    // 2. 重複解消: 重複ファイルの検出と削除（将来的に拡張可能）
    // 現在は基本的な重複チェックのみ

    // 3. 状況更新: 統計情報は自動的に更新される

    console.log('✅ 自動メンテナンス処理完了');
  } catch (error) {
    console.error('❌ 自動メンテナンスエラー:', error);
  }
}

// 自動スケジュール設定（サーバー起動時）
function setupAutoSchedules() {
  // 毎日午前2時に自動アーカイブ処理
  const now = new Date();
  const nextArchiveTime = new Date(now);
  nextArchiveTime.setHours(2, 0, 0, 0);
  if (nextArchiveTime <= now) {
    nextArchiveTime.setDate(nextArchiveTime.getDate() + 1);
  }

  const archiveInterval = 24 * 60 * 60 * 1000; // 24時間
  setTimeout(() => {
    autoArchiveOldData();
    setInterval(autoArchiveOldData, archiveInterval);
  }, nextArchiveTime.getTime() - now.getTime());

  // 毎日午前3時に自動メンテナンス
  const nextMaintenanceTime = new Date(now);
  nextMaintenanceTime.setHours(3, 0, 0, 0);
  if (nextMaintenanceTime <= now) {
    nextMaintenanceTime.setDate(nextMaintenanceTime.getDate() + 1);
  }

  const maintenanceInterval = 24 * 60 * 60 * 1000; // 24時間
  setTimeout(() => {
    autoMaintenance();
    setInterval(autoMaintenance, maintenanceInterval);
  }, nextMaintenanceTime.getTime() - now.getTime());

  console.log('⏰ 自動スケジュールを設定しました（アーカイブ: 毎日午前2時、メンテナンス: 毎日午前3時）');
}

// POST /api/knowledge-base/cleanup/auto - 1年以上経過データを自動アーカイブ（手動実行用）
apiRouter.post('/knowledge-base/cleanup/auto', async (req, res) => {
  try {
    console.log('🗑️ 自動アーカイブリクエスト（1年以上経過データ）');

    await autoArchiveOldData();

    res.json({
      success: true,
      message: '1年以上経過データをアーカイブしました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 自動アーカイブエラー:', error);
    res.status(500).json({
      success: false,
      error: '自動アーカイブに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge-base/cleanup/manual - 手動クリーンアップ（日数指定または全削除）
apiRouter.post('/knowledge-base/cleanup/manual', async (req, res) => {
  try {
    const { olderThanDays, deleteAll } = req.body;
    console.log('🗑️ 手動クリーンアップリクエスト:', { olderThanDays, deleteAll });

    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');

    // 削除対象ディレクトリ
    const directoriesToClean = [
      'documents',
      'text',
      'qa',
      'troubleshooting'
    ];

    let cutoffTime;
    if (deleteAll) {
      cutoffTime = Date.now() + (365 * 24 * 60 * 60 * 1000); // 未来の日時 = すべて削除
      console.log('⚠️ 全削除モード');
    } else if (olderThanDays && typeof olderThanDays === 'number') {
      cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      console.log(`📅 ${olderThanDays}日以上経過データを削除`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'olderThanDaysまたはdeleteAllの指定が必要です',
        timestamp: new Date().toISOString()
      });
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const dirName of directoriesToClean) {
      const targetDir = path.join(knowledgeBaseDir, dirName);
      if (!fs.existsSync(targetDir)) {
        console.log(`📂 ディレクトリが存在しません: ${targetDir}`);
        continue;
      }

      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          try {
            const stats = fs.statSync(filePath);
            // 全削除モードまたは指定日数より古い場合
            if (deleteAll || stats.mtimeMs < cutoffTime) {
              if (stats.isDirectory()) {
                // ディレクトリの場合は再帰的に削除
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`🗑️ ディレクトリ削除: ${filePath}`);
              } else {
                fs.unlinkSync(filePath);
                console.log(`🗑️ ファイル削除: ${filePath}`);
              }
              deletedCount++;
            }
          } catch (fileError) {
            console.error(`❌ ファイル削除エラー: ${filePath}`, fileError);
            errorCount++;
          }
        }
      } catch (dirError) {
        console.error(`❌ ディレクトリ処理エラー: ${targetDir}`, dirError);
        errorCount++;
      }
    }

    console.log(`✅ 手動クリーンアップ完了: ${deletedCount}件削除, ${errorCount}件エラー`);

    res.json({
      success: true,
      deletedCount: deletedCount,
      errorCount: errorCount,
      message: `${deletedCount}件のファイルを削除しました`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 手動クリーンアップエラー:', error);
    res.status(500).json({
      success: false,
      error: '手動クリーンアップに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge-base/archive - アーカイブ作成
apiRouter.post('/knowledge-base/archive', async (req, res) => {
  try {
    console.log('📦 アーカイブ作成リクエスト');

    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const archivesDir = path.join(knowledgeBaseDir, 'archives');

    // アーカイブディレクトリが存在しない場合は作成
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
      console.log('📁 アーカイブディレクトリを作成しました:', archivesDir);
    }

    // アーカイブファイル名（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const archiveFileName = `knowledge-archive-${timestamp}.zip`;
    const archiveFilePath = path.join(archivesDir, archiveFileName);

    // アーカイブ作成
    const output = fs.createWriteStream(archiveFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高圧縮
    });

    archive.pipe(output);

    // knowledge-base の主要なフォルダをアーカイブに追加
    const foldersToArchive = ['documents', 'data', 'exports'];

    for (const folder of foldersToArchive) {
      const folderPath = path.join(knowledgeBaseDir, folder);
      if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, folder);
        console.log(`📁 ${folder} をアーカイブに追加`);
      }
    }

    // index.json がある場合は追加
    const indexFile = path.join(knowledgeBaseDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      archive.file(indexFile, { name: 'index.json' });
      console.log('📄 index.json をアーカイブに追加');
    }

    // アーカイブ完了を待つ（Promiseでラップ）
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve();
      });
      archive.on('error', (err) => {
        reject(err);
      });
      archive.finalize();
    });

    const stats = fs.statSync(archiveFilePath);

    console.log(`✅ アーカイブ作成完了: ${archiveFileName} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);

    res.json({
      success: true,
      message: 'アーカイブが正常に作成されました',
      data: {
        name: archiveFileName,
        size: stats.size,
        createdAt: new Date().toISOString(),
        path: archiveFilePath
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ アーカイブ作成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'アーカイブの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/knowledge-base/archives - アーカイブ一覧取得
apiRouter.get('/knowledge-base/archives', async (req, res) => {
  try {
    console.log('📁 アーカイブ一覧取得リクエスト');

    const projectRoot = path.resolve(__dirname, '..');
    const archivesDir = path.join(projectRoot, 'knowledge-base', 'archives');

    if (!fs.existsSync(archivesDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'アーカイブディレクトリが存在しません',
        timestamp: new Date().toISOString()
      });
    }

    const files = fs.readdirSync(archivesDir);
    const archiveFiles = files
      .filter(file => file.endsWith('.zip') || file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(archivesDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: archiveFiles,
      total: archiveFiles.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ アーカイブ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'アーカイブ一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge-base/export - 全データエクスポート
apiRouter.post('/knowledge-base/export', async (req, res) => {
  try {
    const { type = 'all', destination = 'local', externalPath } = req.body;
    console.log('📦 全データエクスポートリクエスト:', { type, destination, externalPath });

    const projectRoot = path.resolve(__dirname, '..');
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');

    // エクスポートファイル名（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const exportFileName = `knowledge-export-${timestamp}.zip`;

    // 一時ファイルまたはストリームを作成
    let tempFilePath = null;
    let output = null;

    if (destination === 'local') {
      // ローカルの場合: 一時ファイルを作成
      tempFilePath = path.join(projectRoot, `temp-${Date.now()}.zip`);
      if (!fs.existsSync(path.dirname(tempFilePath))) {
        fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
      }
      output = fs.createWriteStream(tempFilePath);
    } else {
      // 外部ストレージの場合: 直接保存先に書き込む
      const saveDir = path.join(knowledgeBaseDir, externalPath === 'exports' ? 'exports' : 'archives');
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      const savedFilePath = path.join(saveDir, exportFileName);
      output = fs.createWriteStream(savedFilePath);
    }

    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高圧縮
    });

    archive.pipe(output);

    // knowledge-base の主要なフォルダをエクスポートに追加
    const foldersToExport = ['documents', 'data', 'exports'];

    for (const folder of foldersToExport) {
      const folderPath = path.join(knowledgeBaseDir, folder);
      if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, folder);
        console.log(`📁 ${folder} をエクスポートに追加`);
      }
    }

    // index.json がある場合は追加
    const indexFile = path.join(knowledgeBaseDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      archive.file(indexFile, { name: 'index.json' });
      console.log('📄 index.json をエクスポートに追加');
    }

    // エクスポート完了を待つ（Promiseでラップ）
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve();
      });
      archive.on('error', (err) => {
        reject(err);
      });
      archive.finalize();
    });

    if (destination === 'local') {
      // ローカルダウンロード: ファイルを読み込んで送信
      const fileStats = fs.statSync(tempFilePath);
      const fileBuffer = fs.readFileSync(tempFilePath);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);
      res.setHeader('Content-Length', fileStats.size);
      res.send(fileBuffer);

      // 一時ファイルを削除
      fs.unlinkSync(tempFilePath);
    } else {
      // 外部ストレージ保存: ファイルは既に保存されている
      const saveDir = path.join(knowledgeBaseDir, externalPath === 'exports' ? 'exports' : 'archives');
      const savedFilePath = path.join(saveDir, exportFileName);
      const stats = fs.statSync(savedFilePath);

      console.log(`✅ エクスポート完了: ${exportFileName} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);

      res.json({
        success: true,
        message: 'エクスポートが正常に完了しました',
        data: {
          name: exportFileName,
          size: stats.size,
          path: savedFilePath,
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ エクスポートエラー:', error);
    res.status(500).json({
      success: false,
      error: 'エクスポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge/maintenance/run - 手動メンテナンス実行
apiRouter.post('/knowledge/maintenance/run', async (req, res) => {
  try {
    console.log('🔧 手動メンテナンス実行リクエスト');
    await autoMaintenance();
    res.json({
      success: true,
      message: 'メンテナンス処理が完了しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ メンテナンス実行エラー:', error);
    res.status(500).json({
      success: false,
      error: 'メンテナンス処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/knowledge/deduplication/resolve - 重複解決
apiRouter.post('/knowledge/deduplication/resolve', async (req, res) => {
  try {
    console.log('🔄 重複解決リクエスト');
    // 重複解決は自動メンテナンスと一緒に実行
    await autoMaintenance();
    res.json({
      success: true,
      message: '重複解決処理が完了しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 重複解決エラー:', error);
    res.status(500).json({
      success: false,
      error: '重複解決処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Knowledge Base cleanup endpoints registered');

// POST /api/files/import - ファイルインポート（チャンク処理・RAG対応）
apiRouter.post('/files/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'ファイルが選択されていません'
      });
    }

    const { originalname, path: tempPath } = req.file;
    const category = req.body.category || 'general';
    const saveOriginalFile = req.body.saveOriginalFile === 'true'; // チェックボックスの値

    console.log(`📁 ファイルインポート開始: ${originalname} (元ファイル保存: ${saveOriginalFile})`);

    // ファイルからテキストを抽出
    let extractedText = '';
    const ext = path.extname(originalname).toLowerCase();

    if (ext === '.txt') {
      extractedText = fs.readFileSync(tempPath, 'utf-8');
    } else {
      // PDF、Excel、PowerPointは現時点ではファイル名のみ
      console.log(`${ext}処理は未実装のため、ファイル名のみ保存`);
      extractedText = `File: ${originalname}`;
    }

    // knowledge-baseディレクトリのパス解決
    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
    const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base');

    let targetDir = knowledgeBaseDir;
    if (!fs.existsSync(knowledgeBaseDir)) {
      if (fs.existsSync(alternativeDir)) {
        targetDir = alternativeDir;
      } else {
        fs.mkdirSync(knowledgeBaseDir, { recursive: true });
        targetDir = knowledgeBaseDir;
      }
    }

    // documentsディレクトリの確認・作成
    const documentsDir = path.join(targetDir, 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // ドキュメントIDを生成（タイムスタンプベース）
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docDir = path.join(documentsDir, docId);
    fs.mkdirSync(docDir, { recursive: true });

    // ファイル名のエンコーディング修正（日本語ファイル名対応）
    // multerがファイル名をエンコードして保存している可能性があるため、デコードを試行
    function decodeFileName(fileName) {
      try {
        // multerがファイル名をエンコードしている場合のデコード
        // Windowsでの文字化けを防ぐため、UTF-8で正しく処理
        if (typeof fileName === 'string') {
          // URLエンコードされている場合のデコード
          if (fileName.includes('%')) {
            try {
              return decodeURIComponent(fileName);
            } catch (e) {
              // URLエンコードでない場合はそのまま
            }
          }

          // BufferからUTF-8として解釈（文字化け修正）
          // 既に文字化けしている場合は、Bufferを使って正しいエンコーディングで再構築
          const buffer = Buffer.from(fileName, 'latin1');  // 文字化けした文字列をlatin1として解釈
          return buffer.toString('utf8');  // UTF-8として変換
        }
        return fileName;
      } catch (error) {
        console.warn('ファイル名デコードエラー:', error);
        return fileName;
      }
    }

    // 元のファイル名をデコード
    const decodedFileName = decodeFileName(originalname);

    // 安全なファイル名に変換（Windowsのファイルシステム制限に対応）
    function sanitizeFileName(fileName) {
      // 拡張子を取得
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);

      // 危険な文字を除去・置換（Windowsファイル名の制限文字）
      let safeName = baseName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')  // Windowsで使用不可の文字をアンダースコアに
        .replace(/\s+/g, ' ')                     // 連続する空白を1つに
        .substring(0, 200);                       // ファイル名の長さ制限

      // 空の場合はタイムスタンプを使用
      if (!safeName || safeName.trim().length === 0) {
        safeName = `file_${Date.now()}`;
      }

      return safeName + ext;
    }

    const safeFileName = sanitizeFileName(decodedFileName);

    // キーワード抽出関数（日本語対応）
    function extractKeywords(text) {
      // 簡単なキーワード抽出：2文字以上の連続する文字列を抽出
      const words = text.match(/[ぁ-んァ-ヶー一-龠々]{2,}/g) || [];
      const wordCount = {};

      words.forEach(word => {
        if (word.length >= 2 && word.length <= 10) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });

      // 出現頻度の高い順に最大10個のキーワードを返す
      return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    }

    // テキストの前処理（RAG精度向上のため）
    // 1. 連続する空白・改行を正規化
    let processedText = extractedText
      .replace(/\r\n/g, '\n')  // 改行コード統一
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')  // 連続改行を2つまで
      .replace(/[ \t]{2,}/g, ' ')  // 連続空白を1つに
      .trim();

    // 2. チャンク設定（500文字、100文字オーバーラップ = 20%）
    const chunkSize = 500;
    const overlap = 100;
    const minChunkSize = 50;  // 最小チャンクサイズ（短すぎるチャンクを除外）
    const chunks = [];

    // 3. 意味的な境界で分割する関数（段落、句点、改行を優先）
    function findBestSplitPoint(text, startPos, targetEndPos) {
      const maxSearchBack = 150;  // 最大150文字戻って境界を探す
      const searchStart = Math.max(startPos, targetEndPos - maxSearchBack);

      // 優先順位: 段落境界 > 改行 > 句点 > 空白
      const boundaries = [
        /\n\n/,  // 段落境界
        /\n/,    // 改行
        /[。．！？]/,  // 句点
        /[、，]/g,    // 読点
        /\s+/,   // 空白
      ];

      // 後ろから探す（文の途中で切れないように）
      for (let pos = targetEndPos; pos >= searchStart; pos--) {
        const char = text[pos];

        // 段落境界を最優先
        if (pos > 0 && text.substring(pos - 1, pos + 1) === '\n\n') {
          return pos + 1;
        }

        // 改行
        if (char === '\n') {
          return pos + 1;
        }

        // 句点
        if (['。', '．', '！', '？'].includes(char)) {
          return pos + 1;
        }

        // 読点（最小限の戻り）
        if (['、', '，'].includes(char) && pos >= targetEndPos - 20) {
          return pos + 1;
        }
      }

      // 境界が見つからない場合は空白で分割
      for (let pos = targetEndPos; pos >= searchStart; pos--) {
        if (/\s/.test(text[pos])) {
          return pos + 1;
        }
      }

      // それでも見つからない場合は指定位置で分割
      return targetEndPos;
    }

    // 4. チャンク分割処理（意味的な境界を考慮）
    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < processedText.length) {
      const targetEndPos = Math.min(startPos + chunkSize, processedText.length);

      // 最後のチャンクの場合
      if (targetEndPos >= processedText.length) {
        const chunkText = processedText.substring(startPos).trim();
        if (chunkText.length >= minChunkSize) {
          const keywords = extractKeywords(chunkText);
          chunks.push({
            text: chunkText,
            index: chunkIndex++,
            startPos: startPos,
            endPos: processedText.length,
            length: chunkText.length,
            chunkId: `${docId}_chunk_${chunkIndex - 1}`,
            keywords: keywords,
            preview: chunkText.substring(0, 100) + (chunkText.length > 100 ? '...' : ''),
          });
        }
        break;
      }

      // 最適な分割点を探す
      const splitPos = findBestSplitPoint(processedText, startPos, targetEndPos);
      const chunkText = processedText.substring(startPos, splitPos).trim();

      if (chunkText.length >= minChunkSize) {
        // キーワード抽出（簡単な方法：名詞らしき語を抽出）
        const keywords = extractKeywords(chunkText);

        chunks.push({
          text: chunkText,
          index: chunkIndex++,
          startPos: startPos,
          endPos: splitPos,
          length: chunkText.length,
          chunkId: `${docId}_chunk_${chunkIndex - 1}`,
          keywords: keywords,
          preview: chunkText.substring(0, 100) + (chunkText.length > 100 ? '...' : ''),
        });
      }

      // オーバーラップ処理：前のチャンクと重複させて文脈を保持
      startPos = Math.max(startPos + 1, splitPos - overlap);

      // 無限ループ防止
      if (startPos >= splitPos) {
        startPos = splitPos;
      }
    }

    // ドキュメント全体のキーワード抽出
    const documentKeywords = extractKeywords(processedText);

    // メタデータを作成（RAG用の詳細情報を含む）
    const metadata = {
      id: docId,
      title: decodedFileName.replace(/\.[^/.]+$/, ''),
      originalFileName: originalname,      // multerが受け取った元のファイル名（文字化け前の可能性）
      decodedFileName: decodedFileName,       // デコード後のファイル名
      safeFileName: safeFileName,            // 保存時の安全なファイル名
      category: category,
      type: 'document',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileType: ext,
      chunkCount: chunks.length,
      textLength: processedText.length,
      originalTextLength: extractedText.length,
      processedAt: new Date().toISOString(),
      // RAG用の追加情報
      ragConfig: {
        chunkSize: 500,
        overlap: 100,
        minChunkSize: 50,
        processingMethod: 'semantic-boundary-aware',
      },
      keywords: documentKeywords,
      summary: processedText.substring(0, 200) + (processedText.length > 200 ? '...' : ''),
    };

    // 元ファイルの保存（オプション：ユーザーが選択した場合のみ）
    // metadata.jsonに元のファイル名は保存されているため、RAGとしては必須ではない
    if (saveOriginalFile) {
      const destFilePath = path.join(docDir, safeFileName);
      try {
        fs.copyFileSync(tempPath, destFilePath);
        console.log(`📄 元ファイルを保存: ${safeFileName}`);
        metadata.originalFileSaved = true;
        metadata.originalFilePath = safeFileName;
      } catch (fileError) {
        // ファイル保存に失敗しても、チャンク処理は完了しているため続行
        console.warn(`⚠️ 元ファイルの保存に失敗（処理は継続）: ${fileError.message}`);
        // メタデータに保存失敗を記録
        metadata.originalFileSaveError = fileError.message;
      }
    } else {
      console.log('📄 元ファイルの保存をスキップ（ユーザー選択）');
      metadata.originalFileSaved = false;
    }

    // チャンクデータを保存
    const chunksPath = path.join(docDir, 'chunks.json');
    fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2), 'utf8');

    // メタデータを保存
    const metadataPath = path.join(docDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    // 一時ファイルを削除
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.warn('一時ファイルの削除に失敗:', error);
    }

    console.log(`✅ ファイルインポート完了: ${originalname} -> ${docId} (${chunks.length}チャンク)`);

    res.json({
      success: true,
      message: 'ファイルが正常にインポートされました',
      fileName: originalname,
      documentId: docId,
      savedPath: `documents/${docId}`,
      chunkCount: chunks.length,
      processedEntries: 1,
    });
  } catch (error) {
    console.error('❌ ファイルインポートエラー:', error);

    // 一時ファイルのクリーンアップ
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('一時ファイルのクリーンアップに失敗:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'ファイルのインポートに失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー',
    });
  }
});

// GPT APIエンドポイント
apiRouter.post('/chatgpt', async (req, res) => {
  try {
    const { text, useOnlyKnowledgeBase = false, conversationHistory = [] } = req.body;

    console.log('[api/chatgpt] GPT request:', {
      text: text?.substring(0, 100) + '...',
      useOnlyKnowledgeBase,
      conversationHistoryLength: conversationHistory.length,
      openaiAvailable: !!openai
    });

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    if (!openai) {
      return res.json({
        success: false,
        response: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
        message: 'GPT機能を利用するにはOpenAI APIキーの設定が必要です',
        details: {
          environment: 'development',
          apiKeyConfigured: false,
          fallbackMode: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // OpenAI APIを使用した実際の処理
    try {
      // processOpenAIRequestを使用してknowledge-baseからデータを取得
      // 本番環境（node）と開発環境（tsx）の両方に対応
      let processOpenAIRequest;
      try {
        // CommonJSファイルを読み込む
        const openaiCjsPath = path.join(__dirname, 'lib', 'openai.cjs');

        if (fs.existsSync(openaiCjsPath)) {
          console.log('[api/chatgpt] 📁 openai.cjsファイルを検出:', openaiCjsPath);

          // CommonJS形式で動的import
          try {
            const fileUrl = pathToFileURL(openaiCjsPath).href;
            const module = await import(fileUrl);
            console.log('[api/chatgpt] 📦 モジュール読み込み成功');
            console.log('[api/chatgpt] 🔍 モジュールキー:', Object.keys(module));


            // ES Modules形式のエクスポートを取得
            if (module.processOpenAIRequest) {
              processOpenAIRequest = module.processOpenAIRequest;
              console.log('[api/chatgpt] ✅ processOpenAIRequestを直接取得');
            } else if (module.default && typeof module.default === 'object') {
              processOpenAIRequest = module.default.processOpenAIRequest;
              console.log('[api/chatgpt] ✅ processOpenAIRequestをdefaultから取得');
            } else {
              throw new Error('processOpenAIRequest関数が見つかりません');
            }

            if (!processOpenAIRequest) {
              throw new Error('processOpenAIRequest関数がundefinedです');
            }

            console.log('[api/chatgpt] ✅ openai.cjs を読み込みました');
          } catch (importError) {
            console.error('[api/chatgpt] ❌ import失敗:', importError);
            throw new Error(`openai.cjs の読み込みに失敗: ${importError.message}`);
          }
        } else {
          throw new Error(`openai.cjs が見つかりません: ${openaiCjsPath}`);
        }
      } catch (importError) {
        console.error('[api/chatgpt] ❌ OpenAIモジュール読み込みエラー:', importError);
        console.error('[api/chatgpt] エラー詳細:', {
          message: importError instanceof Error ? importError.message : String(importError),
          stack: importError instanceof Error ? importError.stack : undefined
        });
        throw new Error(`OpenAI module could not be loaded: ${importError instanceof Error ? importError.message : String(importError)}`);
      }      // knowledge-baseからのデータのみを使用（useOnlyKnowledgeBaseがtrueの場合）
      const useKnowledgeBase = useOnlyKnowledgeBase !== false; // デフォルトはtrue

      // AI支援カスタマイズ設定を読み込む
      let aiAssistSettings = null;
      try {
        // クライアントから送信された設定を使用（リクエストボディに含まれている場合）
        if (req.body.aiAssistSettings) {
          aiAssistSettings = req.body.aiAssistSettings;
        } else {
          // サーバー側の設定ファイルから読み込む
          const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
          if (fs.existsSync(AI_ASSIST_SETTINGS_FILE)) {
            const settingsData = fs.readFileSync(AI_ASSIST_SETTINGS_FILE, 'utf-8');
            aiAssistSettings = JSON.parse(settingsData);
            console.log('✅ AI支援設定をサーバーから読み込みました');
          } else {
            // デフォルト設定を使用
            aiAssistSettings = {
              responsePattern: 'step_by_step',
              customInstructions: '',
              conversationStyle: 'frank',
              questionFlow: {
                step1: '具体的な症状を教えてください',
                step2: 'いつ頃から発生していますか？',
                step3: '作業環境や状況を教えてください',
                step4: '他に気になることはありますか？',
                step5: '緊急度を教えてください'
              },
            };
          }
        }
      } catch (error) {
        console.warn('AI支援設定の読み込みに失敗しました。デフォルト値を使用します:', error);
        aiAssistSettings = {
          responsePattern: 'step_by_step',
          customInstructions: '',
          conversationStyle: 'frank',
          questionFlow: {
            step1: '具体的な症状を教えてください',
            step2: 'いつ頃から発生していますか？',
            step3: '作業環境や状況を教えてください',
            step4: '他に気になることはありますか？',
            step5: '緊急度を教えてください'
          },
        };
      }

      // 会話スタイルに応じたシステムプロンプトの調整
      let styleInstruction = '';
      if (aiAssistSettings.conversationStyle === 'business') {
        styleInstruction = '丁寧で正式なビジネス用語を使用してください。';
      } else if (aiAssistSettings.conversationStyle === 'technical') {
        styleInstruction = '専門用語を中心に、技術的な説明を重視してください。';
      } else {
        styleInstruction = '親しみやすく、フランクな口調で話してください。';
      }

      // 1問1答形式で端的な応答を生成するためのシステムプロンプト調整
      let prompt = text;

      // カスタム指示を追加
      let customInstructionText = '';
      if (aiAssistSettings.customInstructions) {
        customInstructionText = `\n\n【追加指示】\n${aiAssistSettings.customInstructions}`;
      }

      // 応答パターンに応じた指示を追加
      let responsePatternInstruction = '';
      if (aiAssistSettings.responsePattern === 'minimal') {
        responsePatternInstruction = '要点のみ簡潔に回答してください。';
      } else if (aiAssistSettings.responsePattern === 'comprehensive') {
        responsePatternInstruction = '包括的に複数の対策をまとめて表示してください。';
      } else {
        // 段階的表示：質問フロー設定を活用
        if (aiAssistSettings.questionFlow) {
          const questionFlowGuide = Object.values(aiAssistSettings.questionFlow)
            .filter(q => q && q.trim())
            .map((q, idx) => `ステップ${idx + 1}: ${q}`)
            .join('\n');
          responsePatternInstruction = `端的に1問1答形式で回答してください。必要に応じて、以下の質問フローを参考に、ユーザーから追加情報を確認する質問を1つだけしてください。\n\n【推奨質問フロー】\n${questionFlowGuide}`;
        } else {
          responsePatternInstruction = '端的に1問1答形式で回答してください。必要に応じて、ユーザーから追加情報を確認する質問を1つだけしてください。';
        }
      }

      // 会話履歴がある場合は、1問1答形式を維持するように指示を追加
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-4).map(msg => ({
          role: msg.isAiResponse ? 'assistant' : 'user',
          content: msg.content
        }));

        // 会話履歴を考慮したプロンプト構築
        prompt = `【会話の流れ】
${recentHistory.map(msg => `${msg.role === 'assistant' ? 'AI' : 'ユーザー'}: ${msg.content}`).join('\n')}

【現在の質問】
${text}

上記の会話を踏まえ、knowledge-baseの情報のみを基に、${styleInstruction}${responsePatternInstruction}${customInstructionText}`;
      } else {
        // 初回の質問の場合
        prompt = `${text}\n\nknowledge-baseの情報のみを基に、${styleInstruction}${responsePatternInstruction}${customInstructionText}`;
      }

      const response = await processOpenAIRequest(prompt, useKnowledgeBase);

      res.json({
        success: true,
        response: response,
        message: 'GPT応答を生成しました',
        details: {
          inputText: text || 'no text provided',
          useOnlyKnowledgeBase: useKnowledgeBase,
          environment: 'development',
          model: 'gpt-4o'
        },
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.error('[api/chatgpt] OpenAI API error:', apiError);
      console.error('[api/chatgpt] Error stack:', apiError instanceof Error ? apiError.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        response: 'AI支援機能は現在利用できません。しばらくしてから再度お試しください。',
        message: 'OpenAI APIの呼び出しに失敗しました',
        details: {
          environment: 'development',
          error: apiError instanceof Error ? apiError.message : String(apiError),
          stack: isDevelopment && apiError instanceof Error ? apiError.stack : undefined
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[api/chatgpt] Error:', error);
    console.error('[api/chatgpt] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: error instanceof Error ? error.message : String(error),
      details: {
        stack: isDevelopment && error instanceof Error ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 診断用エンドポイントをマウント
import('./routes/_diag.js').then(module => {
  module.default(app);
  console.log('✅ Diagnostic routes mounted');
}).catch(err => {
  console.error('❌ Failed to load diagnostic routes:', err);
});

// データベース接続診断エンドポイント（APIルーターの前に追加）
app.get('/api/debug/database', async (req, res) => {
  try {
    const debugInfo = {
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      databaseUrlMasked: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
        : null,
      dbPoolInitialized: !!dbPool,
      connectionTest: null,
      timestamp: new Date().toISOString()
    };

    if (dbPool) {
      try {
        const connectionTest = await testDatabaseConnection();
        debugInfo.connectionTest = connectionTest;
      } catch (error) {
        debugInfo.connectionTest = {
          connected: false,
          error: error.message || String(error),
          errorCode: error.code || 'UNKNOWN'
        };
      }
    }

    res.json({
      success: true,
      debug: debugInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '診断エンドポイントエラー',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// APIルーターをマウント（すべてのエンドポイント定義の後）
app.use('/api', apiRouter);

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 Emergency Assistance Unified Server running on port ${PORT}`);
  console.log(`📊 Environment: ${env}`);

  if (isDevelopment) {
    console.log(`🌐 Frontend: http://localhost:${PORT} (proxied to Vite on port ${CLIENT_PORT})`);
    console.log(`🔥 Hot reload: Enabled`);
    console.log(`📁 Source files: Direct from client/src (no build required)`);
  } else {
    const publicDir = path.join(__dirname, 'public');
    const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
    const staticDir = fs.existsSync(publicDir) ? 'public' : (fs.existsSync(clientDistDir) ? 'client/dist' : 'none');
    console.log(`🌐 Frontend: http://localhost:${PORT} (static files from ${staticDir})`);
    console.log(`📦 Production mode: Static files only`);
  }

  console.log(`🔗 API: http://localhost:${PORT}/api`);

  // 自動スケジュールを開始
  setupAutoSchedules();
});

// ポート使用中のエラーハンドリング（開発環境のみ）
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (isDevelopment) {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
      console.error(`💡 Solutions:`);
      console.error(`   1. Stop the process using port ${PORT}:`);
      console.error(`      Windows: netstat -ano | findstr :${PORT}`);
      console.error(`      Then: taskkill /PID <PID> /F`);
      console.error(`   2. Use a different port:`);
      console.error(`      PORT=8081 node server/unified-hot-reload-server.js`);
      console.error(`   3. Or set PORT environment variable:`);
      console.error(`      $env:PORT=8081; node server/unified-hot-reload-server.js\n`);
    } else {
      // 本番環境ではエラーをそのまま投げる
      throw err;
    }
    process.exit(1);
  } else {
    // その他のエラーはそのまま投げる
    throw err;
  }
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  if (viteServer) {
    viteServer.kill();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  if (viteServer) {
    viteServer.kill();
  }
  process.exit(0);
});
