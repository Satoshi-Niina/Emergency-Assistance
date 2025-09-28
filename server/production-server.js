#!/usr/bin/env node

// Production-ready server for Azure App Service
// SWA + App Service cross-origin authentication support
// Updated: 2024-12-19

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import registerRoutes from './routes/index.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ESM-safe require for CJS-only dependencies
const require = createRequire(import.meta.url);

// Environment validation
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required');
  process.exit(1);
}

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Create uploads directory if needed
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// ① ヘルスチェックエンドポイント（CORSより前で定義）
const healthCheck = async (req, res) => {
  try {
    console.log('🏥 Health check request:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // データベース接続チェック
    let dbStatus = 'not_initialized';
    if (dbPool) {
      try {
        await dbPool.query('SELECT NOW()');
        dbStatus = 'connected';
      } catch (dbError) {
        console.warn('Database connection test failed:', dbError.message);
        dbStatus = 'error';
      }
    }
    
    res.status(200).json({ 
      ok: true, 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      service: 'Emergency Assistance Backend'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(200).json({ 
      ok: false, 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance Backend'
    });
  }
};

// Ping endpoint (always returns 200)
const pingCheck = (req, res) => {
  try {
    console.log('🏓 Ping request:', {
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      ping: 'pong',
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance Backend'
    });
  } catch (error) {
    console.error('❌ Ping check failed:', error);
    res.status(200).json({
      ping: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Register health check endpoints
app.get('/api/health', healthCheck);
app.get('/api/healthz', healthCheck);
app.get('/health', healthCheck);
app.get('/healthz', healthCheck);
app.get('/ping', pingCheck);

// ② CORS：Originなしは許可、未許可は "false" を返す（throw しない）
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const ALLOW = new Set([
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
]);
const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    console.log('🔍 CORS Origin check:', { origin, allowed: ALLOW.has(origin) });
    // 開発環境では localhost をすべて許可
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    if (ALLOW.has(origin)) return cb(null, true);
    console.log('❌ CORS Origin rejected:', origin);
    return cb(null, false);
  },
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));           // ③ Preflight も同方針

// Request logging
app.use(morgan('combined', {
  skip: (req, res) => req.url === '/api/health'
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Session configuration for cross-origin
const isDevelopment = process.env.NODE_ENV === 'development';
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: !isDevelopment, // HTTPS only in production
    sameSite: isDevelopment ? 'lax' : 'none', // Cross-origin support in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: undefined // Let browser handle domain
  },
  name: 'sid',
  proxy: true // Trust proxy for Azure App Service
}));

// Request ID middleware for error tracking
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// PostgreSQL pool initialization

// データベース接続プールの初期化
let dbPool = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  try {
    // 開発環境ではSSLを無効にする
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslConfig = isDevelopment ? false : { 
      require: true, 
      rejectUnauthorized: false 
    };
    
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    console.log('✅ Database pool initialized');
    
    // 接続テスト（復活、エラーでもサーバーを停止しない）
    dbPool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.warn('⚠️ Database connection test failed:', err.message);
        console.warn('⚠️ Server will continue running without database connection');
      } else {
        console.log('✅ Database connection test successful:', result.rows[0]);
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.warn('⚠️ Server will continue running without database connection');
    // process.exit(1); // データベースエラーでもサーバーを停止しない
  }
}

// データベース接続を初期化
initializeDatabase();

// データベース接続をリクエストに追加
app.use((req, res, next) => {
  req.db = dbPool;
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    // Check Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { 
          id: payload.userId, 
          username: payload.username,
          authMethod: 'jwt'
        };
        return next();
      } catch (jwtError) {
        console.warn(`[${req.requestId}] JWT verification failed:`, jwtError.message);
        // Fall through to session check
      }
    }

    // Check session
    if (req.session && req.session.userId) {
      req.user = { 
        id: req.session.userId, 
        username: req.session.username,
        authMethod: 'session'
      };
      return next();
    }

    // No valid authentication
    return res.status(401).json({
      success: false,
      error: 'authentication_required',
      message: '認証が必要です',
      requestId: req.requestId
    });

  } catch (error) {
    console.error(`[${req.requestId}] Authentication error:`, error);
    return res.status(500).json({
      success: false,
      error: 'authentication_error',
      message: '認証処理でエラーが発生しました',
      requestId: req.requestId
    });
  }
};

// API Routes
const router = express.Router();

// Health check - no external dependencies (moved to top level)

// Handshake endpoint
router.get('/auth/handshake', (req, res) => {
  try {
    res.json({
      ok: true,
      mode: 'session', // Default to session mode for cross-origin
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    console.error(`[${req.requestId}] Handshake error:`, error);
    res.status(200).json({
      ok: true,
      mode: 'session',
      env: 'production',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
});

// Auth routes will be mounted by routes/index.js

// 追加のAPIエンドポイントを直接登録（本番環境に影響しない）
const apiRouter = express.Router();

// Ping endpoint
apiRouter.get('/ping', (req, res) => {
  try {
    console.log('🏓 /api/ping 呼び出し');
    res.json({
      ping: 'pong',
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance Backend'
    });
  } catch (error) {
    console.error('❌ /api/ping エラー:', error);
    res.status(200).json({
      ping: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Storage endpoints
apiRouter.get('/storage/list', async (req, res) => {
  try {
    const prefix = req.query.prefix;
    if (!prefix) {
      return res.status(400).json({
        error: 'prefix parameter is required'
      });
    }

    console.log('🔍 Storage list request:', { prefix });

    // Azure Storage not configured, return empty list
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      console.warn('⚠️ Azure Storage not configured, returning empty list');
      return res.json([]);
    }

    // For now, return empty array since Azure Storage is not configured in dev
    res.json([]);
  } catch (error) {
    console.error('❌ Storage list error:', error);
    res.status(500).json({
      error: 'storage_list_error',
      message: error.message
    });
  }
});

// Image SAS URL endpoint
apiRouter.get('/storage/image-url', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({
        error: 'name parameter is required'
      });
    }

    console.log('🖼️ Image SAS request:', { name });

    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({
        error: 'Azure Storage not configured'
      });
    }

    // For development, return a placeholder URL
    res.json({
      url: `http://localhost:8000/placeholder-image/${name}`
    });
  } catch (error) {
    console.error('❌ Image SAS error:', error);
    res.status(500).json({
      error: 'image_sas_error',
      message: error.message
    });
  }
});

// ユーザー管理API
apiRouter.get('/users', async (req, res) => {
  try {
    console.log('[api/users] ユーザー一覧取得リクエスト');
    
    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, username, display_name, role, department, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    await client.release();
    await pool.end();

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
apiRouter.get('/machines/machine-types', async (req, res) => {
  try {
    console.log('[api/machines] 機種一覧取得リクエスト');
    
    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, machine_type_name
      FROM machine_types
      ORDER BY machine_type_name
    `);
    await client.release();
    await pool.end();

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
apiRouter.get('/machines/machines', async (req, res) => {
  try {
    const { type_id } = req.query;
    console.log('[api/machines] 機械番号一覧取得リクエスト:', { type_id });
    
    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    let query = 'SELECT id, machine_number FROM machines';
    let params = [];
    
    if (type_id) {
      query += ' WHERE machine_type_id = $1';
      params.push(type_id);
    }
    
    query += ' ORDER BY machine_number';
    
    const result = await client.query(query, params);
    await client.release();
    await pool.end();

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

// 全機械データ取得API（機種・機械番号の組み合わせ）
apiRouter.get('/machines/all-machines', async (req, res) => {
  try {
    console.log('[api/all-machines] 全機械データ取得リクエスト');
    
    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        mt.id as type_id,
        mt.machine_type_name,
        m.id as machine_id,
        m.machine_number
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    await client.release();
    await pool.end();

    // データを整形
    const groupedData = {};
    result.rows.forEach(row => {
      if (!groupedData[row.type_id]) {
        groupedData[row.type_id] = {
          type_id: row.type_id,
          machine_type_name: row.machine_type_name,
          machines: []
        };
      }
      
      if (row.machine_id) {
        groupedData[row.type_id].machines.push({
          id: row.machine_id,
          machine_number: row.machine_number
        });
      }
    });

    const data = Object.values(groupedData);
    console.log('[api/all-machines] 全機械データ取得成功:', data.length + '機種');

    res.json({
      success: true,
      data: data,
      total: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/all-machines] 全機械データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '全機械データの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ファイル一覧API（knowledge-base用）
apiRouter.get('/blob/list', async (req, res) => {
  try {
    console.log('[api/blob] ファイル一覧取得リクエスト');
    
    // ローカル開発環境では空の配列を返す
    res.json({
      success: true,
      data: [],
      message: 'ローカル開発環境ではファイル一覧は空です',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/blob] ファイル一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ファイル一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// トラブルシューティングAPI
apiRouter.get('/troubleshooting/list', async (req, res) => {
  try {
    console.log('[api/troubleshooting] トラブルシューティング一覧取得リクエスト');

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // ローカル開発環境ではtroubleshootingディレクトリからファイルを読み込み
      // fs and path are already imported at the top
      
      const troubleshootingPath = path.join(__dirname, '..', 'knowledge-base', 'troubleshooting');
      let files = [];
      
      try {
        if (fs.existsSync(troubleshootingPath)) {
          const troubleshootingFiles = fs.readdirSync(troubleshootingPath);
          troubleshootingFiles.forEach(file => {
            if (file.endsWith('.json') && !file.includes('.backup')) {
              try {
                const filePath = path.join(troubleshootingPath, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                files.push({
                  id: file.replace('.json', ''),
                  name: content.title || file.replace('.json', ''),
                  type: 'troubleshooting',
                  path: `troubleshooting/${file}`,
                  metadata: content
                });
              } catch (error) {
                console.warn(`[api/troubleshooting] ファイル読み込みエラー ${file}:`, error.message);
              }
            }
          });
        }
        
        console.log('[api/troubleshooting] ローカルファイル取得成功:', files.length + '件');
        
        res.json({
          success: true,
          data: files,
          total: files.length,
          message: 'ローカル開発環境からトラブルシューティングファイルを取得しました',
          timestamp: new Date().toISOString()
        });
      } catch (fileError) {
        console.error('[api/troubleshooting] ローカルファイル読み込みエラー:', fileError);
        res.json({
          success: true,
          data: [],
          message: 'ローカルファイルの読み込みに失敗しました',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 本番環境ではAzure Blob Storageから取得
      res.json({
        success: true,
        data: [],
        message: '本番環境のトラブルシューティング取得機能は実装中です',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/troubleshooting] トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'トラブルシューティング一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 個別トラブルシューティングファイル取得API
apiRouter.get('/troubleshooting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[api/troubleshooting] 個別ファイル取得リクエスト:', id);

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // ローカル開発環境ではtroubleshootingディレクトリからファイルを読み込み
      // fs and path are already imported at the top
      
      const troubleshootingPath = path.join(__dirname, '..', 'knowledge-base', 'troubleshooting');
      const filePath = path.join(troubleshootingPath, `${id}.json`);
      
      try {
        if (fs.existsSync(filePath)) {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log('[api/troubleshooting] 個別ファイル取得成功:', id);
          
          res.json({
            success: true,
            data: content,
            id: id,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('[api/troubleshooting] ファイルが見つかりません:', filePath);
          res.status(404).json({
            success: false,
            error: 'ファイルが見つかりません',
            id: id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (fileError) {
        console.error('[api/troubleshooting] ファイル読み込みエラー:', fileError);
        res.status(500).json({
          success: false,
          error: 'ファイルの読み込みに失敗しました',
          details: fileError.message,
          id: id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 本番環境ではAzure Blob Storageから取得
      res.status(404).json({
        success: false,
        error: '本番環境の個別ファイル取得機能は実装中です',
        id: id,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/troubleshooting] 個別ファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '個別ファイルの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴API
apiRouter.get('/history/machine-data', async (req, res) => {
  try {
    console.log('[api/history] 機種・機械番号データ取得リクエスト');
    
    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
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
    await pool.end();

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

    console.log('[api/history] 機種・機械番号データ取得成功:', {
      machineTypes: machineTypes.length,
      machines: machines.length
    });

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

// ナレッジベースAPI
apiRouter.get('/knowledge-base', async (req, res) => {
  try {
    console.log('[api/knowledge-base] ナレッジベース取得リクエスト');

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // ローカル開発環境ではknowledge-baseディレクトリからファイルを読み込み
      // fs and path are already imported at the top
      
      const knowledgeBasePath = path.join(__dirname, '..', 'knowledge-base');
      const documentsPath = path.join(knowledgeBasePath, 'documents');
      const troubleshootingPath = path.join(knowledgeBasePath, 'troubleshooting');
      
      let files = [];
      
      try {
        // documentsディレクトリからファイルを取得
        if (fs.existsSync(documentsPath)) {
          const docDirs = fs.readdirSync(documentsPath);
          docDirs.forEach(dir => {
            const dirPath = path.join(documentsPath, dir);
            if (fs.statSync(dirPath).isDirectory()) {
              const chunksPath = path.join(dirPath, 'chunks.json');
              const metadataPath = path.join(dirPath, 'metadata.json');
              
              if (fs.existsSync(chunksPath) && fs.existsSync(metadataPath)) {
                try {
                  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                  files.push({
                    id: dir,
                    name: metadata.title || dir,
                    type: 'document',
                    path: `documents/${dir}`,
                    metadata: metadata
                  });
                } catch (error) {
                  console.warn(`[api/knowledge-base] メタデータ読み込みエラー ${dir}:`, error.message);
                }
              }
            }
          });
        }
        
        // troubleshootingディレクトリからファイルを取得
        if (fs.existsSync(troubleshootingPath)) {
          const troubleshootingFiles = fs.readdirSync(troubleshootingPath);
          troubleshootingFiles.forEach(file => {
            if (file.endsWith('.json') && !file.includes('.backup')) {
              try {
                const filePath = path.join(troubleshootingPath, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                files.push({
                  id: file.replace('.json', ''),
                  name: content.title || file.replace('.json', ''),
                  type: 'troubleshooting',
                  path: `troubleshooting/${file}`,
                  metadata: content
                });
              } catch (error) {
                console.warn(`[api/knowledge-base] トラブルシューティングファイル読み込みエラー ${file}:`, error.message);
              }
            }
          });
        }
        
        console.log('[api/knowledge-base] ローカルファイル取得成功:', files.length + '件');
        
        res.json({
          success: true,
          data: files,
          total: files.length,
          message: 'ローカル開発環境からナレッジベースファイルを取得しました',
          timestamp: new Date().toISOString()
        });
      } catch (fileError) {
        console.error('[api/knowledge-base] ローカルファイル読み込みエラー:', fileError);
        res.json({
          success: true,
          data: [],
          message: 'ローカルファイルの読み込みに失敗しました',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 本番環境ではAzure Blob Storageから取得
      // TODO: Azure Blob Storageの実装
      res.json({
        success: true,
        data: [],
        message: '本番環境のナレッジベース取得機能は実装中です',
        timestamp: new Date().toISOString()
      });
    }
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

// 応急処置フローAPI
apiRouter.get('/emergency-flows', async (req, res) => {
  try {
    console.log('[api/emergency-flows] 応急処置フロー取得リクエスト');
    
    // 本番環境ではAzure Blob Storageから取得、ローカル開発では空の配列を返す
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      res.json({
        success: true,
        data: [],
        message: 'ローカル開発環境では応急処置フローは空です',
        timestamp: new Date().toISOString()
      });
    } else {
      // 本番環境ではAzure Blob Storageから取得
      // TODO: Azure Blob Storageの実装
      res.json({
        success: true,
        data: [],
        message: '本番環境の応急処置フロー取得機能は実装中です',
        timestamp: new Date().toISOString()
      });
    }
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

// チャット履歴保存API
apiRouter.post('/chat-history', async (req, res) => {
  try {
    console.log('[api/chat-history] チャット履歴保存リクエスト');

    const { messages, chatId, machineType, machineNumber } = req.body;

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // ローカル開発環境ではknowledge-base/exportsディレクトリに保存
      // fs and path are already imported at the top
      
      try {
        const exportsPath = path.join(__dirname, '..', 'knowledge-base', 'exports');
        
        // exportsディレクトリが存在しない場合は作成
        if (!fs.existsSync(exportsPath)) {
          fs.mkdirSync(exportsPath, { recursive: true });
        }

        // チャット履歴データを準備
        const chatData = {
          id: chatId || crypto.randomUUID(),
          title: `${machineType || '不明'} - ${machineNumber || '不明'} - チャット履歴`,
          machineType: machineType || '不明',
          machineNumber: machineNumber || '不明',
          createdAt: new Date().toISOString(),
          messages: messages || [],
          type: 'chat_history',
          summary: messages?.length > 0 ? messages[messages.length - 1]?.content?.substring(0, 100) + '...' : 'チャット履歴'
        };

        // ファイル名を生成
        const fileName = `${chatData.title}_${chatData.id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(exportsPath, fileName);

        // ファイルに保存
        fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), 'utf8');

        console.log('[api/chat-history] ローカル開発環境: チャット履歴をファイルに保存', {
          chatId: chatData.id,
          machineType,
          machineNumber,
          messageCount: messages?.length || 0,
          filePath: fileName
        });

        res.json({
          success: true,
          message: 'チャット履歴を正常に保存しました',
          chatId: chatData.id,
          fileName: fileName,
          timestamp: new Date().toISOString()
        });
      } catch (fileError) {
        console.error('[api/chat-history] ファイル保存エラー:', fileError);
        
        // ファイル保存に失敗した場合はログ出力のみ
        console.log('[api/chat-history] ファイル保存失敗: ログに出力', {
          chatId,
          machineType,
          machineNumber,
          messageCount: messages?.length || 0,
          error: fileError.message
        });

        res.json({
          success: true,
          message: 'チャット履歴をログに出力しました（ファイル保存に失敗）',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 本番環境ではAzure Blob Storageに保存
      // TODO: Azure Blob Storageの実装
      console.log('[api/chat-history] 本番環境: チャット履歴保存機能は実装中です');

      res.json({
        success: true,
        message: '本番環境のチャット履歴保存機能は実装中です',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/chat-history] チャット履歴保存エラー:', error);
    res.status(500).json({
      success: false,
      error: 'チャット履歴の保存に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 履歴データ取得API
apiRouter.get('/history', async (req, res) => {
  try {
    console.log('[api/history] 履歴データ取得リクエスト');

    const { limit = 50, offset = 0, machineType, machineNumber } = req.query;

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // ローカル開発環境ではknowledge-base/exportsディレクトリからファイルを読み込み
      // fs and path are already imported at the top
      
      const exportsPath = path.join(__dirname, '..', 'knowledge-base', 'exports');
      let files = [];
      
      try {
        if (fs.existsSync(exportsPath)) {
          const exportFiles = fs.readdirSync(exportsPath);
          exportFiles.forEach(file => {
            if (file.endsWith('.json')) {
              try {
                const filePath = path.join(exportsPath, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // ファイル名から情報を抽出
                const fileName = file.replace('.json', '');
                const parts = fileName.split('_');
                const title = parts[0] || fileName;
                const id = parts[1] || fileName;
                const date = parts[2] || new Date().toISOString();
                
                files.push({
                  id: id,
                  fileName: file,
                  title: title,
                  machineType: content.machineType || '不明',
                  machineNumber: content.machineNumber || '不明',
                  createdAt: date,
                  content: content,
                  path: `exports/${file}`,
                  conversationHistory: content.conversationHistory || []
                });
              } catch (error) {
                console.warn(`[api/history] エクスポートファイル読み込みエラー ${file}:`, error.message);
              }
            }
          });
        }
        
        // フィルタリング
        let filteredFiles = files;
        if (machineType) {
          filteredFiles = filteredFiles.filter(file => 
            file.machineType.toLowerCase().includes(machineType.toLowerCase())
          );
        }
        if (machineNumber) {
          filteredFiles = filteredFiles.filter(file => 
            file.machineNumber.toLowerCase().includes(machineNumber.toLowerCase())
          );
        }
        
        // ページネーション
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedFiles = filteredFiles.slice(startIndex, endIndex);
        
        console.log('[api/history] ローカルエクスポートファイル取得成功:', paginatedFiles.length + '件');
        
        res.json({
          success: true,
          data: paginatedFiles,
          total: filteredFiles.length,
          message: 'ローカル開発環境から履歴データを取得しました',
          timestamp: new Date().toISOString()
        });
      } catch (fileError) {
        console.error('[api/history] ローカルファイル読み込みエラー:', fileError);
        res.json({
          success: true,
          data: [],
          total: 0,
          message: 'ローカルファイルの読み込みに失敗しました',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 本番環境ではAzure Blob Storageから取得
      // TODO: Azure Blob Storageの実装
      res.json({
        success: true,
        data: [],
        total: 0,
        message: '本番環境の履歴データ取得機能は実装中です',
        timestamp: new Date().toISOString()
      });
    }
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

// データベース接続チェックAPI
apiRouter.get('/db-check', async (req, res) => {
  try {
    console.log('[api/db-check] データベース接続チェックリクエスト');

    // Pool is already imported at the top
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;

    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    await client.release();
    await pool.end();

    console.log('[api/db-check] データベース接続チェック成功');

    res.json({
      success: true,
      status: 'OK',
      connected: true,
      current_time: result.rows[0].current_time,
      version: result.rows[0].version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/db-check] データベース接続チェックエラー:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      connected: false,
      error: 'データベース接続に失敗しました',
      message: error.message,
      details: error.message,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
});

// GPT接続チェックAPI
apiRouter.post('/gpt-check', async (req, res) => {
  try {
    console.log('[api/gpt-check] GPT接続チェックリクエスト');

    // 実際のチャット機能と同じ方法でOpenAIクライアントの状態を確認
    const { getOpenAIClientStatus, processOpenAIRequest } = await import('./lib/openai.js');
    const clientStatus = getOpenAIClientStatus();
    
    console.log('[api/gpt-check] OpenAI Client Status:', clientStatus);

    const isDevelopment = process.env.NODE_ENV === 'development';

    // クライアントが存在しない場合
    if (!clientStatus.clientExists) {
      console.log('[api/gpt-check] OpenAIクライアントが初期化されていません');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAIクライアントが初期化されていません',
        message: 'OpenAI APIキーが設定されていないか、無効な形式です。設定画面でAPIキーを設定してください。',
        details: clientStatus,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // APIキーが存在しない場合
    if (!clientStatus.apiKeyExists) {
      console.log('[api/gpt-check] OpenAI APIキーが設定されていません');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーが設定されていません',
        message: 'OPENAI_API_KEY環境変数が設定されていません。設定画面でAPIキーを設定してください。',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // モックキーの場合
    if (clientStatus.isMockKey) {
      console.log('[api/gpt-check] OpenAI APIキーがモックキーです');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーがモックキーです',
        message: '開発用のモックキーが設定されています。実際のAPIキーを設定してください。',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // APIキーの形式が無効な場合
    if (!clientStatus.startsWithSk) {
      console.log('[api/gpt-check] OpenAI APIキーの形式が無効です');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーが無効です',
        message: `OpenAI APIキーの形式が正しくありません。現在の値: ${clientStatus.apiKeyPrefix} (sk-で始まる必要があります)`,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      console.log('[api/gpt-check] OpenAI API接続テスト開始');
      
      // 実際のチャット機能と同じ方法でAPI接続テスト
      const testResponse = await processOpenAIRequest('Hello', false);

      console.log('[api/gpt-check] OpenAI API接続テスト成功');

      res.json({
        success: true,
        status: 'OK',
        connected: true,
        message: 'GPT接続が正常です',
        testResponse: testResponse.substring(0, 100) + '...',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
    } catch (gptError) {
      console.error('[api/gpt-check] GPT接続テストエラー:', gptError);
      console.error('[api/gpt-check] エラー詳細:', {
        name: gptError.name,
        message: gptError.message,
        code: gptError.code,
        status: gptError.status
      });
      
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'GPT接続に失敗しました',
        message: gptError.message || 'OpenAI APIへの接続に失敗しました',
        details: gptError.code ? `エラーコード: ${gptError.code}` : undefined,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/gpt-check] GPT接続チェックエラー:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      connected: false,
      error: 'GPT接続チェックに失敗しました',
      message: error.message,
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GPT APIエンドポイント
apiRouter.post('/chatgpt', async (req, res) => {
  try {
    console.log('[api/chatgpt] GPT APIリクエスト');

    const { text, useOnlyKnowledgeBase = false } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'テキストが提供されていません',
        timestamp: new Date().toISOString()
      });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      // OpenAI APIキーが設定されている場合は実際のAPIを呼び出す
      console.log('[api/chatgpt] OpenAI APIを呼び出し');
      
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({
          apiKey: openaiApiKey,
        });

        // システムプロンプトを設定
        const systemPrompt = useOnlyKnowledgeBase 
          ? 'あなたは鉄道保守の専門家です。提供されたナレッジベースの情報のみを使用して、保守作業に関する質問に答えてください。'
          : 'あなたは鉄道保守の専門家です。保守作業に関する質問に対して、専門的で実用的なアドバイスを提供してください。';

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: text
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const response = completion.choices[0].message.content;

        console.log('[api/chatgpt] OpenAI API呼び出し成功');

        res.json({
          success: true,
          response: response,
          model: completion.model,
          usage: completion.usage,
          timestamp: new Date().toISOString()
        });
      } catch (openaiError) {
        console.error('[api/chatgpt] OpenAI APIエラー:', openaiError);
        
        // OpenAI APIエラーの場合は模擬レスポンスを返す
        console.log('[api/chatgpt] OpenAI APIエラー: 模擬レスポンスを生成');
        
        let response = '';
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('ブレーキ') || lowerText.includes('brake')) {
          response = 'ブレーキの問題ですね。以下の点を確認してください：\n\n1. ブレーキフルードの量を確認\n2. ブレーキパッドの摩耗状況をチェック\n3. ブレーキホースの損傷がないか確認\n4. ブレーキペダルの遊びを確認\n\n緊急時は安全な場所に停止し、専門業者に連絡してください。';
        } else if (lowerText.includes('エンジン') || lowerText.includes('engine')) {
          response = 'エンジンの問題ですね。以下の点を確認してください：\n\n1. エンジンオイルの量と状態を確認\n2. 冷却水の量を確認\n3. バッテリーの状態をチェック\n4. エアフィルターの汚れを確認\n\n異常音や煙が出ている場合は、すぐにエンジンを停止してください。';
        } else if (lowerText.includes('タイヤ') || lowerText.includes('tire')) {
          response = 'タイヤの問題ですね。以下の点を確認してください：\n\n1. タイヤの空気圧を確認\n2. タイヤの摩耗状況をチェック\n3. タイヤの損傷がないか確認\n4. タイヤのバランスを確認\n\n定期的な点検とメンテナンスが重要です。';
        } else {
          response = 'ご報告いただいた問題について、以下の一般的な点検項目を確認してください：\n\n1. 安全な場所に停止\n2. 警告灯の確認\n3. 異常音や振動の確認\n4. 液体の漏れがないか確認\n5. 専門業者への連絡\n\n詳細な症状を教えていただければ、より具体的なアドバイスができます。';
        }

        if (useOnlyKnowledgeBase) {
          response += '\n\n※ この回答はナレッジベースの情報に基づいています。';
        }

        res.json({
          success: true,
          response: response,
          model: 'fallback-local',
          usage: {
            prompt_tokens: text.length,
            completion_tokens: response.length,
            total_tokens: text.length + response.length
          },
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // OpenAI APIキーが設定されていない場合は模擬レスポンスを返す
      console.log('[api/chatgpt] OpenAI APIキー未設定: 模擬レスポンスを生成');
      
      let response = '';
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('ブレーキ') || lowerText.includes('brake')) {
        response = 'ブレーキの問題ですね。以下の点を確認してください：\n\n1. ブレーキフルードの量を確認\n2. ブレーキパッドの摩耗状況をチェック\n3. ブレーキホースの損傷がないか確認\n4. ブレーキペダルの遊びを確認\n\n緊急時は安全な場所に停止し、専門業者に連絡してください。';
      } else if (lowerText.includes('エンジン') || lowerText.includes('engine')) {
        response = 'エンジンの問題ですね。以下の点を確認してください：\n\n1. エンジンオイルの量と状態を確認\n2. 冷却水の量を確認\n3. バッテリーの状態をチェック\n4. エアフィルターの汚れを確認\n\n異常音や煙が出ている場合は、すぐにエンジンを停止してください。';
      } else if (lowerText.includes('タイヤ') || lowerText.includes('tire')) {
        response = 'タイヤの問題ですね。以下の点を確認してください：\n\n1. タイヤの空気圧を確認\n2. タイヤの摩耗状況をチェック\n3. タイヤの損傷がないか確認\n4. タイヤのバランスを確認\n\n定期的な点検とメンテナンスが重要です。';
      } else {
        response = 'ご報告いただいた問題について、以下の一般的な点検項目を確認してください：\n\n1. 安全な場所に停止\n2. 警告灯の確認\n3. 異常音や振動の確認\n4. 液体の漏れがないか確認\n5. 専門業者への連絡\n\n詳細な症状を教えていただければ、より具体的なアドバイスができます。';
      }

      if (useOnlyKnowledgeBase) {
        response += '\n\n※ この回答はナレッジベースの情報に基づいています。';
      }

      res.json({
        success: true,
        response: response,
        model: 'local-development',
        usage: {
          prompt_tokens: text.length,
          completion_tokens: response.length,
          total_tokens: text.length + response.length
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[api/chatgpt] GPT APIエラー:', error);
    res.status(500).json({
      success: false,
      error: 'GPT APIの呼び出しに失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// チャット送信API（テスト用・本番用）
// テスト用の認証なしチャット送信API（開発環境のみ）
app.post('/api/chats/:id/send-test', async (req, res) => {
  try {
    const chatId = req.params.id;
    const { chatData, exportType } = req.body;

    console.log('🔍 テスト用チャット送信リクエスト受信:', {
      chatId,
      exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo,
    });

    // チャットデータの検証
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat data format',
      });
    }

    // エクスポートデータの生成
    const exportData = {
      chatId: chatData.chatId,
      messages: chatData.messages,
      machineInfo: chatData.machineInfo,
      exportType: exportType || 'manual_send',
      exportedAt: new Date().toISOString(),
      exportedBy: 'system',
    };

    // ファイル名の生成
    const machineType = chatData.machineInfo?.machineTypeName || 'Unknown';
    const machineNumber = chatData.machineInfo?.machineNumber || 'Unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${machineType} - ${machineNumber} - チャット履歴_${chatId}_${timestamp}.json`;
    
    // ファイルパスの設定
    const filePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports', fileName);

    // ディレクトリの存在確認と作成
    const exportsDir = path.dirname(filePath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
    const jsonString = JSON.stringify(exportData, null, 2);
    try {
      // UTF-8 BOMなしで保存
      fs.writeFileSync(filePath, jsonString, 'utf8');
      console.log('チャットデータを保存しました:', filePath);
      console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
    } catch (writeError) {
      console.error('ファイル保存エラー:', writeError);
      throw writeError;
    }

    res.json({
      success: true,
      message: 'チャットデータが正常に保存されました',
      fileName: fileName,
      filePath: filePath,
      dataSize: Buffer.byteLength(jsonString, 'utf8'),
    });

  } catch (error) {
    console.error('チャット送信エラー:', error);
    res.status(500).json({
      success: false,
      message: 'チャットデータの保存に失敗しました',
      error: error.message,
    });
  }
});

// 本番用の認証付きチャット送信API
app.post('/api/chats/:id/send', async (req, res) => {
  try {
    const userId = req.session.userId;
    const chatId = req.params.id;
    const { chatData, exportType } = req.body;

    console.log('🔍 本番用チャット送信リクエスト受信:', {
      chatId,
      userId,
      exportType,
      messageCount: chatData?.messages?.length || 0,
      machineInfo: chatData?.machineInfo,
    });

    // チャットデータの検証
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat data format',
      });
    }

    // エクスポートデータの生成
    const exportData = {
      chatId: chatData.chatId,
      messages: chatData.messages,
      machineInfo: chatData.machineInfo,
      exportType: exportType || 'manual_send',
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
    };

    // ファイル名の生成
    const machineType = chatData.machineInfo?.machineTypeName || 'Unknown';
    const machineNumber = chatData.machineInfo?.machineNumber || 'Unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${machineType} - ${machineNumber} - チャット履歴_${chatId}_${timestamp}.json`;
    
    // ファイルパスの設定
    const filePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports', fileName);

    // ディレクトリの存在確認と作成
    const exportsDir = path.dirname(filePath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // UTF-8エンコーディングでJSONファイルを保存（BOMなし）
    const jsonString = JSON.stringify(exportData, null, 2);
    try {
      // UTF-8 BOMなしで保存
      fs.writeFileSync(filePath, jsonString, 'utf8');
      console.log('チャットデータを保存しました:', filePath);
      console.log('保存されたデータサイズ:', Buffer.byteLength(jsonString, 'utf8'), 'bytes');
    } catch (writeError) {
      console.error('ファイル保存エラー:', writeError);
      throw writeError;
    }

    res.json({
      success: true,
      message: 'チャットデータが正常に保存されました',
      fileName: fileName,
      filePath: filePath,
      dataSize: Buffer.byteLength(jsonString, 'utf8'),
    });

  } catch (error) {
    console.error('チャット送信エラー:', error);
    res.status(500).json({
      success: false,
      message: 'チャットデータの保存に失敗しました',
      error: error.message,
    });
  }
});

// 画像表示API
app.get('/api/troubleshooting/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    console.log('🖼️ 画像リクエスト:', filename);
    
    // 画像ファイルのパスを構築
    const imagePath = path.join(process.cwd(), '..', 'knowledge-base', 'images', filename);
    
    // ファイルの存在確認
    if (!fs.existsSync(imagePath)) {
      console.log('❌ 画像ファイルが見つかりません:', imagePath);
      return res.status(404).json({
        success: false,
        message: '画像ファイルが見つかりません',
        filename: filename,
        path: imagePath
      });
    }
    
    // ファイルのMIMEタイプを判定
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
    }
    
    console.log('✅ 画像ファイル送信:', { filename, mimeType, path: imagePath });
    
    // 画像ファイルを送信
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
    res.sendFile(imagePath);
    
  } catch (error) {
    console.error('❌ 画像送信エラー:', error);
    res.status(500).json({
      success: false,
      message: '画像の送信に失敗しました',
      error: error.message
    });
  }
});

// 診断用エンドポイント
apiRouter.get('/_diag/routes', (req, res) => {
  var router = app && app._router ? app._router : null;
  var stack = router && Array.isArray(router.stack) ? router.stack : [];
  var paths = [];
  for (var i = 0; i < stack.length; i++) {
    var r = stack[i];
    if (r && r.route && r.route.path) paths.push(r.route.path);
  }
  res.json({ count: paths.length, paths: paths });
});

apiRouter.get('/_diag/env', (req, res) => {
  function mark(k){ return process.env[k] ? 'SET' : 'UNSET'; }
  res.json({
    STORAGE_BASE_PREFIX: process.env.STORAGE_BASE_PREFIX || '(empty)',
    AZURE_STORAGE_CONNECTION_STRING: mark('AZURE_STORAGE_CONNECTION_STRING'),
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || '(empty)',
    FRONTEND_URL: process.env.FRONTEND_URL || '(empty)',
    NODE_ENV: process.env.NODE_ENV || '(empty)'
  });
});

apiRouter.get('/version', (req, res) => {
  res.json({
    version: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '(unknown)',
    builtAt: process.env.BUILT_AT || new Date().toISOString()
  });
});

// APIルーターを登録
app.use('/api', apiRouter);

// 新しいルートシステムを登録（ESM対応）
registerRoutes(app);
console.log('[BOOT] routes mounted');

// Global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || crypto.randomUUID();
  
  console.error(`[${requestId}] Unhandled error:`, err);
  console.error(`[${requestId}] Stack trace:`, err.stack);
  console.error(`[${requestId}] Request details:`, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  res.status(500).json({
    success: false,
    error: 'internal_error',
    message: 'サーバー内部エラーが発生しました',
    requestId: requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: 'リソースが見つかりません',
    path: req.originalUrl,
    requestId: req.requestId
  });
});

// Start server
const PORT = Number(process.env.PORT?.trim() || '8000');
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check endpoints:`);
  console.log(`   - http://${HOST}:${PORT}/api/health`);
  console.log(`   - http://${HOST}:${PORT}/api/healthz`);
  console.log(`   - http://${HOST}:${PORT}/ping`);
  console.log(`🔐 Login API: http://${HOST}:${PORT}/api/auth/login`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Database URL configured: ${process.env.DATABASE_URL ? 'YES' : 'NO'}`);
  console.log(`🔑 JWT Secret configured: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
  console.log(`🍪 Session Secret configured: ${process.env.SESSION_SECRET ? 'YES' : 'NO'}`);
  console.log(`🤖 OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`📄 Main file: ${__filename}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  
  // 起動後のヘルスチェックテスト（復活）
  setTimeout(async () => {
    console.log('🔍 Testing health endpoints...');
    const testEndpoints = ['/api/health', '/api/healthz', '/ping'];
    const http = await import('http');
    
    for (const endpoint of testEndpoints) {
      const options = {
        hostname: HOST,
        port: PORT,
        path: endpoint,
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ ${endpoint}: ${res.statusCode} - ${jsonData.ok ? 'OK' : 'ERROR'}`);
          } catch (error) {
            console.log(`✅ ${endpoint}: ${res.statusCode} - Response received`);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ ${endpoint}: ${error.message}`);
      });
      
      req.on('timeout', () => {
        console.log(`⏰ ${endpoint}: Timeout`);
        req.destroy();
      });
      
      req.end();
    }
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});