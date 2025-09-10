#!/usr/bin/env node
/**
 * Azure App Service 正式本番サーバー（修正版）
 * クイックフィックス版の成功要素を取り入れた完全版
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { BlobServiceClient } from '@azure/storage-blob';

// 型定義
interface MachineGroupData {
  machine_type_id: string;
  machine_type_name: string;
  machine_numbers: string[];
}

interface DiagnosisTests {
  database?: string;
  storage?: string;
}

const app = express();

// 環境変数の確認とデフォルト値
const PORT = process.env.PORT || 80;
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const SESSION_SECRET = process.env.SESSION_SECRET || 'emergency-assistance-session-secret-2025';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 Emergency Assistance Production Server v2.0');
console.log('Environment:', NODE_ENV);
console.log('Port:', PORT);
console.log('Frontend URL:', FRONTEND_URL);
console.log('Database URL exists:', !!DATABASE_URL);

// CORS設定 - シンプルで確実な設定
const corsOptions = {
  origin: [
    FRONTEND_URL,
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://localhost:5173',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// プリフライトリクエストの処理
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// セッション設定
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    domain: NODE_ENV === 'production' ? '.japanwest-01.azurewebsites.net' : undefined
  },
  name: 'emergency-assistance-session'
}));

// セッション型定義
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// 認証ミドルウェア
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('🔐 認証チェック:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    cookies: req.headers.cookie,
    hasSession: !!req.session,
    url: req.url,
    method: req.method
  });
  
  if (!req.session || !req.session.userId) {
    console.log('❌ 認証失敗: セッションまたはユーザーIDが不正');
    return res.status(401).json({
      success: false,
      error: '認証が必要です'
    });
  }
  
  console.log('✅ 認証成功:', req.session.userId);
  next();
}

// データベース接続ヘルパー
async function createDbClient() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000
  });
  
  await client.connect();
  return client;
}

// ============= 基本エンドポイント =============

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance Server - Production v2.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    session: {
      hasUserId: !!req.session.userId,
      userRole: req.session.userRole || 'none'
    }
  });
});

// ヘルスチェック
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    const client = await createDbClient();
    await client.query('SELECT 1');
    await client.end();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// 環境変数確認エンドポイント
app.get('/api/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET',
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT_SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_SET',
    FRONTEND_URL: process.env.FRONTEND_URL,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    PORT: PORT
  });
});

// ============= 認証エンドポイント =============

// ログイン
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔑 ログイン試行:', req.body.username);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }

    const client = await createDbClient();
    
    // ユーザー情報を取得（パスワードハッシュも含む）
    const result = await client.query(
      'SELECT id, username, password, role, display_name FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      await client.end();
      console.log('❌ ログイン失敗: ユーザーが見つかりません');
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }
    
    const user = result.rows[0];
    
    // bcryptでパスワードを検証
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      await client.end();
      console.log('❌ ログイン失敗: パスワードが間違っています');
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }
    
    await client.end();
    
    // セッションに保存
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    console.log('✅ ログイン成功:', user.username);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name
      }
    });
    
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ログインエラーが発生しました',
      details: error.message
    });
  }
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ ログアウトエラー:', err);
      return res.status(500).json({
        success: false,
        error: 'ログアウトに失敗しました'
      });
    }
    
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// 認証状態確認
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 認証状態チェック:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    hasSession: !!req.session,
    cookies: req.headers.cookie
  });
  
  if (!req.session || !req.session.userId) {
    console.log('❌ 認証状態確認失敗');
    return res.status(401).json({
      success: false,
      error: '認証されていません'
    });
  }
  
  console.log('✅ 認証状態確認成功');
  res.json({
    success: true,
    user: {
      userId: req.session.userId,
      userRole: req.session.userRole
    }
  });
});

// ============= 機械・機種管理エンドポイント =============

// 機種一覧取得
app.get('/api/machines', requireAuth, async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    
    const client = await createDbClient();
    const result = await client.query(`
      SELECT id, machine_type_name 
      FROM machine_types 
      ORDER BY machine_type_name
    `);
    await client.end();
    
    console.log(`✅ 機種一覧取得完了: ${result.rows.length}件`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// すべての機種データ取得（設定画面用）
app.get('/api/machines/all-machines', requireAuth, async (req, res) => {
  try {
    console.log('🔍 全機種データ取得リクエスト');
    
    const client = await createDbClient();
    const result = await client.query(`
      SELECT 
        mt.id as machine_type_id,
        mt.machine_type_name,
        array_agg(m.machine_number ORDER BY m.machine_number) as machine_numbers
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      GROUP BY mt.id, mt.machine_type_name
      ORDER BY mt.machine_type_name
    `);
    await client.end();
    
    console.log(`✅ 全機種データ取得完了: ${result.rows.length}件`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全機種データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '全機種データの取得に失敗しました',
      details: error.message
    });
  }
});

// 機種別機械番号一覧取得
app.get('/api/machines/machine-types', requireAuth, async (req, res) => {
  try {
    console.log('🔍 機種別機械番号一覧取得リクエスト');
    
    const client = await createDbClient();
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
    await client.end();
    
    // 機種ごとにグループ化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupedData = result.rows.reduce((acc: Record<string, any>, row: any) => {
      const typeName = row.machine_type_name;
      if (!acc[typeName]) {
        acc[typeName] = {
          machine_type_id: row.machine_type_id,
          machine_type_name: typeName,
          machine_numbers: []
        };
      }
      if (row.machine_number) {
        acc[typeName].machine_numbers.push(row.machine_number);
      }
      return acc;
    }, {});
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = Object.values(groupedData).map((group: any) => ({
      machine_type: group.machine_type_name,
      machine_numbers: group.machine_numbers
    }));
    
    console.log(`✅ 機種別機械番号一覧取得完了: ${responseData.length}機種`);
    
    res.json({
      success: true,
      data: responseData,
      total: responseData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種別機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種別機械番号一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// ============= その他のAPIエンドポイント =============

// ナレッジベース
app.get('/api/knowledge-base', requireAuth, async (req, res) => {
  try {
    // 基本的な応答（後で拡張）
    res.json({
      success: true,
      data: {
        documents: [],
        totalCount: 0,
        message: 'ナレッジベースは準備中です'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジベース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message
    });
  }
});

// ナレッジAPIエンドポイント（フロントエンドが要求）
app.get('/api/knowledge', requireAuth, async (req, res) => {
  try {
    // フロントエンドが期待する形式で返す
    res.json({
      success: true,
      data: [],
      totalCount: 0,
      message: 'ナレッジデータは準備中です',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジの取得に失敗しました',
      details: error.message
    });
  }
});

// トラブルシューティングAPIエンドポイント
app.get('/api/troubleshooting/list', requireAuth, async (req, res) => {
  try {
    console.log('🔍 トラブルシューティング一覧取得リクエスト');
    
    // 基本的な応答を返す（後でデータベースやストレージから取得）
    res.json({
      success: true,
      data: [],
      totalCount: 0,
      message: 'トラブルシューティングデータは準備中です',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'トラブルシューティング一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// 履歴データ
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query(`
      SELECT * FROM history_items 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      totalCount: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 履歴データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴データの取得に失敗しました',
      details: error.message
    });
  }
});

// ユーザー一覧（管理者のみ）
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    console.log('📊 ユーザー一覧リクエスト - セッション:', {
      userId: req.session?.userId,
      userRole: req.session?.userRole
    });
    
    // 認証チェック
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です'
      });
    }
    
    // 管理者権限チェック
    if (req.session.userRole !== 'system_admin') {
      return res.status(403).json({
        success: false,
        error: '管理者権限が必要です'
      });
    }
    
    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, role, display_name, department, created_at FROM users ORDER BY created_at DESC'
    );
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ユーザー一覧エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// ============= 診断エンドポイント =============

// データベース接続テスト
app.get('/api/db-test', async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    await client.end();
    
    res.json({
      status: 'SUCCESS',
      current_time: result.rows[0].current_time,
      db_version: result.rows[0].db_version.substring(0, 100)
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// 包括的診断
app.get('/api/diagnosis', async (req, res) => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    server_status: 'running',
    version: '2.0-production',
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      PORT: PORT,
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'NOT_SET'
    },
    configuration: {
      database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET',
      storage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT_SET',
      openai: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_SET',
      session: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_SET',
      frontend: process.env.FRONTEND_URL || 'NOT_SET',
      cors: process.env.CORS_ORIGINS || 'NOT_SET'
    },
    tests: {} as DiagnosisTests
  };

  // データベーステスト
  try {
    if (process.env.DATABASE_URL) {
      const client = await createDbClient();
      await client.query('SELECT 1');
      await client.end();
      diagnosis.tests.database = 'SUCCESS';
    } else {
      diagnosis.tests.database = 'NOT_CONFIGURED';
    }
  } catch (error) {
    diagnosis.tests.database = `ERROR: ${error.message}`;
  }

  // ストレージテスト
  try {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance-images';
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.exists();
      diagnosis.tests.storage = 'SUCCESS';
    } else {
      diagnosis.tests.storage = 'NOT_CONFIGURED';
    }
  } catch (error) {
    diagnosis.tests.storage = `ERROR: ${error.message}`;
  }

  res.json(diagnosis);
});

// ============= その他のリクエスト処理 =============

// API 404 処理
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'APIエンドポイントが見つかりません',
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// その他の全てのリクエスト
app.get('*', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server v2.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    requestedPath: req.path,
    note: 'このサーバーはAPIサーバーです。フロントエンドは別途配信されています。'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔥 Emergency Assistance Production Server v2.0 listening on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Database: ${DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`Session Secret: ${SESSION_SECRET ? 'Configured' : 'Not configured'}`);
  console.log('\n🚀 Server ready for production use!');
});
