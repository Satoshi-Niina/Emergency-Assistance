import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// 環境変数の確認
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// ============================================================================
// ヘルスチェックエンドポイント（最優先、外部I/Oなし）
// ============================================================================
// Azure App Service、GitHub Actions、Load Balancerが最初にチェックするエンドポイント
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

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

console.log('🔧 app.ts: 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ? '[SET]' : '[NOT SET]',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5002'
});

// === CORS 設定（CORS_ORIGINS 環境変数を利用、express.json()より上） ===
app.set('trust proxy', 1);
let origins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Always include localhost dev ports in development for smoother DX
const originSet = new Set<string>(origins);
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

origins = Array.from(originSet);

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
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // devではHTTPなのでfalse
    httpOnly: true,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
};

console.log('🔧 セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite
});

app.use(session(sessionConfig));

// エラーハンドラ（全てを503化しない）
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  const httpError = err as { status?: number };
  const code = typeof httpError?.status === 'number' ? httpError.status : 500;
  res.status(code).json({ error: err?.name ?? 'Error', message: err?.message ?? 'Unexpected error' });
});

export default app;