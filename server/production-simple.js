#!/usr/bin/env node

// 本番環境用サーバー（Azure App Service）
// シンプルで確実に動作する設定

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 8080;

// データベース接続プール
let dbPool = null;

// データベース接続初期化
function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require';
  
  try {
    console.log('🔗 Initializing database connection...');
    
    dbPool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    });

    console.log('✅ Database pool initialized');
    
    // 接続テスト
    setTimeout(async () => {
      try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        await client.release();
        console.log('✅ Database connection test successful:', result.rows[0]);
      } catch (err) {
        console.warn('⚠️ Database connection test failed:', err.message);
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// データベース接続を初期化
initializeDatabase();

// CORS設定（本番用）
const allowedOrigins = [
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173' // 開発用
];

app.use(cors({
  origin: (origin, callback) => {
    // Originが設定されていない場合（Postman等の直接リクエスト）は許可
    if (!origin) return callback(null, true);
    
    // 許可されたOriginかチェック
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // その他のOriginは拒否
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
}));

// JSON解析
app.use(express.json());

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Azure App Serviceではfalseに設定
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'lax' // CORS対応
  },
  name: 'sessionId' // セッション名を明示的に設定
}));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    port: PORT,
    database: dbPool ? 'connected' : 'disconnected',
    session: req.session ? 'available' : 'not available'
  });
});

// デバッグ用エンドポイント
app.get('/api/debug', (req, res) => {
  res.json({
    session: req.session,
    sessionId: req.sessionID,
    cookies: req.cookies,
    headers: req.headers,
    database: dbPool ? 'connected' : 'disconnected'
  });
});

// ログインエンドポイント（DB認証）
app.post('/api/auth/login', async (req, res) => {
  console.log('🔍 Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('❌ Missing username or password');
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  if (!dbPool) {
    console.log('❌ Database pool not available');
    return res.status(500).json({
      success: false,
      message: 'Database connection not available'
    });
  }

  try {
    console.log('🔍 Querying database for user:', username);
    
    // ユーザー情報をDBから取得
    const client = await dbPool.connect();
    console.log('✅ Database client connected');
    
    const result = await client.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );
    await client.release();
    console.log('✅ Database query completed, rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = result.rows[0];
    console.log('🔍 User found:', { id: user.id, username: user.username, role: user.role });
    
    // パスワードをハッシュ化して比較
    console.log('🔍 Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔍 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // セッションにユーザー情報を保存
    console.log('🔍 Setting session...');
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    console.log('✅ Session set:', req.session.user);
    
    // JWTトークンも生成
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-jwt-secret',
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated');
    
    console.log('✅ Login successful for user:', username, 'role:', user.role);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token: token,
      message: `Login successful as ${user.role}`
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Login failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ユーザー登録エンドポイント（管理者用）
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  if (!dbPool) {
    return res.status(500).json({
      success: false,
      message: 'Database connection not available'
    });
  }

  try {
    // パスワードをハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);
    
    // ユーザーをDBに登録
    const client = await dbPool.connect();
    const result = await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, role]
    );
    await client.release();

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // ユニーク制約違反の場合
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error'
    });
  }
});

// ユーザー情報取得エンドポイント
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    } else {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    }
  });
});

// その他のAPIエンドポイント（デモ用）
app.get('/api/*', (req, res) => {
  res.json({ 
    message: 'Production server - feature not implemented',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
