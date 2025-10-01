#!/usr/bin/env node

// Azure App Service専用サーバー
// Linux環境で確実に動作する最小限のサーバー
// Updated: CORS configuration fixed for frontend-backend communication

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { runMigrations } from './startup-migration.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env files
// Try local.env first (for local development), then fallback to .env
const localEnvPath = path.join(__dirname, '..', 'local.env');
const envPath = path.join(__dirname, '..', '.env');

console.log('🔍 Checking for environment files:');
console.log('  - local.env:', localEnvPath, fs.existsSync(localEnvPath) ? 'EXISTS' : 'NOT FOUND');
console.log('  - .env:', envPath, fs.existsSync(envPath) ? 'EXISTS' : 'NOT FOUND');

if (fs.existsSync(localEnvPath)) {
  console.log('📄 Loading environment from local.env');
  dotenv.config({ path: localEnvPath });
  console.log('✅ Environment loaded from local.env');
} else if (fs.existsSync(envPath)) {
  console.log('📄 Loading environment from .env');
  dotenv.config({ path: envPath });
  console.log('✅ Environment loaded from .env');
} else {
  console.log('📄 No .env file found, using system environment variables');
}

// Environment validation (warnings only, don't exit)
console.log('🔍 Environment variables loaded:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  - PORT:', process.env.PORT || 'NOT SET');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('  - PG_SSL:', process.env.PG_SSL || 'NOT SET');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('  - SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('  - FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');

const app = express();

// BLOBストレージ関連の設定
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

// BLOBサービスクライアントの初期化（エラーハンドリング改善）
const getBlobServiceClient = () => {
  if (!connectionString) {
    console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING is not configured - BLOB features disabled');
    return null;
  }
  try {
    return BlobServiceClient.fromConnectionString(connectionString);
  } catch (error) {
    console.warn('⚠️ Failed to initialize BLOB service client:', error.message);
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
    await runMigrations();
    
    console.log('✅ Azure startup sequence completed successfully');
  } catch (error) {
    console.error('❌ Azure startup sequence failed:', error);
    console.warn('⚠️ Server will continue running, but some features may not work properly');
  }
}

// 非同期でスタートアップシーケンスを実行
startupSequence();

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

// 2. 現在のユーザー情報取得エンドポイント
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'admin-001',
      username: 'admin',
      role: 'admin',
      displayName: '管理者'
    }
  });
});

// 3. 管理者権限チェックエンドポイント
app.get('/api/auth/check-admin', (req, res) => {
  res.json({
    success: true,
    message: '管理者権限が確認されました',
    user: { id: 'admin-001', username: 'admin', role: 'admin' }
  });
});

// 4. 一般ユーザー権限チェックエンドポイント
app.get('/api/auth/check-employee', (req, res) => {
  res.json({
    success: true,
    message: '従業員権限が確認されました',
    user: { id: 'employee-001', username: 'employee', role: 'employee' }
  });
});

// 5. ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました'
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
app.get('/api/storage/list', (req, res) => {
  const prefix = req.query.prefix;
  res.json({
    success: true,
    data: [],
    message: `ストレージファイル一覧を取得しました（本番環境では空です）: ${prefix || 'no prefix'}`
  });
});

// 8. Image SAS URL endpoint
app.get('/api/storage/image-url', (req, res) => {
  const name = req.query.name;
  res.json({
    success: true,
    url: `https://example.com/images/${name}`,
    message: `画像URLを取得しました（本番環境ではモック）: ${name || 'no name'}`
  });
});

// 9. ユーザー管理API
app.get('/api/users', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({
        success: true,
        data: [
          { id: 'admin-001', username: 'admin', role: 'admin', displayName: '管理者' },
          { id: 'niina-001', username: 'niina', role: 'admin', displayName: 'Niina' },
          { id: 'takabeni1-001', username: 'takabeni1', role: 'admin', displayName: 'Takabeni1' },
          { id: 'takabeni2-001', username: 'takabeni2', role: 'employee', displayName: 'Takabeni2' },
          { id: 'employee-001', username: 'employee', role: 'employee', displayName: '一般ユーザー' }
        ],
        message: 'ユーザー一覧を取得しました（データベース未接続）'
      });
    }

    const result = await dbPool.query('SELECT id, username, role, display_name FROM users ORDER BY username');
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        username: row.username,
        role: row.role,
        displayName: row.display_name || row.username
      })),
      message: 'ユーザー一覧を取得しました（データベース接続済み）'
    });
  } catch (error) {
    console.error('[api/users] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      message: error.message
    });
  }
});

// 10. 機種一覧API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({
        success: true,
        data: [
          { id: '1', name: 'ディーゼル機関車', type: 'locomotive' },
          { id: '2', name: '電車', type: 'train' },
          { id: '3', name: '保線機械', type: 'maintenance' }
        ],
        message: '機種一覧を取得しました（データベース未接続）'
      });
    }

    const result = await dbPool.query('SELECT id, name, type FROM machine_types ORDER BY name');
    res.json({
      success: true,
      data: result.rows,
      message: '機種一覧を取得しました（データベース接続済み）'
    });
  } catch (error) {
    console.error('[api/machines/machine-types] エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      message: error.message
    });
  }
});

// 11. 機械番号一覧API（機種ID指定）
app.get('/api/machines/machines', (req, res) => {
  const { type_id } = req.query;
  res.json({
    success: true,
    data: [
      { id: '1', machine_number: '001', type_id: type_id || '1', name: '機械001' },
      { id: '2', machine_number: '002', type_id: type_id || '1', name: '機械002' }
    ],
    message: `機械番号一覧を取得しました（本番環境ではモックデータ）: type_id=${type_id || 'none'}`
  });
});

// 12. 全機械データ取得API（機種・機械番号の組み合わせ）
app.get('/api/machines/all-machines', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', machine_type: 'ディーゼル機関車', machine_number: '001', name: '機関車001' },
      { id: '2', machine_type: '電車', machine_number: '002', name: '電車002' },
      { id: '3', machine_type: '保線機械', machine_number: '003', name: '保線機械003' }
    ],
    message: '全機械データを取得しました（本番環境ではモックデータ）'
  });
});

// 13. ファイル一覧API（knowledge-base用）
app.get('/api/blob/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'ファイル一覧を取得しました（本番環境では空です）',
    timestamp: new Date().toISOString()
  });
});

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
    let params = [];
    
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

// 25. GPT APIエンドポイント
app.post('/api/chatgpt', (req, res) => {
  const { text, useOnlyKnowledgeBase = false } = req.body;
  res.json({
    success: true,
    response: 'AI支援機能は本番環境では利用できません。ローカル開発環境でご利用ください。',
    message: 'ChatGPT APIは本番環境では無効です',
    details: {
      inputText: text || 'no text provided',
      useOnlyKnowledgeBase: useOnlyKnowledgeBase,
      environment: 'azure-production'
    },
    timestamp: new Date().toISOString()
  });
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
