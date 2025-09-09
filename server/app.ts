import express from 'express';
import session, { CookieOptions } from 'express-session';
// Redis セッションストア
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 型定義が存在しない環境でも実行させる
import connectRedis from 'connect-redis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createClient as createRedisClient } from 'redis';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { healthRouter } from './routes/health.js';
import { readyRouter } from './routes/ready.js';
import { registerRoutes } from './routes/registerRoutes.js';
import { auditLogger } from './middleware/audit-logger.js';
import { startAuditRotation } from './logging/audit-rotator.js';
import fs from 'fs';
import os from 'os';
import { initInsights } from './telemetry/insights.js';

// アプリ生成
export async function createApp() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = express();
  const uploadsDir = path.join(process.cwd(), 'uploads');

  // 基本ヘルスチェック
  app.use('/health', healthRouter);
  if (process.env.ENABLE_READY_ENDPOINT === 'true') {
    app.use('/ready', readyRouter);
    console.log('✅ Ready endpoint enabled at /ready');
  }
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), service: 'emergency-assistance-backend' });
  });
  app.get('/healthz', (_req, res) => res.status(200).type('text/plain').send('OK'));
  app.get('/', (_req, res) => res.status(200).type('text/plain').send('OK'));

  // trust proxy
  app.set('trust proxy', 1);

  console.log('🔧 app.ts env:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    ENABLE_READY_ENDPOINT: process.env.ENABLE_READY_ENDPOINT
  });

  // CORS 設定
  const allowedOriginsBase = [
    process.env.FRONTEND_URL,
    'http://localhost:5002',
    'http://localhost:3000',
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://wonderful-grass-0e7cf9b00.5.azurestaticapps.net'
  ].filter(Boolean) as string[];
  if (process.env.CORS_ORIGINS) {
    allowedOriginsBase.push(...process.env.CORS_ORIGINS.split(',').map(s => s.trim()));
  }
  const originSet = new Set<string>(allowedOriginsBase);
  if (!isProduction) {
    ['http://localhost:5173','http://127.0.0.1:5173','http://127.0.0.1:5002','http://127.0.0.1:3000'].forEach(o => originSet.add(o));
  }
  const origins = Array.from(originSet);
  const azureStaticPattern = /\.azurestaticapps\.net$/;
  console.log('🔧 CORS origins (explicit):', origins);
  app.use((req, _res, next) => {
    // デバッグ用: 最初の数件のみログ
    if (Math.random() < 0.02) {
      console.log('🌐 Incoming Origin:', req.headers.origin, 'Path:', req.method, req.path);
    }
    next();
  });
  const dynamicCors = cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (origins.includes(origin)) return cb(null, true);
      if (azureStaticPattern.test(origin)) {
        // Azure Static Web Apps 全般許可（必要ならホワイトリスト方式に再変更可能）
        return cb(null, true);
      }
      console.log('🚫 CORS blocked origin (not in list):', origin);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
  });
  app.use(dynamicCors);
  app.options('*', dynamicCors);
  // フェールセーフ: ここまでで CORS ヘッダが付いていないが許可対象なら強制付与
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
      if (origins.includes(origin) || azureStaticPattern.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
        // 必要に応じて許可ヘッダ拡張
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      }
    }
    next();
  });

  app.use(cookieParser());
  // Telemetry
  initInsights();
  // 監査ログ（主要APIリクエスト記録）
  app.use(auditLogger({ tag: 'api' }));
  // ローテーション開始
  startAuditRotation();
  // 追加: 実際の audit.log 書き込み先が存在しないケースを検知 (軽量チェック)
  try {
    const auditDirCandidates = [
      process.env.AUDIT_LOG_DIR,
      process.cwd() + '/logs',
      '/home/site/logs',
      '/home/logs',
      os.tmpdir() + '/logs'
    ].filter(Boolean) as string[];
    let ensured = false;
    for (const d of auditDirCandidates) {
      try {
        if (!fs.existsSync(d)) continue; // ローテータが作成したはず
        fs.accessSync(d, fs.constants.W_OK);
        ensured = true;
        break;
      } catch {}
    }
    if (!ensured) {
      console.warn('⚠️ audit log directory still not writable after rotation init');
    }
  } catch {}
  app.use(express.json());
  app.use((_, res, next) => { res.header('Vary','Origin'); next(); });

  // セッション設定
  type SessionCookieOptions = CookieOptions & { partitioned?: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redisStore: any = null;
  if (process.env.REDIS_URL) {
    try {
      const redisClient = createRedisClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      // connect-redis v7+ default export is a class Store
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RedisStoreClass: any = connectRedis as any;
      redisStore = new RedisStoreClass({ client: redisClient, prefix: 'sess:' });
      console.log('✅ Redis session store enabled');
    } catch (e) {
      console.warn('⚠️ Redis 初期化失敗。MemoryStoreにフォールバック:', (e as Error).message);
    }
  }

  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
      ...(isProduction ? { partitioned: true } : {})
    } as SessionCookieOptions,
    name: 'emergency-assistance-session',
    rolling: true,
    store: redisStore || undefined
  };
  console.log('🔧 session config:', { secure: sessionConfig.cookie.secure, sameSite: sessionConfig.cookie.sameSite });
  app.use(session(sessionConfig));

  // 静的: アップロードされたファイル
  app.use('/uploads', express.static(uploadsDir));
  console.log('[static] mounted /uploads ->', uploadsDir);

  // 動的ルート登録
  console.log('🔧 Registering routes...');
  await registerRoutes(app);

  // 共通エラーハンドラ
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: err.name, message: err.message });
  });

  return app;
}

export default await createApp();