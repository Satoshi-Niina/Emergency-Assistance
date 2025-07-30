
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

// 開発環境用の.envファイルを優先的に読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 開発環境用のデフォルト環境変数設定
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-jwt-secret-key-for-development-only';
  console.log('[DEV] JWT_SECRET not set, using development default');
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'dev-session-secret-for-development-only';
  console.log('[DEV] SESSION_SECRET not set, using development default');
}

// 環境変数の読み込み確認
console.log("[DEV] Development environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  PWD: process.cwd(),
  __dirname: __dirname
});

console.log("[DEV] Development server starting...");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// 開発環境用のCORS設定
const corsOptions = {
  origin: [
    'http://localhost:5001',
    'http://localhost:3001', 
    'http://127.0.0.1:5001',
    'http://127.0.0.1:3001',
    /^https:\/\/.*\.replit\.dev$/,
    /^https:\/\/.*\.replit\.dev:3001$/
  ],
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 開発環境用のセッション設定
import session from 'express-session';

const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-local-secret",
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false, // 開発環境ではHTTPS不要
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'emergency-dev-session'
};

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

// 開発環境用のヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: 'development',
    timestamp: new Date().toISOString(),
    port: PORT,
    processId: process.pid,
    version: '1.0.0-dev'
  });
});

// ルートの読み込み
import { registerRoutes } from './routes/index.js';
registerRoutes(app);

// 開発環境用のエラーハンドリング
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[DEV] Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// 開発環境用の404ハンドリング
app.use('*', (req: Request, res: Response) => {
  console.log('[DEV] 404 Not Found:', req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
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
});
