import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import cors from 'cors';

// ES Moduleでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 基本的なミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイルの提供
app.use('/knowledge-base', express.static(path.join(process.cwd(), 'knowledge-base')));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ message: 'サーバーが正常に動作しています' });
});

// エラーハンドリングミドルウェア
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({ 
    error: 'サーバー内部エラー',
    message: err.message 
  });
});

// 404ハンドリング
app.use('*', (req, res) => {
  res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ サーバー起動完了: http://0.0.0.0:${PORT}`);
}).on('error', (err) => {
  console.error('❌ サーバー起動エラー:', err);
  process.exit(1);
});

// プロセス終了処理
process.on('SIGINT', () => {
  console.log('🔄 サーバー停止中...');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🔄 サーバー停止中...');
  server.close(() => {
    console.log('✅ サーバー停止完了');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  process.exit(1);
});