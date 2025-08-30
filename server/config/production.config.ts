export const productionConfig = {
  // サーバー設定
  port: process.env.PORT || 3001,
  host: '0.0.0.0',
  
  // データベース設定
  database: {
    url: process.env.DATABASE_URL || '',
    maxConnections: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // セッション設定
  session: {
    secret: process.env.SESSION_SECRET || 'production-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      sameSite: 'strict' as const,
    },
  },
  
  // CORS設定
  cors: {
    origin: process.env.FRONTEND_URL || 'https://your-domain.com',
    credentials: true,
    optionsSuccessStatus: 200,
  },
  
  // セキュリティ設定
  security: {
    helmet: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 100, // 最大100リクエスト
    },
  },
  
  // ログ設定
  logging: {
    level: 'info',
    format: 'json',
    timestamp: true,
  },
  
  // ヘルスチェック設定
  healthCheck: {
    interval: 30000, // 30秒
    timeout: 5000,   // 5秒
  },
};

export default productionConfig;
