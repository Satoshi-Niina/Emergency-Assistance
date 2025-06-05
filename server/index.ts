import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { initializeKnowledgeBase } from "./lib/knowledge-base";
import fs from "fs";
import axios from "axios";
import { storage } from "./storage";
import dotenv from 'dotenv';
import { runCleanup } from '../scripts/scheduled-cleanup.js';
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み
try {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
} catch (envError) {
  // Silent env loading error
}

// 環境変数の安全な確認
const requiredEnvVars = ['OPENAI_API_KEY', 'SESSION_SECRET'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    // Silent env var warning
  }
});

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

// Silent request logging
app.use((req, res, next) => {
  // Silent API request handling
  next();
});



(async () => {
  try {
    // Initialize application
    app.locals.storage = storage;
    try {
      initializeKnowledgeBase();
    } catch (initError) {
      // Silent initialization
    }

    // Test database connection with retry logic
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!dbConnected && retryCount < maxRetries) {
      try {
        const { checkDatabaseConnection } = await import('./db.js');
        dbConnected = await checkDatabaseConnection();
        if (!dbConnected) {
          retryCount++;
          // Silent retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (dbError) {
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!dbConnected) {
      // データベース接続失敗でもサーバーは起動する
      // Silent database warning
    }

    // Create required directories
    const dirs = [
      'knowledge-base/images',
      'knowledge-base/json', 
      'knowledge-base/data',
      'knowledge-base/media',
      'knowledge-base/ppt'
    ];

    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Sync uploads to knowledge-base (silent)
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:5000/api/tech-support/sync-knowledge-base?direction=uploads-to-kb');
      } catch (syncErr) {
        // Silent sync - no console output
      }
    }, 3000);
  } catch (err) {
    // Silent knowledge base initialization error
  }

  const server = await registerRoutes(app);

  // グローバルエラーハンドラー（必ずレスポンスを返す）
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // データベース接続エラーの場合
    if (err.code === '57P01' || err.message?.includes('terminating connection due to administrator command')) {
      message = "Database connection was reset. Please try again.";
    } else if (err.code === 'ECONNRESET' || err.message?.includes('connection') || err.severity === 'FATAL') {
      message = "Database connection error. Please try again.";
    }

    // 必ずレスポンスを返す（エラーでプロセスを停止させない）
    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    // エラーログは最小限に
    if (status >= 500) {
      // Silent server error handling
    }
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

  // ポート衝突時に再試行する
  const startServer = (portToTry: number, retries = 3): void => {
    server.listen(portToTry, '0.0.0.0', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Server ready on port ${portToTry}`);
      }
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retries > 0) {
        // ポートが使用中の場合、少し待ってから再試行
        setTimeout(() => {
          startServer(portToTry, retries - 1);
        }, 2000);
      } else if (err.code === 'EADDRINUSE') {
        // 再試行回数が尽きた場合は終了
        process.exit(1);
      } else {
        // その他のエラーは無視してサーバー継続
      }
    });
  };

  startServer(port);
})();

// プロセス終了処理を安全にする
let isShuttingDown = false;

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  // Silent graceful shutdown
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕獲例外でもプロセスを即座に終了させない
process.on('uncaughtException', (error) => {
  if (!isShuttingDown) {
    // Silent error handling - don't crash immediately
    setTimeout(() => {
      if (!isShuttingDown) {
        gracefulShutdown('uncaughtException');
      }
    }, 500);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  if (!isShuttingDown) {
    // Silent error handling - don't crash immediately
    setTimeout(() => {
      if (!isShuttingDown) {
        gracefulShutdown('unhandledRejection');
      }
    }, 500);
  }
});