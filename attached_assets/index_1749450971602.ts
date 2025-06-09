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
import * as open from 'open';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 環境変数の確認
console.log("[DEBUG] Environment variables loaded:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "Set" : "Not set",
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Not set"
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ここでAPIルートを先に登録
(async () => {
  try {
    app.locals.storage = storage;
    console.log('ストレージをアプリケーション変数として設定しました');

    // サーバー起動時に知識ベースを初期化
    console.log('知識ベースの初期化を開始...');
    initializeKnowledgeBase();
    console.log('知識ベースの初期化が完了しました');

    // ディレクトリの確認と作成 - uploads不要
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
        console.log(`ディレクトリを作成: ${dir}`);
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // サーバー起動時にuploadsのデータをknowledge-baseにコピー
    console.log('uploads -> knowledge-base への同期を開始...');
    try {
      // APIが起動した後に実行するために少し待機
      setTimeout(async () => {
        try {
          const syncResult = await axios.post('http://localhost:5000/api/tech-support/sync-knowledge-base?direction=uploads-to-kb');
          console.log('アップロードデータの同期結果:', syncResult.data);
        } catch (syncErr: any) {
          console.error('同期エラー:', syncErr?.message || '不明なエラー');
        }
      }, 3000);
    } catch (syncErr) {
      console.error('同期処理エラー:', syncErr);
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
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });

    // 完全に/knowledge-baseに一元化、/uploadsへのリクエストを全て/knowledge-baseに転送
    app.use('/uploads/:dir', (req, res) => {
      const dir = req.params.dir;
      // 許可されたディレクトリのみリダイレクト
      if (['images', 'data', 'json', 'media', 'ppt'].includes(dir)) {
        const redirectPath = `/knowledge-base/${dir}${req.path}`;
        console.log(`リダイレクト: ${req.path} -> ${redirectPath}`);
        res.redirect(redirectPath);
      } else {
        res.status(404).send('Not found');
      }
    });

    // Add a test route to serve our HTML test page
    app.get('/test', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'api-test.html'));
    });

    // Log all requests for debugging
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;

      // 重要なリクエストのみログを出力
      if (path.startsWith('/api/') && !path.includes('/health')) {
        console.log(`[${req.method}] ${path}`);
      }

      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        // エラーレスポンスのみ詳細をログ出力
        if (res.statusCode >= 400) {
          console.log(`[ERROR] ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
      });

      next();
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    const PORT = process.env.PORT || 5000;
    const FALLBACK_PORT = 5002;

    const startServer = async () => {
      try {
        app.listen(PORT, () => {
          console.log(`サーバーが起動しました: http://localhost:${PORT}`);
          open.default(`http://localhost:${PORT}`);
        });
      } catch (error) {
        if (error.code === 'EADDRINUSE') {
          console.log(`ポート ${PORT} は既に使用されています。別のポートを試します。`);
          app.listen(FALLBACK_PORT, () => {
            console.log(`サーバーが起動しました: http://localhost:${FALLBACK_PORT}`);
            open.default(`http://localhost:${FALLBACK_PORT}`);
          });
        } else {
          console.error('サーバー起動エラー:', error);
        }
      }
    };

    startServer();
  } catch (err) {
    console.error('初期化エラー:', err);
  }
})();