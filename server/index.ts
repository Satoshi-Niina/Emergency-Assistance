import express from 'express'; 
import path from 'path';
import cors from 'cors';
import troubleshootingRouter from './routes/troubleshooting.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const clientDistPath = path.join(__dirname, '../client/dist');

// ミドルウェア
app.use(cors());
app.use(express.json());

// 動作確認用API
app.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ message: 'API is working correctly' });
});

// ヘルスチェックAPI
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'OK',
    timestamp: new Date(),
    mode: process.env.DATA_MODE || 'file',
  });
});

// APIルート登録
app.use('/api/troubleshooting', troubleshootingRouter);

// API専用404ハンドラー
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// 静的ファイル配信
app.use(express.static(clientDistPath));

// SPAフォールバック（APIは除外）
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  if (req.originalUrl.startsWith('/api')) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } else {
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
});