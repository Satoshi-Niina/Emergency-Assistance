import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import detect from 'detect-port';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[INFO] Server starting...");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// プロセス終了時のクリーンアップ
let server: any = null;

const gracefulShutdown = () => {
  console.log('🔄 Graceful shutdown initiated...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // nodemon対応

// 動的ポート検出機能（detect-port使用）
const findAvailablePort = async (preferredPort: number = 3001): Promise<number> => {
  try {
    const port = await detect(preferredPort);
    if (port !== preferredPort) {
      console.log(`⚠️ ポート ${preferredPort} は使用中、代替ポート ${port} を使用します`);
    } else {
      console.log(`✅ 希望ポート ${port} が利用可能です`);
    }
    return port;
  } catch (error) {
    console.error('❌ ポート検出エラー:', error);
    throw error;
  }
};

// 既存プロセスの終了機能
const killExistingProcesses = async () => {
  const { spawn } = await import('child_process');

  try {
    console.log('🔄 既存プロセスをクリーンアップ中...');

    // Node.jsプロセスを終了
    const killNode = spawn('pkill', ['-f', 'tsx.*server/index.ts'], {
      stdio: 'ignore'
    });

    await new Promise((resolve) => {
      killNode.on('close', resolve);
      setTimeout(resolve, 2000); // タイムアウト
    });

    // Viteプロセスを終了  
    const killVite = spawn('pkill', ['-f', 'vite'], {
      stdio: 'ignore'
    });

    await new Promise((resolve) => {
      killVite.on('close', resolve);
      setTimeout(resolve, 1000);
    });

    console.log('✅ プロセスクリーンアップ完了');
  } catch (error) {
    console.log('⚠️ プロセスクリーンアップ警告:', error);
  }
};

// サーバー起動処理
const startServer = async () => {
  console.log('🚀 ===== STARTING BACKEND SERVER =====');

  try {
    // 既存プロセスをクリーンアップ
    await killExistingProcesses();

    // 動的ポート取得
    const PORT = await findAvailablePort(3001);

    // 基本的なヘルスチェックエンドポイント
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        dynamicPort: true,
        processId: process.pid
      });
    });

    console.log('✅ 基本設定完了');

    // 静的ファイル設定
    try {
      app.use(express.static(path.join(process.cwd(), 'client', 'dist')));
      app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
      console.log('✅ 静的ファイル設定完了');
    } catch (staticError) {
      console.error('❌ 静的ファイル設定エラー:', staticError);
    }

    // エラーハンドラー
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ message: err.message || 'Internal Server Error' });
    });

    // サーバー起動
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ===== BACKEND SERVER READY =====');
      console.log(`✅ バックエンドサーバー起動: http://0.0.0.0:${PORT}`);
      console.log(`🌐 フロントエンド想定: http://localhost:5000`);
      console.log(`📡 ヘルスチェック: http://localhost:${PORT}/api/health`);
      console.log(`🔧 動的ポート: ${PORT} (プロセスID: ${process.pid})`);
      console.log('🚀 ===== BACKEND SERVER READY =====');

      // 環境変数を更新
      process.env.BACKEND_PORT = PORT.toString();
      process.env.SERVER_PID = process.pid.toString();
    });

    server.on('error', (err: any) => {
      console.error('❌ サーバーエラー:', err);
      if (err.code === 'EADDRINUSE') {
        console.log('🔄 ポート競合発生、プロセスを終了します');
        process.exit(1);
      }
    });

    // 遅延ルート登録
    setTimeout(async () => {
      try {
        console.log('📡 ルート登録開始...');
        const { registerRoutes } = await import('./routes.js');
        const { storage } = await import('./storage.js');

        app.locals.storage = storage;
        await registerRoutes(app);
        console.log('✅ ルート登録完了');
      } catch (routeError) {
        console.error('❌ ルート登録エラー:', routeError);
      }
    }, 1000);

  } catch (err) {
    console.error('❌ サーバー起動失敗:', err);
    console.error('スタックトレース:', err instanceof Error ? err.stack : err);
    process.exit(1);
  }
};

startServer();