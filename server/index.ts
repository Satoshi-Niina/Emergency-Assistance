
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Moduleでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の安全な初期化
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

// Express アプリケーションの初期化
const app = express();

// 基本的なミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイルの提供
app.use('/knowledge-base', express.static(path.join(process.cwd(), 'knowledge-base')));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ message: 'サーバーが正常に動作しています' });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
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
