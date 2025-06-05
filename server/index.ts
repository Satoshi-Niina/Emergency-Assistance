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
    
    // Knowledge base initialization - don't block on failure
    try {
      initializeKnowledgeBase();
      console.log('Knowledge base initialized successfully');
    } catch (initError) {
      console.warn('Knowledge base initialization failed, continuing...');
    }

    // Database connection check - with graceful fallback
    try {
      const { checkDatabaseConnection } = await import('./db.js');
      const dbConnected = await checkDatabaseConnection();
      if (dbConnected) {
        console.log('Database connection verified');
      } else {
        console.warn('Database connection failed, continuing without DB features');
        // サーバーは継続して起動（DB無しでも動作するように）
      }
    } catch (dbError) {
      console.warn('Database initialization error, continuing with limited functionality:', dbError.message);
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

  const httpServer = await registerRoutes(app);
  server = httpServer; // グローバル変数に保存

  // グローバルエラーハンドラー（必ずレスポンスを返す）
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // エラーログ出力
    console.error(`Error ${status} on ${req.method} ${req.url}:`, message);
    if (err.stack) {
      console.error('Stack trace:', err.stack);
    }

    // 必ずレスポンスを返す（エラーでプロセスを停止させない）
    if (!res.headersSent) {
      res.status(status).json({ 
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // 404ハンドラー
  app.use((req: Request, res: Response) => {
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.url
      });
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

  // サーバー起動
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server ready on port ${port}`);
  }).on('error', (err: NodeJS.ErrnoException) => {
    console.error('Server startup error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
      process.exit(1);
    }
  });
})();

// プロセス終了処理を安全にする
let isShuttingDown = false;
let server: any = null;
let shutdownTimeout: NodeJS.Timeout | null = null;

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  // 強制終了タイムアウトを設定（10秒）
  shutdownTimeout = setTimeout(() => {
    console.error('Force shutdown due to timeout');
    process.exit(1);
  }, 10000);
  
  // サーバーを閉じる
  if (server) {
    server.close((err: any) => {
      if (shutdownTimeout) clearTimeout(shutdownTimeout);
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      } else {
        console.log('Server closed gracefully');
        process.exit(0);
      }
    });
  } else {
    if (shutdownTimeout) clearTimeout(shutdownTimeout);
    process.exit(0);
  }
};

// プロセス終了シグナルのハンドリング
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕獲例外のハンドリング - ログ出力後に安全に終了
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error('Stack trace:', error.stack);
  
  // グレースフルシャットダウンを試行
  if (!isShuttingDown) {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // ログのみ出力（プロセスは継続）
  // 重大なエラーの場合のみシャットダウンを検討
});