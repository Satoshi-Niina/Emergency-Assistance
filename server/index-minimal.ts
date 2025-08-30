
import express from "express";
import cors from "cors";
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 最小サーバー起動開始');
console.log('📂 Working directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

const app = express();
const port = process.env.PORT || 3001;

// 基本的なミドルウェア
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

// 単純なヘルスチェック
app.get('/api/health', (req, res) => {
  console.log('📊 ヘルスチェックリクエスト受信');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    pid: process.pid,
    message: '最小サーバーが動作中です'
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  console.log('📊 ルートリクエスト受信');
  res.json({
    message: '最小サーバーが正常に動作しています',
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ エラー発生:', error);
  res.status(500).json({
    error: 'サーバーエラー',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// プロセスエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未処理例外:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理Promise拒否:', reason);
});

// サーバー起動
const server = app.listen(Number(port), '0.0.0.0', () => {
  console.log(`✅ 最小サーバーが正常に起動しました`);
  console.log(`🌐 URL: http://0.0.0.0:${port}`);
  console.log(`📊 ヘルスチェック: http://0.0.0.0:${port}/api/health`);
});

server.on('error', (error: any) => {
  console.error('❌ サーバー起動エラー:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ポート ${port} は既に使用されています`);
  }
});

console.log('✅ 最小サーバーファイル終端');
