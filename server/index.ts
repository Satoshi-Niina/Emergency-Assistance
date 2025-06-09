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
import { WebSocketServer } from 'ws';
import cors from 'cors';

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
try {
  dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  console.log('✅ Environment files loaded');
} catch (error) {
  console.warn('⚠️  Failed to load .env files:', error instanceof Error ? error.message : error);
}

// Set NODE_ENV if not set - デプロイ時はproductionに設定
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.REPLIT_DEPLOYMENT ? 'production' : 'development';
}

console.log('🔧 Environment check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   CWD: ${process.cwd()}`);
console.log(`   __dirname: ${__dirname}`);

// 環境変数の確認（Replitシークレットも含む）
const openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
// セキュリティのためAPIキー情報のログ出力を削除

// 強化されたプロセス重複防止システム
const PROCESS_LOCK_FILE = '/tmp/troubleshooting-server.lock';
const PROCESS_MARKER = `troubleshooting-server-${Date.now()}-${process.pid}`;
process.title = 'troubleshooting-server';

// グローバル初期化フラグ
const GLOBAL_INIT_FLAG = '__TROUBLESHOOTING_SERVER_INITIALIZED__';

// より厳密な重複初期化防止
if ((global as any)[GLOBAL_INIT_FLAG]) {
  console.log('⚠️ Server already initializing in this process, exiting...');
  process.exit(1);
}
(global as any)[GLOBAL_INIT_FLAG] = true;

// プロセス重複防止の強化
const processId = `${process.pid}-${Date.now()}`;
console.log(`🚀 Starting server process: ${processId}`);

// より強力なプロセス終了
const forceKillProcesses = () => {
  const commands = [
    'pkill -9 -f "tsx.*server/index.ts" 2>/dev/null || true',
    'pkill -9 -f "npm run dev" 2>/dev/null || true', 
    'pkill -9 -f "vite" 2>/dev/null || true',
    'pkill -9 -f "troubleshooting-server" 2>/dev/null || true',
    'fuser -k 5000/tcp 2>/dev/null || true',
    'fuser -k 5173/tcp 2>/dev/null || true'
  ];
  
  commands.forEach((cmd, index) => {
    setTimeout(() => {
      exec(cmd, () => {
        if (index === commands.length - 1) {
          console.log('All previous processes terminated');
        }
      });
    }, index * 500);
  });
};

forceKillProcesses();

// 追加の安全措置
process.on('uncaughtException', (error) => {
  if (error.message.includes('EADDRINUSE')) {
    console.log('Port already in use, terminating...');
    process.exit(1);
  }
  throw error;
});

// 既存プロセスの確認とクリーンアップ
const initializeProcessLock = async () => {
  try {
    console.log(`🔧 Initializing process lock (PID: ${process.pid})`);
    
    // 段階的なプロセス終了
    const killProcesses = () => new Promise<void>((resolve) => {
      const commands = [
        `pkill -15 -f "troubleshooting-server" 2>/dev/null || true`,
        `pkill -15 -f "vite" 2>/dev/null || true`,
        `sleep 3`,
        `pkill -9 -f "troubleshooting-server" 2>/dev/null || true`,
        `pkill -9 -f "tsx.*server/index.ts" 2>/dev/null || true`,
        `pkill -9 -f "npm run dev" 2>/dev/null || true`,
        `pkill -9 -f "vite" 2>/dev/null || true`,
        `fuser -k 5000/tcp 2>/dev/null || true`,
        `fuser -k 5173/tcp 2>/dev/null || true`,
        `fuser -k 5002/tcp 2>/dev/null || true`
      ];
      
      const executeCommand = (index: number) => {
        if (index >= commands.length) {
          resolve();
          return;
        }
        
        exec(commands[index], () => {
          setTimeout(() => executeCommand(index + 1), 300);
        });
      };
      
      executeCommand(0);
      setTimeout(resolve, 10000); // より長いタイムアウト
    });

    await killProcesses();
    
    // ロックファイル管理
    if (fs.existsSync(PROCESS_LOCK_FILE)) {
      try {
        const lockData = JSON.parse(fs.readFileSync(PROCESS_LOCK_FILE, 'utf8'));
        console.log(`🔍 Found existing lock: PID ${lockData.pid}, Age: ${Date.now() - lockData.startTime}ms`);
      } catch (e) {
        console.log(`🧹 Removing corrupted lock file`);
      }
      fs.unlinkSync(PROCESS_LOCK_FILE);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 新しいロックファイルを作成
    fs.writeFileSync(PROCESS_LOCK_FILE, JSON.stringify({
      pid: process.pid,
      marker: PROCESS_MARKER,
      startTime: Date.now(),
      node_env: process.env.NODE_ENV
    }));
    console.log(`🔒 Process lock acquired: PID ${process.pid}`);
  } catch (error) {
    console.error('Lock file management error:', error);
  }
};

await initializeProcessLock();

// Express設定
const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// プロセス終了時のクリーンアップ
const cleanup = (signal: string) => {
  console.log(`🛑 Cleanup initiated by ${signal} (PID: ${process.pid})`);
  try {
    // ロックファイルの内容を確認して、自分のプロセスかチェック
    if (fs.existsSync(PROCESS_LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(PROCESS_LOCK_FILE, 'utf8'));
      if (lockData.marker === PROCESS_MARKER || lockData.pid === process.pid) {
        fs.unlinkSync(PROCESS_LOCK_FILE);
        console.log(`🧹 Lock file cleaned up`);
      }
    }
  } catch (e) {
    // ロックファイルの削除エラーは無視
  }
  
  // 強制終了前に少し待機
  setTimeout(() => {
    process.exit(0);
  }, 500);
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('exit', () => cleanup('EXIT'));

// CORS設定
app.use(cors({
  origin: (origin, callback) => {
    // 開発環境では全てのoriginを許可
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('0.0.0.0') || 
        origin.includes('replit.dev') ||
        origin.includes('repl.co')) {
      callback(null, true);
    } else {
      callback(null, true); // 開発環境では全て許可
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
}));

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/ready', (req, res) => {
  res.status(200).json(healthStatus());
});

// Root endpoint - 開発環境でもViteの処理に委ねる
app.get('/', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // プロダクションでは静的配信に任せる
    return next();
  } else {
    // 開発環境ではViteに処理を委ねる
    return next();
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

console.log('🚀 Starting server initialization...');
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

(async () => {
  try {
    // 初期化
    console.log('📦 Initializing storage...');
    app.locals.storage = storage;

  console.log('🛣️  Registering routes...');
    const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup environment-specific routing
  if (process.env.NODE_ENV !== "production" && process.env.DISABLE_VITE !== 'true') {
    await setupVite(app, server);
  } else {
    // プロダクション用の静的ファイル配信 - 複数のパスをチェック
    const possibleDistPaths = [
      path.join(process.cwd(), 'client', 'dist'),
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), 'build')
    ];

    let distPath = '';
    for (const pathToCheck of possibleDistPaths) {
      if (fs.existsSync(pathToCheck)) {
        distPath = pathToCheck;
        console.log('Found dist path:', distPath);
        break;
      }
    }

    if (!distPath) {
      console.log('No dist path found. Checked:', possibleDistPaths);
    }

    // 診断用エンドポイントを追加
    app.get('/api/debug/files', (req, res) => {
      try {
        const distExists = fs.existsSync(distPath);
        const files = distExists ? fs.readdirSync(distPath) : [];
        const indexExists = fs.existsSync(path.join(distPath, 'index.html'));

        res.json({
          distPath,
          distExists,
          indexExists,
          files,
          cwd: process.cwd(),
          nodeEnv: process.env.NODE_ENV
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    if (distPath && fs.existsSync(distPath)) {
      // 静的ファイルの詳細ログ
      const distFiles = fs.readdirSync(distPath);
      console.log('Available dist files:', distFiles);

      app.use(express.static(distPath, { 
        index: false,
        setHeaders: (res, filePath) => {
          console.log('Serving static file:', filePath);
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        }
      }));

      // SPA routing - すべての非APIリクエストをindex.htmlに送る
      app.get('*', (req, res, next) => {
        // API と知識ベースのリクエストは除外
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/knowledge-base/') ||
            req.path.startsWith('/static/')) {
          console.log('Skipping SPA routing for:', req.path);
          return next();
        }

        const indexPath = path.join(distPath, 'index.html');
        console.log('Attempting to serve index.html for:', req.path, 'from:', indexPath);

        if (fs.existsSync(indexPath)) {
          console.log('Successfully serving index.html');
          res.sendFile(indexPath);
        } else {
          console.error('index.html not found at:', indexPath);
          console.error('Available files in dist:', fs.readdirSync(distPath));
          res.status(500).send(`
            <html>
              <body>
                <h1>Application Error</h1>
                <p>index.html not found</p>
                <p>Dist path: ${distPath}</p>
                <p>Available files: ${fs.readdirSync(distPath).join(', ')}</p>
              </body>
            </html>
          `);
        }
      });

      console.log('プロダクション用静的ファイル配信を設定しました');
    } else {
      console.error('ビルドファイルが見つかりません:', distPath);
      console.error('Current working directory:', process.cwd());
      console.error('Available directories:', fs.readdirSync(process.cwd()));

      // ビルドされていない場合の対応
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.status(503).send(`
          <html>
            <body>
              <h1>Application Not Built</h1>
              <p>The application has not been built for production.</p>
              <p>Expected build directory: ${distPath}</p>
              <p>Current directory: ${process.cwd()}</p>
              <p>Available directories: ${fs.readdirSync(process.cwd()).join(', ')}</p>
            </body>
          </html>
        `);
      });
    }
  }

  // ポート使用状況を事前チェック
  exec(`lsof -ti:${port}`, (error, stdout) => {
    if (stdout.trim()) {
      console.warn(`⚠️  Port ${port} is already in use by process ${stdout.trim()}`);
      console.log('Attempting to kill existing process...');
      exec(`kill -9 ${stdout.trim()}`, () => {
        startServer();
      });
    } else {
      startServer();
    }
  });

  function startServer() {
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Host: 0.0.0.0:${port}`);

      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        console.log(`External URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
      }

    // プロダクション環境でのヘルスチェック
      if (process.env.NODE_ENV === 'production') {
        console.log('Production server started successfully');
        console.log(`Health endpoints: /api/health, /api/ready`);
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
  }

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

  // 未処理のPromise拒否をキャッチ（簡略化）
  process.on('unhandledRejection', (reason, promise) => {
    // 一般的なネットワークエラーは無視
    if (reason && typeof reason === 'object') {
      const reasonStr = reason.toString();
      if (reasonStr.includes('ECONNRESET') || 
          reasonStr.includes('EPIPE') ||
          reasonStr.includes('ENOTFOUND') ||
          reasonStr.includes('socket hang up')) {
        return; // 無視
      }
    }
    // 重要なエラーのみログ出力
    console.error('Unhandled Rejection:', reason);
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
} catch (error) {
    console.error('❌ Server initialization failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
})().catch(error => {
  console.error('❌ Unhandled server startup error:', error);
  process.exit(1);
});

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