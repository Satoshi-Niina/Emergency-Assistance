#!/usr/bin/env node

console.log('Starting server...');

// CommonJS統一エントリーポイント
// 例外可視化（本番環境ではプロセスを落とさない）
process.on('unhandledRejection', e => { 
  console.error('UNHANDLED_REJECTION', e); 
  // 本番環境ではプロセスを落とさない
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1); 
  }
});
process.on('uncaughtException', e => { 
  console.error('UNCAUGHT_EXCEPTION', e); 
  // 本番環境ではプロセスを落とさない
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1); 
  }
});

try { 
  require('dotenv').config(); 
  console.log('dotenv loaded successfully');
} catch (e) { 
  console.log('dotenv not available, continuing...'); 
}

console.log('Loading dependencies...');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

console.log('Dependencies loaded successfully');

// 必須環境変数の存在チェック
const requiredEnvVars = ['NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing environment variables:', missingEnvVars);
  console.warn('⚠️ Server will continue with default values');
} else {
  console.log('✅ All required environment variables are set');
}

console.log('🔧 Environment configuration:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '8080',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'
});

const app = express();
console.log('Express app created');

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// CORS設定 - 本番環境用
const frontendUrl = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
app.use(cors({
  origin: [
    frontendUrl,
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://*.azurestaticapps.net', // Static Web Apps のワイルドカードドメイン
    'http://localhost:3000', 
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// セッション設定 - 本番環境用
const isProduction = process.env.NODE_ENV === 'production';
const isLocalProduction = process.env.LOCAL_PRODUCTION === 'true';
const useSecureCookies = isProduction && !isLocalProduction; // ローカル本番シミュレーションではsecure: false

console.log('🔧 Session configuration:', {
  isProduction,
  isLocalProduction,
  useSecureCookies,
  NODE_ENV: process.env.NODE_ENV,
  LOCAL_PRODUCTION: process.env.LOCAL_PRODUCTION
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'emergency-assistance-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: useSecureCookies,
    httpOnly: true,
    sameSite: useSecureCookies ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
}));

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// ルートも200
app.get('/', (req, res) => {
  res.status(200).send('ok');
});

// ヘルスチェック
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 疎通確認用エンドポイント
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// API ルート
app.get('/api/health/json', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 認証APIエンドポイント
// ログイン
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request:', {
    body: req.body,
    cookies: req.headers.cookie ? '[SET]' : '[NOT SET]',
    origin: req.headers.origin,
    sessionId: req.session?.id
  });
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'ユーザー名とパスワードを入力してください'
    });
  }
  
  // ダミーログイン（本番環境用）
  if (username === 'admin' && password === 'admin') {
    req.session.userId = 'admin';
    req.session.userRole = 'admin';
    req.session.username = 'admin';
    
    console.log('✅ Login successful:', username);
    console.log('🍪 Session after login:', {
      sessionId: req.session.id,
      userId: req.session.userId,
      userRole: req.session.userRole
    });
    
    // セッションを明示的に保存
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'セッションの保存に失敗しました'
        });
      }
      
      console.log('✅ Session saved successfully');
      return res.json({
        success: true,
        user: {
          id: 'admin',
          username: 'admin',
          displayName: 'Administrator',
          role: 'admin',
          department: 'IT'
        }
      });
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'ユーザー名またはパスワードが正しくありません'
    });
  }
});

// 現在のユーザー情報取得
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 /me request:', {
    cookies: req.headers.cookie ? '[SET]' : '[NOT SET]',
    origin: req.headers.origin,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    sessionData: req.session
  });
  
  if (!req.session || !req.session.userId) {
    console.log('❌ No session or user ID');
    console.log('🔍 Available session data:', req.session);
    return res.status(401).json({
      success: false,
      error: '認証されていません'
    });
  }
  
  console.log('✅ Authenticated user:', req.session.userId);
  
  return res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username || req.session.userId,
      displayName: req.session.username || req.session.userId,
      role: req.session.userRole || 'user',
      department: 'General'
    }
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 Logout request:', {
    sessionId: req.session?.id,
    userId: req.session?.userId
  });
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destroy error:', err);
      return res.status(500).json({
        success: false,
        error: 'ログアウトに失敗しました'
      });
    }
    
    res.clearCookie('emergency-assistance-session');
    console.log('✅ Logout successful');
    
    return res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバー起動
const port = Number(process.env.PORT) || 8080;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Listening on ${host}:${port}`);
  console.log(`Server is ready to accept connections`);
  console.log(`🌐 Server URL: http://${host}:${port}`);
  console.log(`🔍 Health check: http://${host}:${port}/healthz`);
  console.log(`🔐 Login API: http://${host}:${port}/api/auth/login`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.on('listening', () => {
  console.log('✅ Server is now listening for connections');
});

// プロセス終了時の処理
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
