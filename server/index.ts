import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';

// Emergency Assistance Backend Server
// Version: 1.0.0
// Last Updated: 2024-12-19

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 環境変数の読み込み確認
console.log("[DEBUG] Environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  FRONTEND_URL: process.env.FRONTEND_URL || "NOT SET",
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? "SET" : "NOT SET",
  PWD: process.cwd(),
  __dirname: __dirname
});

console.log("[INFO] Backend server starting...");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// CORS設定
const allowedOrigins = [
  'https://emergency-assistance-app.azurestaticapps.net',
  'https://emergency-assistance-app.azurewebsites.net',
  'https://emergency-assistance-app.azurewebsites.net',
  'https://emergency-assistance-app.azurestaticapps.net',
  'https://emergency-assistance-app.azurewebsites.net',
  'https://emergency-assistance-app.azurestaticapps.net',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    console.log('🌐 CORS リクエスト:', { 
      origin, 
      isProduction: process.env.NODE_ENV === 'production',
      allowedOrigins 
    });
    
    // 開発環境ではすべてのオリジンを許可
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ 開発環境: CORS許可');
      callback(null, true);
      return;
    }
    
    // 本番環境でのオリジンチェック
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.azurestaticapps.net') || origin.endsWith('.azurewebsites.net'))) {
      console.log('✅ 本番環境: CORS許可', { origin });
      callback(null, true);
    } else {
      console.log('❌ 本番環境: CORS拒否', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
};

console.log('🔧 CORS設定:', {
  isProduction,
  origin: corsOptions.origin,
  credentials: corsOptions.credentials,
  methods: corsOptions.methods
});

app.use(cors(corsOptions));

// セキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// セッション設定
import session from 'express-session';
import { storage } from './storage.js';

const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "emergency-recovery-secret",
  resave: true,
  saveUninitialized: true,
  store: storage.sessionStore,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'emergency-session'
};

// Azure App Service環境での設定
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', 1);
}

app.use(session(sessionSettings));

// リクエストログ（Azure環境でのデバッグ用）
app.use((req, res, next) => {
  console.log('📡 リクエスト受信:', {
    method: req.method,
    url: req.url,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'referer': req.headers.referer
  });
  
  // APIルートへのリクエストかどうかを確認
  if (req.path.startsWith('/api/')) {
    console.log('🔍 APIルートリクエスト:', req.path);
  }
  
  next();
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    processId: process.pid,
    version: process.env.npm_package_version || '1.0.0',
    // 本番環境でも基本的なデバッグ情報を提供
    debug: {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      sessionSecret: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
      frontendUrl: process.env.FRONTEND_URL,
      openaiKey: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      azureStorage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET' : 'NOT SET',
      requestOrigin: req.headers.origin,
      requestHost: req.headers.host,
      requestPath: req.path,
      allowedOrigins: allowedOrigins
    }
  });
});

// デバッグエンドポイント（本番環境では無効化）
app.get('/api/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Debug endpoint not available in production' });
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
      FRONTEND_URL: process.env.FRONTEND_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET' : 'NOT SET'
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: req.headers,
      origin: req.headers.origin,
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    },
    cors: {
      allowedOrigins: allowedOrigins,
      corsOptions: corsOptions
    }
  });
});

// Step 1: APIルートを最初に登録（静的ファイル配信より前に配置）
console.log('📡 APIルート登録開始...');

// 認証ルートを最初に登録
import { authRouter } from './routes/auth.js';
app.use('/api/auth', authRouter);
console.log('✅ 認証ルート登録完了');

// その他のAPIルートを登録
import { registerRoutes } from './routes/index.js';
registerRoutes(app);
console.log('✅ 全APIルート登録完了');

// Step 2: 静的ファイル設定（APIルートの後に配置）
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
console.log('✅ 静的ファイル設定完了');

// 本番環境での静的ファイル配信（APIルートの後に配置）
if (isProduction) {
  console.log('🎯 本番環境: 静的ファイル配信設定');
  
  // クライアントのビルドファイルを配信
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // SPAのルーティング対応（APIルート以外）
  app.get('*', (req, res) => {
    console.log('🎯 SPAルーティング:', { path: req.path });
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
      // APIルートが見つからない場合
      console.log('❌ APIルートが見つかりません:', req.path);
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// エラーハンドラー
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// サーバー起動
const server = app.listen(PORT, () => {
  console.log('🚀 ===== BACKEND SERVER READY =====');
  console.log('✅ バックエンドサーバー起動:', `http://0.0.0.0:${PORT}`);
  console.log('🌐 環境:', process.env.NODE_ENV || 'development');
  console.log('📡 ヘルスチェック:', '/api/health');
  console.log('🔧 環境変数確認:', {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
  });
  console.log('🚀 ===== BACKEND SERVER READY =====');
  if (isProduction) {
    console.log(`🎯 本番モード: 静的ファイル配信有効`);
  }
});

server.on('error', (err: any) => {
  console.error('❌ サーバーエラー:', err);
  if (err.code === 'EADDRINUSE') {
    console.log('🔄 ポート競合発生、プロセスを終了します');
    process.exit(1);
  }
});



// グレースフルシャットダウン
const gracefulShutdown = () => {
  console.log('🔄 Graceful shutdown initiated...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);

// ✅ 正常性チェック用エンドポイントを追加
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
