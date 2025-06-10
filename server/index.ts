
import 'dotenv/config' 
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { initializeKnowledgeBase } from "./lib/knowledge-base";
import fs from "fs";
import axios from "axios";
import { storage } from "./storage";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 環境変数の確認（本番環境では非表示）
if (process.env.NODE_ENV === 'development') {
  console.log("[INFO] Development mode - Environment check completed");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ここでAPIルートを先に登録
(async () => {
  try {
    app.locals.storage = storage;
    // ストレージ設定
    if (process.env.NODE_ENV === 'development') {
      console.log('[INFO] Storage configured');
    }

    // サーバー起動時に知識ベースを初期化
    await initializeKnowledgeBase();
    if (process.env.NODE_ENV === 'development') {
      console.log('[INFO] Knowledge base initialized');
    }

    // ディレクトリの確認と作成
    const dirs = [
      'knowledge-base/images',
      'knowledge-base/json',
      'knowledge-base/data',
      'knowledge-base/media',
      'knowledge-base/ppt'
    ];

    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // サーバー起動時にuploadsのデータをknowledge-baseにコピー
    try {
      // APIが起動した後に実行するために少し待機
      setTimeout(async () => {
        try {
          await axios.post('http://localhost:5000/api/tech-support/sync-knowledge-base?direction=uploads-to-kb');
          if (process.env.NODE_ENV === 'development') {
            console.log('[INFO] Data synchronization completed');
          }
        } catch (syncErr: any) {
          console.error('[ERROR] Sync failed');
        }
      }, 3000);
    } catch (syncErr) {
      console.error('[ERROR] Sync process failed');
    }

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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`サーバーが起動しました: http://0.0.0.0:${PORT}`);
      console.log(`外部アクセス可能: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    });

  } catch (err) {
    console.error('初期化エラー:', err);
  }
})();
