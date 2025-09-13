// Azure App Service 本番用統合サーバー v2
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 80;

// PostgreSQL接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// CORS設定
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5002'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ヘルスチェックエンドポイント（Azure App Service用）
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'emergency-assistance-backend',
    time: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', async (req, res) => {
  try {
    // データベース接続チェック
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend',
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend',
    version: '2.0.0'
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

// 認証API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // データベースからユーザーを検索
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, password_hash, role FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      const user = result.rows[0];
      // パスワード検証（bcrypt使用）
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

app.get('/api/auth/status', (req, res) => {
  res.status(200).json({
    authenticated: false,
    message: 'Auth status check'
  });
});

// デバッグ用エンドポイント
app.get('/api/debug/db', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // テーブル一覧を取得
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      // usersテーブルの構造を確認
      let usersTableInfo = null;
      try {
        const usersResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position
        `);
        usersTableInfo = usersResult.rows;
      } catch (err) {
        usersTableInfo = { error: err.message };
      }
      
      // ユーザー数を確認
      let userCount = 0;
      try {
        const countResult = await client.query('SELECT COUNT(*) as count FROM users');
        userCount = countResult.rows[0].count;
      } catch (err) {
        userCount = { error: err.message };
      }
      
      res.status(200).json({
        success: true,
        tables: tablesResult.rows,
        usersTableInfo,
        userCount,
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Debug DB error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// 緊急手順API
app.get('/api/emergency-procedures', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM emergency_procedures ORDER BY created_at DESC');
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Emergency procedures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency procedures'
    });
  }
});

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'Unknown error'
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`✅ Emergency Assistance Backend v2.0 running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
