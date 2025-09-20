import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import * as path from 'path';

// CommonJS環境での__dirname取得
const __dirname = path.resolve('.');

const app = express();

// CORS設定 - より確実な設定
app.use(cors({ 
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003'
  ], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// プリフライトリクエストの明示的な処理
app.options('*', (req, res) => {
  console.log('🔍 OPTIONS request:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Cookieパーサーを追加
app.use(cookieParser());

// JSONパース
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// セッション設定 - 本番環境用
const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'production-secret-key-12345',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: isProduction ? true : false,
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7日間
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
};

console.log('🔧 本番環境セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  isProduction
});

app.use(session(sessionConfig));

// 本番環境専用: APIルートを最優先で処理
app.use((req, res, next) => {
  console.log(`🔍 本番環境リクエスト: ${req.method} ${req.path}`);
  
  // CORSヘッダーを明示的に設定
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://witty-river-012f39e00.1.azurestaticapps.net');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  
  if (req.path.startsWith('/api/')) {
    console.log(`✅ APIルート検出: ${req.path}`);
    return next();
  }
  next();
});

// ヘルスチェック
app.get('/api/health/json', (req: Request, res: Response) => {
  const hasDb = !!process.env.DATABASE_URL;
  const hasBlob = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  res.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      hasDb,
      hasBlob,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// CORS設定確認用エンドポイント
app.get('/api/cors-test', (req: Request, res: Response) => {
  console.log('🔍 CORS test request:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  
  res.json({
    success: true,
    message: 'CORS設定が正常に動作しています',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    corsHeaders: {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// デバッグ用ルート
app.get('/api/debug/routes', (req: Request, res: Response) => {
  res.json({
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    environment: 'production',
    routes: [
      '/api/health/json',
      '/api/users',
      '/api/machines/machine-types',
      '/api/machines/all-machines',
      '/api/storage/list'
    ]
  });
});

// ユーザー管理の基本ルート

// 本番もDB取得APIを利用
import { usersRouter } from './routes/users';
app.use('/api/users', usersRouter);

// 機械管理の基本ルート

// 本番もDB取得APIを利用
import machinesRouter from './routes/machines';
app.use('/api/machines', machinesRouter);

// 認証APIルート（auth）
import authRouter from './routes/auth';
app.use('/api/auth', authRouter);

// 本番環境用デバッグエンドポイント
app.get('/api/debug/auth', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '認証APIが利用可能です',
    timestamp: new Date().toISOString(),
    environment: 'production',
    endpoints: [
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/auth/debug/env'
    ]
  });
});

// ストレージ管理の基本ルート
app.get('/api/storage/list', async (req: Request, res: Response) => {
  try {
    console.log('🔍 本番環境: ストレージ一覧取得リクエスト');
    res.json({
      success: true,
      data: [],
      message: '本番環境: ストレージ一覧取得（Azure Storage接続が必要）',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 本番環境: ストレージ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ストレージ一覧の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// 静的ファイル配信（最後に配置）
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: '1d'
}));

// 404ハンドリング
app.use('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Page not found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('❌ 本番環境エラー:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 本番環境サーバー起動: http://localhost:${PORT}`);
  console.log(`🔧 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 利用可能なAPIエンドポイント:`);
  console.log(`   - GET /api/health/json`);
  console.log(`   - GET /api/debug/routes`);
  console.log(`   - GET /api/users`);
  console.log(`   - GET /api/machines/machine-types`);
  console.log(`   - GET /api/machines/all-machines`);
  console.log(`   - GET /api/storage/list`);
});

module.exports = app;
