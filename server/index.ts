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

// セキュアログ関数
function secureLog(msg: string, ...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(msg, ...args);
  }
}

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
  res.status(200).send('OK');
});

app.get('/ready', (req, res) => {
  if (knowledgeBaseReady) {
    res.status(200).json({ status: 'ready', knowledgeBase: 'initialized' });
  } else {
    res.status(200).json({ status: 'ready', knowledgeBase: 'initializing' });
  }
});

// Root endpoint always available for deployment health checks
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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

// プロダクション環境用のリクエストロギング
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'production') {
        // プロダクションでは重要なエラーのみログ
        if (res.statusCode >= 500) {
          console.error(`[ERROR] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      } else if (res.statusCode >= 400) {
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

// ポート設定の最適化
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

(async () => {
  // 初期化
  app.locals.storage = storage;
  
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
      secureLog('静的ファイル配信を設定しました');
    } catch (staticError) {
      console.error('静的ファイル配信の設定エラー:', staticError);
      // Minimal fallback for production
      app.get('*', (req, res) => {
        res.status(200).send('Server running');
      });
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${port}`);
    secureLog(`サーバー起動: ポート ${port} (環境: ${process.env.NODE_ENV || 'development'})`);
    
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      secureLog(`外部URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
    }
    
    // プロダクション環境でのヘルスチェック
    if (process.env.NODE_ENV === 'production') {
      console.log('Production server started successfully');
      console.log(`Health endpoints: /health, /ready`);
    }
    
    // 軽量な初期化のみ実行
    if (process.env.NODE_ENV !== 'production') {
      initializePostStartup();
    } else {
      // プロダクション環境では非同期で初期化
      initializePostStartup();
    }
  }).on('error', (err: NodeJS.ErrnoException) => {
    console.error('サーバー起動エラー:', {
      message: err.message,
      code: err.code,
      port: port,
      environment: process.env.NODE_ENV
    });
    
    if (err.code === 'EADDRINUSE') {
      console.error(`ポート ${port} は既に使用されています`);
    }
    
    process.exit(1);
  });

  // プロセス終了時のクリーンアップ
  process.on('SIGTERM', () => {
    secureLog('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      secureLog('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    secureLog('SIGINT signal received: closing HTTP server');
    server.close(() => {
      secureLog('HTTP server closed');
    });
  });

  // 未処理のPromise拒否をキャッチ
  process.on('unhandledRejection', (reason, promise) => {
    if (process.env.NODE_ENV === 'production') {
      // プロダクションでは重要なエラーのみログ出力
      if (reason && typeof reason === 'object' && reason.toString().includes('ECONNRESET')) {
        // 接続リセットエラーは無視（よくある問題）
        return;
      }
      console.error('Unhandled Rejection:', reason);
    } else {
      logError('Unhandled Rejection at:', promise, 'reason:', reason);
    }
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    // グレースフルシャットダウンを試行
    if (server) {
      server.close(() => {
        process.exit(1);
      });
      setTimeout(() => process.exit(1), 5000);
    } else {
      process.exit(1);
    }
  });
})();

// 知識ベースの準備状況を追跡
let knowledgeBaseReady = false;
let initializationInProgress = false;

// 起動後初期化処理
async function initializePostStartup() {
  // 既に初期化中または完了している場合はスキップ
  if (initializationInProgress || knowledgeBaseReady) {
    console.log("知識ベース初期化: 既に実行中または完了済み");
    return;
  }
  
  initializationInProgress = true;
  
  // 初期化は非同期で実行し、ヘルスチェックをブロックしない
  setImmediate(async () => {
    try {
      console.log("知識ベースの初期化を開始...");
      await initializeKnowledgeBase();
      console.log("知識ベースの初期化完了");
      knowledgeBaseReady = true;
      initializationInProgress = false;
    } catch (err) {
      console.error("初期化時にエラーが発生:", err);
      initializationInProgress = false;
      // エラーが発生しても他の機能は継続
    }
  });
}