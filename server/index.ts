
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[INFO] Server starting...");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// シンプルな初期化処理
const startServer = async () => {
  console.log('🚀 ===== STARTING BACKEND SERVER =====');
  
  try {
    // 基本的なヘルスチェックエンドポイントを最初に設定
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3001
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

    const PORT = 3001; // ポートを3001に固定

    // HTTPサーバーを直接作成
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ===== BACKEND SERVER READY =====');
      console.log(`✅ バックエンドサーバー起動: http://0.0.0.0:${PORT}`);
      console.log(`🌐 フロントエンド: http://localhost:5000`);
      console.log(`📡 API endpoints: /api/health`);
      console.log('🚀 ===== BACKEND SERVER READY =====');
    });

    server.on('error', (err: any) => {
      console.error('❌ サーバーエラー:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`ポート ${PORT} は既に使用されています`);
        process.exit(1);
      }
      process.exit(1);
    });

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
