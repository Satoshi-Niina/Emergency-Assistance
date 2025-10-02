#!/usr/bin/env node

// 本番環境専用サーバー
// Azure App Service用の安定したサーバー
// ローカル環境との完全分離

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { BlobServiceClient } from '@azure/storage-blob';
import { runMigrations } from './startup-migration.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 本番環境の環境変数を読み込み
console.log('🚀 Starting Production Server...');
console.log('📊 Environment:', process.env.NODE_ENV || 'production');

// 環境変数の読み込み（本番環境ではシステム環境変数を使用）
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
  dotenv.config();
  console.log('📄 Loaded .env file');
} else {
  console.log('📄 Using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8080;

// 本番環境用のCORS設定
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175'
];

app.use(cors({
  origin: (origin, callback) => {
    // 本番環境では厳密なOriginチェック
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
  } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// データベース接続プール
let dbPool = null;

// データベース初期化（本番環境用）
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing production database connection...');
    
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
      query_timeout: 60000,
      statement_timeout: 60000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    });

    console.log('✅ Production database pool initialized');
    
    // 接続テスト
    setTimeout(async () => {
      try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        await client.release();
        console.log('✅ Database connection test successful');
      } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
      }
    }, 2000);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Azure Blob Storage初期化
let blobServiceClient = null;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

if (connectionString) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    console.log('✅ Azure Blob Storage initialized');
  } catch (error) {
    console.warn('⚠️ Azure Blob Storage initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING is not set');
}

// スタートアップシーケンス
async function startupSequence() {
  try {
    console.log('🚀 Starting production startup sequence...');
    
    // データベース初期化
    initializeDatabase();
    
    // マイグレーション実行
    await runMigrations();
    
    console.log('✅ Production startup sequence completed');
  } catch (error) {
    console.error('❌ Production startup sequence failed:', error);
    console.warn('⚠️ Server will continue running');
  }
}

// 非同期でスタートアップシーケンスを実行
startupSequence();

// ===== API エンドポイント =====

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
    status: 'ok',
      timestamp: new Date().toISOString(),
    environment: 'production',
    port: PORT,
    database: dbPool ? 'connected' : 'not_configured',
    session: 'available'
  });
});

// 詳細ヘルスチェック
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'production',
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      pool: dbPool ? {
        totalCount: dbPool.totalCount,
        idleCount: dbPool.idleCount,
        waitingCount: dbPool.waitingCount
      } : null,
      connected: !!dbPool
    },
    blobStorage: {
      configured: !!blobServiceClient,
      containerName: containerName
    }
  });
});

// 認証エンドポイント（本番環境用 - データベース認証）
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    console.log('[auth/login] Production login attempt:', { 
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
    console.error('[auth/login] Production login error:', error);
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
    mode: 'session',
    env: 'production',
    timestamp: new Date().toISOString()
  });
});

// 現在のユーザー情報
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

// ログアウト
app.post('/api/auth/logout', (req, res) => {
    res.json({
      success: true,
      message: 'ログアウトしました'
  });
});

// ユーザー一覧（データベース接続時のみ）
app.get('/api/users', async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        username: row.username,
        role: row.role,
        displayName: row.display_name || row.username,
        department: row.department,
        createdAt: row.created_at
      })),
      message: 'ユーザー一覧を取得しました（データベース接続済み）',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/users] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 機種一覧
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

    const client = await dbPool.connect();
    const result = await client.query('SELECT id, name, type FROM machine_types ORDER BY name');
    await client.release();

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

// ナレッジベース（Blob Storage使用）
app.get('/api/knowledge-base', async (req, res) => {
  try {
    if (!blobServiceClient) {
      return res.json({
      success: true,
      data: [],
        message: 'Azure Storage not configured',
      timestamp: new Date().toISOString()
    });
  }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const listOptions = { prefix: 'documents/' };
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

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/knowledge-base] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 応急処置フロー
app.get('/api/emergency-flow/list', async (req, res) => {
  try {
    if (!blobServiceClient) {
      return res.json({
        success: true,
        data: [],
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      });
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const listOptions = { prefix: 'flows/' };
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

        res.json({
          success: true,
      data: flows,
      total: flows.length,
          timestamp: new Date().toISOString()
        });
  } catch (error) {
    console.error('[api/emergency-flow/list] エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フロー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// データベース接続チェック
app.get('/api/db-check', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({
          success: true,
        connected: false,
        message: 'データベース接続プールが初期化されていません',
        details: {
          environment: 'production',
          database: 'not_initialized',
          ssl: process.env.PG_SSL || 'not_set',
          database_url_set: !!process.env.DATABASE_URL
        },
          timestamp: new Date().toISOString()
        });
      }

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
        environment: 'production',
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
        environment: 'production',
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

// ChatGPT API（本番環境では無効）
app.post('/api/chatgpt', (req, res) => {
        res.json({
          success: true,
    response: 'AI支援機能は本番環境では利用できません。ローカル開発環境でご利用ください。',
    message: 'ChatGPT APIは本番環境では無効です',
    details: {
      environment: 'production'
          },
          timestamp: new Date().toISOString()
        });
});

// 環境情報
app.get('/api/_diag/env', (req, res) => {
      res.json({
        success: true,
    environment: 'production',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not_set',
      PORT: process.env.PORT || 'not_set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      PG_SSL: process.env.PG_SSL || 'not_set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set (hidden)' : 'Not set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'not_set',
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Set (hidden)' : 'Not set',
      AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || 'not_set'
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

// ルートエンドポイント
app.get('/', (req, res) => {
    res.json({
    message: 'Emergency Assistance API Server (Production)',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Production Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Production server error',
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
  console.log(`🚀 Production Server running on ${host}:${PORT}`);
  console.log(`📊 Health check: /api/health`);
  console.log(`🌍 Environment: production`);
  console.log(`📦 Node.js: ${process.version}`);
  console.log(`💻 Platform: ${process.platform}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (dbPool) {
    dbPool.end();
  }
    process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (dbPool) {
    dbPool.end();
  }
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