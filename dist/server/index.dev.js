import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
// Emergency Assistance Development Server
// Version: 1.0.0-dev
// Last Updated: 2024-12-19
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 開発環境用の.envファイルを優先的に読み込み
dotenv.config({ path: path.resolve(process.cwd(), 'env.development.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// 開発環境用のデフォルト環境変数設定
if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'dev-mock-key';
    console.log('[DEV] OpenAI API key not set, using mock key for development');
}
// 環境変数の読み込み確認
console.log("[DEV] Development environment variables loaded:", {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    VITE_PORT: process.env.VITE_PORT,
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
    SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
    DEV_MODE: process.env.DEV_MODE,
    PWD: process.cwd(),
    __dirname: __dirname
});
console.log("[DEV] Development server starting...");
const app = express();
const PORT = Number(process.env.PORT) || 3002;
const isDevelopment = process.env.NODE_ENV === 'development';
// 開発環境用のCORS設定
const corsOptions = {
    origin: [
        'http://localhost:5002', // 開発用クライアント
        'http://localhost:5003', // HMR
        'http://127.0.0.1:5002',
        'http://127.0.0.1:5003'
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
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // 開発時は緩め
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
// 開発環境用のセッション設定
import session from 'express-session';
import { storage } from './storage.js';
const sessionSettings = {
    secret: process.env.SESSION_SECRET || "dev-local-secret",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
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
// 開発環境用のヘルスチェック（routes/index.tsのヘルスチェックをオーバーライド）
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: 'development',
        timestamp: new Date().toISOString(),
        port: PORT,
        processId: process.pid,
        version: '1.0.0-dev',
        debug: {
            nodeEnv: process.env.NODE_ENV,
            databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
            sessionSecret: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
            devMode: process.env.DEV_MODE,
            requestOrigin: req.headers.origin,
            requestHost: req.headers.host
        }
    });
});
// 開発環境用のデバッグエンドポイント
app.get('/api/dev/debug', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        environment: 'development',
        session: {
            exists: !!req.session,
            userId: req.session?.userId,
            userRole: req.session?.userRole,
            sessionId: req.sessionID
        },
        env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            VITE_PORT: process.env.VITE_PORT,
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
            SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
            DEV_MODE: process.env.DEV_MODE,
            ENABLE_DEBUG_LOGS: process.env.ENABLE_DEBUG_LOGS
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        }
    });
});
// ルートの読み込み
import { registerRoutes } from './routes/index.js';
registerRoutes(app);
// 開発環境用のエラーハンドリング
app.use((err, req, res, next) => {
    console.error('[DEV] Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
});
// 開発環境用の404ハンドリング
app.use('*', (req, res) => {
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
app.listen(PORT, () => {
    console.log(`🚀 [DEV] Development server running on http://localhost:${PORT}`);
    console.log(`🔧 [DEV] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 [DEV] Health check: http://localhost:${PORT}/api/health`);
    console.log(`🐛 [DEV] Debug endpoint: http://localhost:${PORT}/api/dev/debug`);
});
