import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { initializeKnowledgeBase } from "./lib/knowledge-base.js";
import fs from "fs";
import axios from "axios";
import { storage } from "./storage.js";
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の確認
console.log("[INFO] Server starting...");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 初期化処理を簡素化
(async () => {
  try {
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
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // 知識ベースを非同期で初期化（エラーが発生してもサーバー起動を停止しない）
    initializeKnowledgeBase().catch(err => {
      console.warn('[WARN] Knowledge base initialization failed:', err.message);
    });

    const server = await registerRoutes(app);

    // 静的ファイルの配信設定
    app.use('/static', express.static(path.join(process.cwd(), 'public')));
    app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
    app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
    app.use('/knowledge-base/json', express.static(path.join(process.cwd(), 'knowledge-base', 'json')));
    app.use('/knowledge-base/media', express.static(path.join(process.cwd(), 'knowledge-base', 'media')));

    // クライアントのビルドファイルを配信（最後に配置）
    const clientDistPath = path.join(process.cwd(), 'client', 'dist');
    app.use(express.static(clientDistPath));

    // SPAのためのフォールバック
    app.get('*', (req, res) => {
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
      res.status(200).send('OK');
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`サーバーが起動しました: http://0.0.0.0:${PORT}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`外部アクセス可能: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
    });

  } catch (err) {
    console.error('初期化エラー:', err);
  }
})();