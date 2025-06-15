import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";
import { storage } from "./storage.js";

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の確認
console.log("[INFO] Server starting...");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// シンプルな初期化処理
const startServer = async () => {
  console.log('🚀 ===== STARTING BACKEND SERVER =====');
  
  try {
    // 基本設定
    app.locals.storage = storage;
    
    // 必要なディレクトリを作成
    const dirs = ['knowledge-base/images', 'knowledge-base/data', 'knowledge-base/troubleshooting'];
    dirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // ルート登録
    await registerRoutes(app);

    // 静的ファイル設定
    app.use(express.static(path.join(process.cwd(), 'client', 'dist')));
    app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));

    // エラーハンドラー
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ message: err.message || 'Internal Server Error' });
    });

    const PORT = process.env.PORT || 3001;

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ===== BACKEND SERVER READY =====');
      console.log(`✅ バックエンドサーバー起動: http://0.0.0.0:${PORT}`);
      console.log(`🌐 フロントエンド: http://localhost:5000`);
      console.log(`📡 API endpoints: /api/health, /api/status`);
      console.log('🚀 ===== BACKEND SERVER READY =====');
    });

    // プロセス終了時の処理
    process.on('SIGTERM', () => {
      console.log('SIGTERM受信、サーバーを終了します');
      server.close(() => {
        console.log('サーバーが正常に終了しました');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT受信、サーバーを終了します');
      server.close(() => {
        console.log('サーバーが正常に終了しました');
        process.exit(0);
      });
    });

    server.on('error', (err: any) => {
      console.error('❌ サーバーエラー:', err);
      process.exit(1);
    });

    // 知識ベース初期化（非同期）
    setTimeout(async () => {
      try {
        const { initializeKnowledgeBase } = await import('./lib/knowledge-base.js');
        await initializeKnowledgeBase();
        console.log('✅ ナレッジベース初期化完了');
      } catch (err) {
        console.warn('⚠️ ナレッジベース初期化失敗:', err);
      }
    }, 2000);

  } catch (err) {
    console.error('❌ サーバー起動失敗:', err);
    process.exit(1);
  }
};

startServer();