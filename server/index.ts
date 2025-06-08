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
// CORS設定を強化
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://replit.com',
    'https://*.replit.dev',
    'https://*.replit.app',
    process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev` : null
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.match(allowed?.replace('*', '.*')))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Custom-Header');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// セキュリティヘッダーを追加
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 統一されたヘルスチェックエンドポイント
const healthStatus = () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  knowledgeBase: knowledgeBaseReady ? 'ready' : 'initializing',
  version: '1.0.0'
});

// デプロイメント用の即座応答エンドポイント（処理時間最小化）
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', (req, res) => {
  res.status(200).json(healthStatus());
});

// Root endpoint - プロダクションではアプリケーション、開発では API
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // プロダクションでは静的配信に任せる
    return;
  } else {
    // 開発環境では API レスポンス
    res.status(200).json(healthStatus());
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

// ポート設定の最適化（Replitデプロイ対応）
const port = process.env.PORT ? parseInt(process.env.PORT) : 
             process.env.REPLIT_DEV_DOMAIN ? 5000 : 3000;

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
      // プロダクション用の静的ファイル配信
      const distPath = path.join(process.cwd(), 'client', 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          // API リクエストは除外
          if (req.path.startsWith('/api/') || req.path.startsWith('/knowledge-base/')) {
            return next();
          }
          // その他は index.html を返す
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).json({ error: 'Application not built' });
          }
        });
        secureLog('プロダクション用静的ファイル配信を設定しました');
      } else {
        console.error('ビルドファイルが見つかりません:', distPath);
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api/')) {
            return;
          }
          res.status(503).json({ error: 'Application building...' });
        });
      }
    } catch (staticError) {
      console.error('静的ファイル配信の設定エラー:', staticError);
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return;
        }
        res.status(500).json({ error: 'Server configuration error' });
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
      if (reason && typeof reason === 'object' && 
          (reason.toString().includes('ECONNRESET') || 
           reason.toString().includes('EPIPE') ||
           reason.toString().includes('ENOTFOUND'))) {
        // 一般的なネットワークエラーは無視
        return;
      }
      console.error('Critical Error:', reason);
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