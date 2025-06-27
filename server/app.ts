import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';
import helmet from 'helmet';

const app = express();

// ✅ セキュリティヘッダー（ヘルメット）
app.use(helmet());

// ✅ CORSの設定（全許可 or 必要に応じて調整）
app.use(cors());

// ✅ JSON/Payload の読み取り
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ ログ出力（morgan + ログファイル書き出し）
const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: logStream }));
app.use(morgan('dev')); // 開発用にコンソール出力も有効化

// ✅ ルーティング
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is alive' });
});

// その他APIルート例（必要に応じてモジュール化）
app.get('/api/hello', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

// ✅ エラーハンドリング
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Unhandled Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
