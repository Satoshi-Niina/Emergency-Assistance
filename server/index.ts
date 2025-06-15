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

// 初期化処理を簡素化
const initializeServer = async () => {
  try {
    console.log('[INFO] Server initialization starting...');
    
    // ストレージ設定
    app.locals.storage = storage;
    console.log('[INFO] Storage configured');

    // 必要なディレクトリを作成
    const dirs = [
      'knowledge-base/images',
      'knowledge-base/json', 
      'knowledge-base/data',
      'knowledge-base/troubleshooting'
    ];

    for (const dir of dirs) {
      try {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(`[INFO] Created directory: ${dir}`);
        }
      } catch (err) {
        console.warn(`[WARN] Failed to create directory ${dir}:`, err);
      }
    }

    // ルートを登録
    console.log('[INFO] Registering routes...');
    await registerRoutes(app);

    // 静的ファイルの配信設定
    app.use('/static', express.static(path.join(process.cwd(), 'public')));
    app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
    app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
    app.use('/knowledge-base/json', express.static(path.join(process.cwd(), 'knowledge-base', 'json')));
    app.use('/knowledge-base/media', express.static(path.join(process.cwd(), 'knowledge-base', 'media')));

    // クライアントのビルドファイルを配信（最後に配置）
    const clientDistPath = path.join(process.cwd(), 'client', 'dist');
    app.use(express.static(clientDistPath));

    // SPAのためのフォールバック（APIルート以外）
    app.get('*', (req, res) => {
      // APIルートは除外
      if (req.path.startsWith('/api/') || req.path.startsWith('/knowledge-base/')) {
        return res.status(404).json({ message: 'API endpoint not found' });
      }
      
      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: npm run build:client</p>');
      }
    });

    // エラーハンドリング
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    const PORT = process.env.PORT || 5000;

    // ✅ Replitのヘルスチェック用エンドポイント（追加）
    app.get('/', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
      });
    });

    console.log('[INFO] Starting server...');
    console.log(`[INFO] Node.js version: ${process.version}`);
    console.log(`[INFO] Working directory: ${process.cwd()}`);
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ サーバーが起動しました: http://0.0.0.0:${PORT}`);
      console.log(`🌐 Local access: http://localhost:${PORT}`);
      console.log(`🔗 External access: https://${process.env.REPL_SLUG || 'unknown'}-${process.env.REPL_OWNER || 'unknown'}.repl.co`);
    });

    server.on('error', (err) => {
      console.error('❌ サーバー起動エラー:', err);
      process.exit(1);
    });

    // 知識ベースを遅延初期化（サーバー起動後に実行）
    setTimeout(async () => {
      try {
        const { initializeKnowledgeBase } = await import("./lib/knowledge-base.js");
        await initializeKnowledgeBase();
        console.log('✅ Knowledge base initialized');
      } catch (err) {
        console.warn('⚠️ Knowledge base initialization failed:', err instanceof Error ? err.message : 'Unknown error');
      }
    }, 3000);

  } catch (err) {
    console.error('❌ サーバー初期化エラー:', err);
    process.exit(1);
  }
};

// サーバーを起動
initializeServer().catch((err) => {
  console.error('❌ Fatal server error:', err);
  process.exit(1);
});