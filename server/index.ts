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

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// 環境変数の確認（Replitシークレットも含む）
const openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
// セキュリティのためAPIキー情報のログ出力を削除

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Immediate health check endpoints - minimal processing for deployment
app.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '5000'
    };
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/ready', (req, res) => {
  try {
    const readyStatus = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    res.status(200).json(readyStatus);
  } catch (error) {
    res.status(500).json({ status: 'not ready', error: error.message });
  }
});

// Root endpoint always available for deployment health checks
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'production'
    };
    res.status(200).json(status);
  } else {
    // Development environment - let Vite handle routing
    res.status(404).send('Development mode');
  }
});

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
  // 初期化
  app.locals.storage = storage;
  
  // Lazy load knowledge base initialization only when needed
  // Remove heavy initialization from startup for faster deployment

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup environment-specific routing
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
      logInfo('静的ファイル配信を設定しました');
    } catch (staticError) {
      logError('静的ファイル配信の設定エラー:', staticError);
      // Minimal fallback for production
      app.get('*', (req, res) => {
        res.status(200).send('Server running');
      });
    }
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    logInfo(`サーバー起動: ポート ${port} (環境: ${process.env.NODE_ENV || 'development'})`);
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      logInfo(`外部URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
    }
    
    // プロダクション環境でのヘルスチェック
    if (process.env.NODE_ENV === 'production') {
      console.log('Production server started successfully with health check endpoints');
      console.log(`Health check available at: http://0.0.0.0:${port}/health`);
      console.log(`Ready check available at: http://0.0.0.0:${port}/ready`);
    }
    
    // 開発環境でプロダクション設定をテストする場合
    if (process.env.TEST_PRODUCTION === 'true') {
      console.log('Testing production mode in development environment');
      console.log(`Test endpoints: /health, /ready, /`);
    }
  }).on('error', (err: NodeJS.ErrnoException) => {
    logError('サーバー起動エラー:', {
      message: err.message,
      code: err.code,
      port: port,
      environment: process.env.NODE_ENV
    });
    
    if (err.code === 'EADDRINUSE') {
      logError(`ポート ${port} は既に使用されています`);
    }
    
    process.exit(1);
  });

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