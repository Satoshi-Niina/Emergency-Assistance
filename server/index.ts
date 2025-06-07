import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { initializeKnowledgeBase } from "./lib/knowledge-base";
import fs from "fs";
import axios from "axios";
import { storage } from "./storage";
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { runCleanup } from '../scripts/scheduled-cleanup.js';
import { fileURLToPath } from 'url';
import open from 'open';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み（複数箇所から）
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 環境変数の確認（Replitシークレットも含む）
const openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
console.log("[DEBUG] OpenAI API KEY exists:", openaiKey ? "YES" : "NO");
if (openaiKey) {
  console.log("[DEBUG] OpenAI API KEY prefix:", openaiKey.substring(0, 10) + "...");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory
app.use('/static', express.static(path.join(process.cwd(), 'public')));

// 知識ベースディレクトリへのアクセスを一元化
app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
app.use('/knowledge-base/json', express.static(path.join(process.cwd(), 'knowledge-base', 'json')));
app.use('/knowledge-base/media', express.static(path.join(process.cwd(), 'knowledge-base', 'media')));

// 完全に/knowledge-baseに一元化、/uploadsへのリクエストを全て/knowledge-baseに転送
app.use('/uploads/:dir', (req, res) => {
  const dir = req.params.dir;
  // 許可されたディレクトリのみリダイレクト
  if (['images', 'data', 'json', 'media', 'ppt'].includes(dir)) {
    const redirectPath = `/knowledge-base/${dir}${req.path}`;
    console.log(`リダイレクト: ${req.path} -> ${redirectPath}`);
    res.redirect(redirectPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Add a test route to serve our HTML test page
app.get('/test', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'api-test.html'));
});

// ネットワーク診断エンドポイントを追加
app.get('/api/network-test', (req, res) => {
  const networkInfo = {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    status: 'connected'
  };
  
  console.log('ネットワークテスト実行:', networkInfo);
  res.json(networkInfo);
});

// Minimal request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
});

// ブラウザを開く関数
async function openBrowser(url: string) {
  try {
    await open(url);
  } catch (e) {
    console.log('ブラウザを自動で開けませんでした:', e);
  }
}

(async () => {
  try {
    // 初期化
    app.locals.storage = storage;

    // データベース接続テスト
    try {
      const { db } = await import('./db');
      await db.execute('SELECT 1');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      // データベース接続失敗時もサーバーを起動
    }

    initializeKnowledgeBase();

    // 必要なディレクトリを作成
    const dirs = ['knowledge-base/images', 'knowledge-base/json', 'knowledge-base/data', 'knowledge-base/media', 'knowledge-base/ppt'];
    dirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // バックグラウンドで同期実行
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:5000/api/tech-support/sync-knowledge-base?direction=uploads-to-kb');
      } catch (err) {
        // エラーは無視
      }
    }, 3000);
  } catch (err) {
    console.error('知識ベースの初期化中にエラーが発生しました:', err);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  const startServer = (portToUse: number) => {
    server.listen(portToUse, '0.0.0.0', async () => {
      const serverUrl = `http://0.0.0.0:${portToUse}`;
      console.log(`サーバー起動: ${serverUrl}`);
      console.log(`外部アクセス用URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
      try {
        // Replitの場合は外部URLでブラウザを開く
        const externalUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev` || `http://localhost:${portToUse}`;
        await openBrowser(externalUrl);
      } catch (e) {
        // ブラウザオープンエラーは無視
      }
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        startServer(portToUse + 1);
      } else {
        console.error('サーバーエラー:', err.message);
      }
    });
  };

  startServer(port);

  // プロセス終了時のクリーンアップ
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  // 未処理のPromise拒否をキャッチ
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
  });
})();