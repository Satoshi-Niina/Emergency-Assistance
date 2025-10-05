#!/usr/bin/env node

// 統合サーバー - フロントエンドとAPIを統合
// Docker環境で動作する統合サーバー

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📄 Loaded .env file from:', envPath);
  console.log('📄 DATABASE_URL exists:', !!process.env.DATABASE_URL);
} else {
  console.log('📄 .env file not found at:', envPath);
  console.log('📄 Using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8081;

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// データベース接続プール
let dbPool = null;

// データベース初期化
function initializeDatabase() {
  // 明示的に簡易認証が設定されている場合のみ簡易認証を使用
  if (process.env.BYPASS_DB_FOR_LOGIN === 'true') {
    console.log('🚀 Using simple authentication (BYPASS_DB_FOR_LOGIN=true)');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }

  try {
    console.log('🔗 Initializing database connection...');
    
    // ローカル開発環境ではSSLを無効化
    const isLocalhost = process.env.DATABASE_URL.includes('localhost') || 
                       process.env.DATABASE_URL.includes('127.0.0.1');
    
    const sslConfig = isLocalhost 
      ? false  // ローカルではSSL無効
      : process.env.PG_SSL === 'require' 
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
    });

    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// データベース初期化
initializeDatabase();

// CORS設定
const corsOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイル配信（フロントエンド）
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// API router - server/src/api の Azure Functions を統合
const apiRouter = express.Router();

// Azure Functions のヘルスチェックを統合
apiRouter.get('/health', async (req, res) => {
  try {
    // server/src/api/health/index.js の処理を再現
    const healthCheck = require('./src/api/health/index.js');
    const context = {
      log: console.log,
      res: null
    };
    
    await healthCheck(context, { method: req.method });
    
    if (context.res) {
      res.status(context.res.status || 200);
      if (context.res.headers) {
        Object.keys(context.res.headers).forEach(key => {
          res.setHeader(key, context.res.headers[key]);
        });
      }
      res.send(context.res.body || '');
    } else {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 認証API - Azure Functions の auth/login を統合
apiRouter.post('/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', req.body);
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
          message: 'ログインに成功しました'
        });
      } catch (dbError) {
        console.error('Database error, falling back to simple auth:', dbError.message);
        // データベースエラーの場合、簡易認証にフォールバック
        return handleSimpleAuth(username, password, res);
      }
    } else {
      // データベースなしの簡易認証
      return handleSimpleAuth(username, password, res);
    }

    // 簡易認証の処理関数
    function handleSimpleAuth(username, password, res) {
      console.log('Using simple authentication without database');
      console.log(`Provided credentials: username="${username}", password="${password}"`);
      
      // 複数のテストユーザーをサポート
      const testUsers = {
        'admin': { password: 'admin', role: 'admin', displayName: 'Administrator', department: 'IT' },
        'niina': { password: 'G&896845', role: 'admin', displayName: 'Satoshi Niina', department: 'IT' }
      };
      
      const user = testUsers[username];
      if (user && password === user.password) {
        console.log('Simple authentication successful');
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

// その他のAPIエンドポイント（プレースホルダー）
apiRouter.post('/chatgpt', (req, res) => {
  const { message } = req.body;
  res.json({
    response: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/knowledge-base/*', (req, res) => {
  res.json({ 
    data: [],
    message: 'Knowledge base API placeholder'
  });
});

// APIルーターをマウント
app.use('/api', apiRouter);

// SPAルーティング - すべての非APIリクエストをindex.htmlにリダイレクト
app.get('*', (req, res) => {
  // APIルートは除外
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // 静的ファイルが存在する場合はそれを返す
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // それ以外はSPAのindex.htmlを返す
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Assistance System running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  
  // runtime-config.jsを生成
  const runtimeConfig = {
    API_BASE_URL: '/api',  // 統合サーバーでは相対パスを使用
    CORS_ALLOW_ORIGINS: process.env.CORS_ALLOW_ORIGINS || '*',
    ENVIRONMENT: process.env.NODE_ENV || 'production'
  };
  
  const runtimeConfigContent = `window.runtimeConfig = ${JSON.stringify(runtimeConfig, null, 2)};`;
  
  try {
    fs.writeFileSync(path.join(__dirname, 'public', 'runtime-config.js'), runtimeConfigContent);
    console.log('✅ Runtime config generated');
  } catch (error) {
    console.error('❌ Failed to generate runtime config:', error);
  }
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
