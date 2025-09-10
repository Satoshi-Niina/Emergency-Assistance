#!/usr/bin/env node
/**
 * Azure App Service 簡単版サーバー（JavaScript）
 * TypeScriptコンパイル問題を回避
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const app = express();

// 環境変数の確認とデフォルト値
const PORT = process.env.PORT || 80;
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const SESSION_SECRET = process.env.SESSION_SECRET || 'emergency-assistance-session-secret-2025';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 Azure Simple Server Starting...');
console.log('Environment:', NODE_ENV);
console.log('Port:', PORT);
console.log('Frontend URL:', FRONTEND_URL);
console.log('Database URL exists:', !!DATABASE_URL);

// CORS設定 - Azure Static Web Apps用
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

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// セッション設定 - Azure環境用
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Azure App Serviceは自動でHTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site対応
  },
  name: 'emergency-assistance-session'
}));

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

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance Server - Azure Simple JS',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    session: {
      hasUserId: !!req.session.userId,
      userRole: req.session.userRole || 'none'
    }
  });
});

// ヘルスチェックエンドポイント - 両方のパスで対応
app.get('/health', async (req, res) => {
  try {
    // データベース接続テスト
    const client = await createDbClient();
    const result = await client.query('SELECT NOW() as current_time, version()');
    await client.end();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: result.rows[0].current_time,
        version: result.rows[0].version.substring(0, 50)
      },
      session: {
        configured: true,
        hasUserId: !!req.session.userId,
        userRole: req.session.userRole || 'none'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false
      }
    });
  }
});

// API用ヘルスチェックエンドポイント
app.get('/api/health', async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query('SELECT NOW() as current_time, version()');
    await client.end();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: result.rows[0].current_time,
        version: result.rows[0].version.substring(0, 50)
      }
    });
  } catch (error) {
    console.error('API Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false
      }
    });
  }
});

// 認証API - ログイン
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔑 Login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }
    
    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1',
      [username]
    );
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }
    
    const foundUser = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, foundUser.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }
    
    console.log('✅ Login successful for:', username, 'Role:', foundUser.role);
    
    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    res.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.display_name || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// 認証状態確認
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Auth check - Session:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    userRole: req.session?.userRole
  });
  
  if (!req.session || !req.session.userId) {
    return res.json({
      success: false,
      isAuthenticated: false
    });
  }
  
  res.json({
    success: true,
    isAuthenticated: true,
    user: {
      id: req.session.userId,
      role: req.session.userRole
    }
  });
});

// ユーザー一覧取得（管理者のみ）
app.get('/api/users', async (req, res) => {
  try {
    console.log('📊 Users list request');
    
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
    console.error('❌ Users list error:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// 機種一覧取得API
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    
    res.setHeader('Content-Type', 'application/json');
    
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
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`✅ Simple Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`🔗 CORS Origin: ${FRONTEND_URL}`);
  console.log(`💾 Session configured: ${!!SESSION_SECRET}`);
  console.log(`🗄️ Database configured: ${!!DATABASE_URL}`);
  console.log('🚀 Simple Server ready to accept requests');
});

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  console.log('💤 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('💤 SIGINT received, shutting down gracefully');
  process.exit(0);
});
