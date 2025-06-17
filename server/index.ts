import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[INFO] Backend server starting...");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5173', 'https://*.replit.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    processId: process.pid
  });
});

// 静的ファイル設定
try {
  app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
  console.log('✅ 静的ファイル設定完了');
} catch (staticError) {
  console.error('❌ 静的ファイル設定エラー:', staticError);
}

// エラーハンドラー
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ===== BACKEND SERVER READY =====');
  console.log(`✅ バックエンドサーバー起動: http://0.0.0.0:${PORT}`);
  console.log(`🌐 公開URL想定: Replitの外部URL経由でアクセス`);
  console.log(`📡 ヘルスチェック: /api/health`);
  console.log('🚀 ===== BACKEND SERVER READY =====');
});

server.on('error', (err: any) => {
  console.error('❌ サーバーエラー:', err);
  if (err.code === 'EADDRINUSE') {
    console.log('🔄 ポート競合発生、プロセスを終了します');
    process.exit(1);
  }
});

// セッション設定
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

app.use(session({
  secret: process.env.SESSION_SECRET || 'emergency-recovery-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // 24時間でクリーンアップ
  }),
  cookie: {
    secure: false, // 開発環境ではfalse
    httpOnly: true,
    maxAge: 86400000 // 24時間
  }
}));

// ルート登録を即座に実行
(async () => {
  try {
    console.log('📡 ルート登録開始...');
    const { registerRoutes } = await import('./routes.js');
    
    // authルートを登録
    const { authRouter } = await import('./routes/auth.js');
    app.use('/api/auth', authRouter);
    
    await registerRoutes(app);
    console.log('✅ ルート登録完了');
  } catch (routeError) {
    console.error('❌ ルート登録エラー:', routeError);
  }
})();

// グレースフルシャットダウン
const gracefulShutdown = () => {
  console.log('🔄 Graceful shutdown initiated...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);