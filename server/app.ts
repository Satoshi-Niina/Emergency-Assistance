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

// .envファイル複数箇所から読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

export async function createApp() {
  console.log("[INFO] Creating Express application...");

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // ✅ CORS対応（Azure Static Web Apps からのアクセスを許可）
  const corsOptions = {
    origin: [
      'https://jolly-smoke-0f2bcb800.2.azurestaticapps.net',
      process.env.FRONTEND_URL || 'https://emergency-assistance-app.azurestaticapps.net'
    ],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // JSON・URLエンコード
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ セッション設定
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    store: new (MemoryStore(session))({ checkPeriod: 86400000 }), // 1日
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      httpOnly: true,
    }
  }));

  // ✅ 簡易ログ
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[INFO] Request: ${req.method} ${req.url}`);
    next();
  });

  // ✅ ルーティング
  const router = (await import('./routes.js')).default;
  app.use('/api', router);

  // ✅ ヘルスチェック
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
