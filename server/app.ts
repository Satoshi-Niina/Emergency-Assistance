import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import MemoryStore from 'memorystore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

export async function createApp() {
  console.log("[INFO] Creating Express application...");

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // CORS設定
  const corsOptions = {
    origin: isProduction 
      ? [
          process.env.FRONTEND_URL || 'https://emergency-assistance-app.azurestaticapps.net',
          'https://*.azurestaticapps.net', // Azure Static Web Appsのワイルドカード
          'https://*.azurewebsites.net', // Azure Web Appsのワイルドカード
          'https://emergency-assistance-app.azurestaticapps.net', // 具体的なドメイン
        ]
      : [
          process.env.FRONTEND_URL || 'http://localhost:5001',
          'http://localhost:5000', 
          'http://localhost:5173', 
          'https://*.replit.dev'
        ],
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
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'emergency-recovery-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24時間でクリーンアップ
    }),
    cookie: {
      secure: isProduction, // 本番環境ではHTTPS必須
      httpOnly: true,
      maxAge: 86400000, // 24時間
      sameSite: isProduction ? 'none' : 'lax', // 本番環境ではcross-site cookieを許可
      domain: isProduction ? undefined : undefined // 本番環境ではドメイン制限なし
    }
  }));

  // ヘルスチェックエンドポイント
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid,
      version: process.env.npm_package_version || '1.0.0',
      cors: {
        origin: corsOptions.origin,
        credentials: corsOptions.credentials
      }
    });
  });

  // 本番環境での静的ファイル配信
  if (isProduction) {
    // クライアントのビルドファイルを配信
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    // SPAのルーティング対応
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
      }
    });
  }

  // 静的ファイル設定
  try {
    app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
    app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
    app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
    console.log('✅ 静的ファイル設定完了');
  } catch (staticError) {
    console.error('❌ 静的ファイル設定エラー:', staticError);
  }

  // エラーハンドラー
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      message: isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  return app;
} 