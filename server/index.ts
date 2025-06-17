
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import net from 'net';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[INFO] Server starting...");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 動的ポート検出機能
const findAvailablePort = async (startPort: number = 3001, maxAttempts: number = 50): Promise<number> => {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;

    const tryPort = (port: number) => {
      const server = net.createServer();
      
      server.listen(port, '0.0.0.0', () => {
        server.once('close', () => {
          console.log(`✅ 利用可能ポート発見: ${port}`);
          resolve(port);
        });
        server.close();
      });

      server.on('error', (err: any) => {
        attempts++;
        if (err.code === 'EADDRINUSE') {
          console.log(`❌ ポート ${port} は使用中 (試行 ${attempts}/${maxAttempts})`);
          if (attempts < maxAttempts) {
            // 次のポートを試す（範囲を広げる）
            const nextPort = startPort + attempts + Math.floor(Math.random() * 100);
            setTimeout(() => tryPort(nextPort), 100);
          } else {
            reject(new Error(`利用可能なポートが見つかりません (${startPort}-${startPort + maxAttempts})`));
          }
        } else {
          reject(err);
        }
      });
    };

    tryPort(currentPort);
  });
};

// 使用中ポートをクリーンアップする関数
const killPortProcesses = async (ports: number[]) => {
  const { spawn } = await import('child_process');
  
  for (const port of ports) {
    try {
      console.log(`🔄 ポート ${port} のプロセスを終了中...`);
      
      // Linux/Unix系でのポート使用プロセス終了
      const killProcess = spawn('fuser', ['-k', `${port}/tcp`], {
        stdio: 'ignore'
      });
      
      await new Promise((resolve) => {
        killProcess.on('close', resolve);
        setTimeout(resolve, 1000); // タイムアウト
      });
      
      console.log(`✅ ポート ${port} のプロセスを終了しました`);
    } catch (error) {
      console.log(`⚠️ ポート ${port} のプロセス終了に失敗: ${error}`);
    }
  }
};

// シンプルな初期化処理
const startServer = async () => {
  console.log('🚀 ===== STARTING BACKEND SERVER =====');
  
  try {
    // ポート競合時の自動クリーンアップ
    const conflictPorts = [3001, 5000, 8000, 8080];
    await killPortProcesses(conflictPorts);
    
    // 動的ポート取得
    const PORT = await findAvailablePort(3001);
    
    // 基本的なヘルスチェックエンドポイントを最初に設定
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        dynamicPort: true
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

    // データベースとストレージの初期化を後回しにして、まずサーバーを起動
    console.log('📡 ルート登録をスキップしてサーバー起動...');

    // エラーハンドラー
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ message: err.message || 'Internal Server Error' });
    });

    // HTTPサーバーを直接作成（リトライ機能付き）
    let server;
    let serverStarted = false;
    let retryCount = 0;
    const maxRetries = 3;

    const startServerWithRetry = async (port: number) => {
      return new Promise((resolve, reject) => {
        server = app.listen(port, '0.0.0.0', () => {
          console.log('🚀 ===== BACKEND SERVER READY =====');
          console.log(`✅ バックエンドサーバー起動: http://0.0.0.0:${port}`);
          console.log(`🌐 フロントエンド: http://localhost:5000`);
          console.log(`📡 API endpoints: /api/health`);
          console.log(`🔧 動的ポート: ${port} (自動選択)`);
          console.log('🚀 ===== BACKEND SERVER READY =====');
          
          // 環境変数を更新（他のプロセスが参照できるように）
          process.env.BACKEND_PORT = port.toString();
          
          serverStarted = true;
          resolve(server);
        });

        server.on('error', async (err: any) => {
          console.error('❌ サーバーエラー:', err);
          if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 ポート競合発生、別ポートで再試行 (${retryCount}/${maxRetries})`);
            
            try {
              // 新しいポートを探す
              const newPort = await findAvailablePort(port + 1);
              setTimeout(() => {
                startServerWithRetry(newPort).then(resolve).catch(reject);
              }, 1000);
            } catch (error) {
              reject(error);
            }
          } else {
            console.error(`❌ サーバー起動失敗 (試行回数: ${retryCount})`);
            reject(err);
          }
        });
      });
    };

    try {
      await startServerWithRetry(PORT);
    } catch (error) {
      console.error('❌ サーバー起動に完全に失敗:', error);
      process.exit(1);
    }

    // 遅延ルート登録（サーバー起動後）
    setTimeout(async () => {
      try {
        console.log('📡 遅延ルート登録開始...');
        const { registerRoutes } = await import('./routes.js');
        const { storage } = await import('./storage.js');
        
        app.locals.storage = storage;
        await registerRoutes(app);
        console.log('✅ 遅延ルート登録完了');
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
