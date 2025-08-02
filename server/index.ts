
import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';

// Emergency Assistance Development Server
// Version: 1.0.0-dev
// Last Updated: 2024-12-19

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み設定
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log('🔧 環境変数読み込み開始:', {
  NODE_ENV,
  isProduction,
  cwd: process.cwd(),
  __dirname
});

// 環境変数ファイルの読み込み（優先順位順）
const envPaths = [
  // 1. ルートディレクトリの環境別ファイル
  path.resolve(process.cwd(), `.env.${NODE_ENV}.local`),
  path.resolve(process.cwd(), `.env.${NODE_ENV}`),
  // 2. ルートディレクトリの.env
  path.resolve(process.cwd(), '.env'),
  // 3. サーバーディレクトリの環境別ファイル
  path.resolve(__dirname, `.env.${NODE_ENV}.local`),
  path.resolve(__dirname, `.env.${NODE_ENV}`),
  // 4. サーバーディレクトリの.env
  path.resolve(__dirname, '.env'),
];

// 各パスで.envファイルを読み込み
let loadedEnvFile = null;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    loadedEnvFile = envPath;
    console.log('✅ 環境変数ファイル読み込み成功:', envPath);
    break;
  }
}

if (!loadedEnvFile) {
  console.log('⚠️ 環境変数ファイルが見つかりません。デフォルト値を使用します。');
  console.log('🔍 試行したパス:', envPaths);
}

// 開発環境用のデフォルト環境変数設定
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret';
  console.log('[DEV] JWT_SECRET not set, using development default');
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'dev-session-secret-for-development-only';
  console.log('[DEV] SESSION_SECRET not set, using development default');
}

// 重要な環境変数の確認
console.log("[DEV] Development environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  loadedEnvFile,
  PWD: process.cwd(),
  __dirname: __dirname
});

// DATABASE_URLが設定されていない場合はエラーで停止
if (!process.env.DATABASE_URL) {
  console.error('❌ 致命的エラー: DATABASE_URLが設定されていません');
  console.error('🔧 解決方法: .envファイルを作成し、DATABASE_URLを設定してください');
  console.error('📝 例: DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance');
  process.exit(1);
}

console.log("[DEV] Development server starting...");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// 開発環境用のCORS設定
const corsOptions = {
  origin: isDevelopment ? '*' : ['https://your-production-domain.com'], // 本番では実際のドメインに変更
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
};

console.log('🔧 Development CORS settings:', corsOptions);

app.use(cors(corsOptions));

// 開発環境用のセキュリティヘッダー（緩めの設定）
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// JSON解析ミドルウェア（必須）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 開発環境用のセッション設定
import session from 'express-session';

const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-local-secret",
  resave: true,
  saveUninitialized: false, // 認証済みユーザーのみセッションを保存
  cookie: { 
    secure: false, // 開発環境ではHTTPS不要
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'emergency-dev-session'
};

console.log('🔧 セッション設定:', {
  secret: sessionSettings.secret ? '[SET]' : '[NOT SET]',
  resave: sessionSettings.resave,
  saveUninitialized: sessionSettings.saveUninitialized,
  cookie: sessionSettings.cookie
});

app.use(session(sessionSettings));

// 開発環境用のリクエストログ
app.use((req, res, next) => {
  console.log('📡 [DEV] Request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString()
  });
  
  next();
});

// 認証ルートを最初に設定
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

// 全てのAPIエンドポイントにJSON Content-Typeを強制（ルート登録前に設定）
app.use('/api', (req, res, next) => {
  // HTMLレスポンスを防ぐために、明示的にJSONを設定
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// デバッグ用エンドポイント
app.get('/api/debug/env', (req, res) => {
  console.log('🔍 デバッグエンドポイント呼び出し: /api/debug/env');
  res.json({
    success: true,
    data: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
      loadedEnvFile,
      timestamp: new Date().toISOString()
    }
  });
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  console.log('🔍 ヘルスチェック呼び出し: /api/health');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// その他のルートの読み込み
import { registerRoutes } from './routes/index.js';
registerRoutes(app);

// 開発環境用のエラーハンドリング
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[DEV] Error:', err);
  
  // APIエンドポイントの場合はJSONレスポンスを返す
  if (req.path.startsWith('/api/')) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  } else {
    // 非APIエンドポイントの場合は通常のエラーハンドリング
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// 開発環境用の404ハンドリング（JSON形式）
app.use('/api/*', (req: Request, res: Response) => {
  console.log('[DEV] API 404 Not Found:', req.originalUrl);
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 非APIエンドポイントの404ハンドリング
app.use('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api/')) {
    console.log('[DEV] Non-API 404 Not Found:', req.originalUrl);
    res.status(404).json({
      error: 'Not Found',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// 開発環境用のグレースフルシャットダウン
const gracefulShutdown = () => {
  console.log('[DEV] Shutting down development server...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 開発サーバーの起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [DEV] Development server running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 [DEV] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 [DEV] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 [DEV] Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 [DEV] Demo login: niina / 0077`);
});
