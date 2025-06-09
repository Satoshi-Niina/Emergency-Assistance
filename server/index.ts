import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { db } from './db';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://*.replit.dev', 'https://*.repl.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'emergency-recovery-system-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  name: 'emergency.session',
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'lax'
  }
}));

// ここでAPIルートを先に登録
(async () => {
  try {
    // ルート登録
    await registerRoutes(app);

    // knowledge-base静的ファイル配信
    const knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
    app.use('/knowledge-base', express.static(knowledgeBasePath));

    // 静的ファイル配信
    const distPath = path.resolve(__dirname, '../client/dist');
    app.use(express.static(distPath));

    // SPAルーティング（APIルート以外は全てindex.htmlを返す）
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: npm run build:client</p>');
      }
    });

    // エラーハンドリング
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('初期化エラー:', err);
  }
})();