import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 環境変数の読み込み確認
console.log("[DEBUG] Environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  FRONTEND_URL: process.env.FRONTEND_URL || "NOT SET",
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? "SET" : "NOT SET",
  PWD: process.cwd(),
  __dirname: __dirname
});

console.log("[INFO] Backend server starting...");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// CORS設定
const allowedOrigins = [
  'https://emergency-assistance-app.azurestaticapps.net',
  'https://emergency-assistance-app.azurewebsites.net',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5173'
];
const corsOptions = {
  origin: (origin, callback) => {
    // 開発環境ではすべてのオリジンを許可
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.azurestaticapps.net') || origin.endsWith('.azurewebsites.net'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
};

console.log('🔧 CORS設定:', {
  isProduction,
  origin: corsOptions.origin,
  credentials: corsOptions.credentials,
  methods: corsOptions.methods
});

app.use(cors(corsOptions));

// セキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    processId: process.pid,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 本番環境での静的ファイル配信
if (isProduction) {
  // クライアントのビルドファイルを配信
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // SPAのルーティング対応
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

// エラーハンドラー
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// サーバー起動
const server = app.listen(PORT, () => {
  console.log('🚀 ===== BACKEND SERVER READY =====');
  console.log('✅ バックエンドサーバー起動:', `http://0.0.0.0:${PORT}`);
  console.log('🌐 環境:', process.env.NODE_ENV || 'development');
  console.log('📡 ヘルスチェック:', '/api/health');
  console.log('🔧 環境変数確認:', {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
  });
  console.log('🚀 ===== BACKEND SERVER READY =====');
  if (isProduction) {
    console.log(`🎯 本番モード: 静的ファイル配信有効`);
  }
});

server.on('error', (err: any) => {
  console.error('❌ サーバーエラー:', err);
  if (err.code === 'EADDRINUSE') {
    console.log('🔄 ポート競合発生、プロセスを終了します');
    process.exit(1);
  }
});

// ルート登録を即座に実行
(async () => {
  try {
    console.log('📡 ルート登録開始...');
    
    // Azure Storage統合の初期化
    if (process.env.NODE_ENV === 'production' && process.env.AZURE_STORAGE_CONNECTION_STRING) {
      try {
        console.log('🚀 Azure Storage統合を初期化中...');
        const { knowledgeBaseAzure } = await import('./lib/knowledge-base-azure.js');
        await knowledgeBaseAzure.initialize();
        console.log('✅ Azure Storage統合初期化完了');
      } catch (azureError) {
        console.error('❌ Azure Storage統合初期化エラー:', azureError);
        console.log('⚠️ Azure Storage統合なしで続行します');
      }
    }
    
    const isDev = process.env.NODE_ENV !== "production";

    // 新しいルート構造を使用
    const { registerRoutes } = await import('./routes/index.js');

    const { setupAuth } = isDev
      ? await import('./auth')
      : await import('./auth');
    
    const { authRouter } = isDev
      ? await import('./routes/auth.js')
      : await import('./routes/auth.js');
    
    // 認証とルートを登録
    setupAuth(app);
    
    // 認証ルートを明示的に登録
    app.use('/api/auth', authRouter);
    
    registerRoutes(app);
    console.log('✅ 認証とルートの登録完了');
        
    // 静的ファイル設定（ルート登録後に設定）
    try {
      app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
      app.use('/knowledge-base/images', express.static(path.join(process.cwd(), 'knowledge-base', 'images')));
      app.use('/knowledge-base/data', express.static(path.join(process.cwd(), 'knowledge-base', 'data')));
      console.log('✅ 静的ファイル設定完了');
    } catch (staticError) {
      console.error('❌ 静的ファイル設定エラー:', staticError);
    }
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