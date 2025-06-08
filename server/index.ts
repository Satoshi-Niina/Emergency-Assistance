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
import { logDebug, logInfo, logWarn, logError, showLogConfig } from './lib/logger';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み（複数箇所から）
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 環境変数の確認（Replitシークレットも含む）
const openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
// セキュリティのためAPIキー情報のログ出力を削除

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
    status: 'connected'
  };

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
    logDebug('ブラウザを自動で開けませんでした:', e);
  }
}

(async () => {
  try {
    // 初期化
    app.locals.storage = storage;

    // データベース接続テスト（リトライ機能付き）
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!dbConnected && retryCount < maxRetries) {
      try {
        const { db } = await import('./db');
        await db.execute('SELECT 1');
        logInfo('Database connection successful');
        dbConnected = true;
      } catch (dbError) {
        retryCount++;
        logWarn(`Database connection failed (attempt ${retryCount}/${maxRetries})`);

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          logWarn('Database connection failed. Server will start without database.');
        }
      }
    }

    logDebug('知識ベースの初期化を開始...');
    logDebug('Knowledge base directories initialized');
    logDebug('知識ベースの初期化が完了しました');

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
    logError('知識ベースの初期化中にエラーが発生しました:', err);
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
      logInfo(`サーバー起動: ポート ${portToUse}`);
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        logInfo(`外部URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
      }

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
        logError('サーバーエラー:', err.message);
      }
    });
  };

  startServer(port);

  // プロセス終了時のクリーンアップ
  process.on('SIGTERM', () => {
    logInfo('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logInfo('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    logInfo('SIGINT signal received: closing HTTP server');
    server.close(() => {
      logInfo('HTTP server closed');
    });
  });

  // 未処理のPromise拒否をキャッチ
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception thrown:', error);
    process.exit(1);
  });
})();