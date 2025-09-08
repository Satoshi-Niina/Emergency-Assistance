import express from 'express';
import session, { CookieOptions } from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health.js';
import { readyRouter } from './routes/ready.js';
import { registerRoutes } from './routes/registerRoutes.js';

// 非同期でアプリを作成する関数
export async function createApp() {
  // 環境変数の確認
  const isProduction = process.env.NODE_ENV === 'production';

  const app = express();

// ============================================================================
// 健康系エンドポイント（最優先、外部I/Oなし）
// ============================================================================
app.use('/health', healthRouter);

// Ready endpoint (環境変数で制御)
if (process.env.ENABLE_READY_ENDPOINT === 'true') {
  app.use('/ready', readyRouter);
  console.log('✅ Ready endpoint enabled at /ready');
}

// 旧形式のエンドポイントも維持（互換性）
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend' 
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

app.get('/', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

// ============================================================================
// ミドルウェア設定
// ============================================================================

// trust proxy 設定
app.set('trust proxy', 1);

console.log('🔧 app.ts: 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5002',
  ENABLE_READY_ENDPOINT: process.env.ENABLE_READY_ENDPOINT,
});

// === CORS 設定（FRONTEND_URL を確実に含める） ===
const allowedOrigins = [
  process.env.FRONTEND_URL,
  // Local dev defaults
  'http://localhost:5002',
  'http://localhost:3000',
  // Azure Static Web Apps domains (current and legacy)
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'https://wonderful-grass-0e7cf9b00.5.azurestaticapps.net'
].filter(Boolean);

// CORS_ORIGINS からも追加
if (process.env.CORS_ORIGINS) {
  const corsOrigins = process.env.CORS_ORIGINS.split(',').map(s => s.trim());
  allowedOrigins.push(...corsOrigins);
}

// Always include localhost dev ports in development for smoother DX
const originSet = new Set<string>(allowedOrigins);
if (!isProduction) {
  [
    // Vite/ローカル開発 (localhost)
    'http://localhost:5173',
    'http://localhost:5002',
    'http://localhost:3000',
    // 一部ブラウザ/設定で localhost の代わりに 127.0.0.1 になるケースを許可
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5002',
    'http://127.0.0.1:3000'
  ].forEach(o => originSet.add(o));
}

// Fallback for production if CORS_ORIGINS is not configured
if (isProduction && originSet.size === 0) {
  [
    process.env.FRONTEND_URL,
    'https://witty-river-012f39e00.1.azurestaticapps.net'
  ].filter(Boolean).forEach(o => originSet.add(String(o)));
}

const origins = Array.from(originSet);

console.log('🔧 CORS allowed origins:', origins.length ? origins : '[none - local dev only]');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curlやサーバ間リクエストなど、ブラウザ起点でない場合は許可
    if (origins.includes(origin)) return cb(null, true);
    // 不許可の origin はエラーを投げずに CORS ヘッダを付与しない（ブラウザ側でブロックされる）
    console.log('🚫 CORS blocked origin:', origin);
    return cb(null, false);
  },
  credentials: true
}));

// OPTIONS も同様に扱う
app.options('*', cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Vary: Originを常に付与
app.use((req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});

// セッション設定 - クロスサイトCookie対応
// cookie: { httpOnly: true, secure: true, sameSite: 'none' } で統一
// 型: partitioned フィールドを拡張（最新ブラウザのCHIPS対応）
type SessionCookieOptions = CookieOptions & { partitioned?: boolean };

const sessionConfig: {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: SessionCookieOptions;
  name: string;
  rolling: boolean;
} = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // devではHTTPなのでfalse
    httpOnly: true,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
    domain: undefined,
    // CHIPS: Partitioned cookies allow third-party cookie usage in modern browsers
    // Cast to any to avoid type friction if @types/express-session lacks 'partitioned'
    ...(isProduction ? { partitioned: true } : {})
  },
  name: 'emergency-assistance-session',
  rolling: true
};

console.log('🔧 セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite
});

app.use(session(sessionConfig));

// ============================================================================
// ルートの登録
// ============================================================================
console.log('🔧 Registering routes...');
await registerRoutes(app);

  // エラーハンドラ（全てを503化しない）
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    const httpError = err as { status?: number };
    const code = typeof httpError?.status === 'number' ? httpError.status : 500;
    res.status(code).json({ error: err?.name ?? 'Error', message: err?.message ?? 'Unexpected error' });
  });

  return app;
}

// デフォルトエクスポート（後方互換性のため）
export default await createApp();