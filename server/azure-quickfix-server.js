const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 80;

console.log('🚀 Emergency Assistance Server - Quick Fix Version');

// CORS設定
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://localhost:5173',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance Server - Running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0-quickfix'
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 環境変数確認
app.get('/api/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET',
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT_SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_SET',
    FRONTEND_URL: process.env.FRONTEND_URL,
    CORS_ORIGINS: process.env.CORS_ORIGINS
  });
});

// データベース接続テスト
app.get('/api/db-test', async (req, res) => {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
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

// 簡単なログインエンドポイント（テスト用）
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    const result = await client.query(
      'SELECT id, username, role, display_name FROM users WHERE username = $1 AND password = crypt($2, password)',
      [username, password]
    );
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }
    
    const user = result.rows[0];
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'ログインエラーが発生しました',
      details: error.message
    });
  }
});

// 機種一覧エンドポイント（モックデータ）
app.get('/api/machines', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'CAT336D', category: '掘削機械' },
      { id: 2, name: 'D8T', category: 'ブルドーザー' },
      { id: 3, name: '980K', category: 'ホイールローダー' }
    ]
  });
});

// 機械番号エンドポイント（モックデータ）
app.get('/api/machines/machine-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { machine_type: 'CAT336D', machine_numbers: ['001', '002', '003'] },
      { machine_type: 'D8T', machine_numbers: ['004', '005'] },
      { machine_type: '980K', machine_numbers: ['006', '007', '008'] }
    ]
  });
});

// ナレッジベースエンドポイント（モックデータ）
app.get('/api/knowledge-base', (req, res) => {
  res.json({
    success: true,
    data: {
      documents: [],
      totalCount: 0,
      message: 'ナレッジベースは準備中です'
    }
  });
});

// 履歴データエンドポイント（モックデータ）
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    data: [],
    totalCount: 0,
    message: '履歴データは準備中です'
  });
});

// ユーザー一覧エンドポイント（モックデータ）
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, username: 'admin', role: 'system_admin', display_name: '管理者' },
      { id: 2, username: 'niina', role: 'system_admin', display_name: '新名聡' }
    ]
  });
});

// その他のAPIエンドポイント（404対応）
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'APIエンドポイントが見つかりません',
    endpoint: req.originalUrl
  });
});

// 全ての他のリクエスト（SPA対応）
app.get('*', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    requestedPath: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Emergency Assistance Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});
