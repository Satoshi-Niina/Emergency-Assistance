// server.ts — 完全版（丸ごと差し替え）
// 依存: express, cookie-parser, cors, express-rate-limit, pg, bcrypt, jsonwebtoken
//      @types/express 等は任意（型エラー抑制したい場合）

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';

// ====== env helpers（import直後・ここ1回だけ）======
export const safeLen = (v: unknown) => (v == null ? 0 : String(v).length);
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? '',
  DB_URL: process.env.DATABASE_URL ?? '',
  SESSION_SECRET: process.env.SESSION_SECRET ?? '',
  ALLOW_DUMMY: (process.env.ALLOW_DUMMY_LOGIN ?? '').toLowerCase() === 'true',
  FRONTEND_ORIGIN:
    process.env.FRONTEND_ORIGIN ??
    'https://witty-river-012f39e00.1.azurestaticapps.net',
};
const isProd = env.NODE_ENV === 'production';

// ====== 基本セットアップ ======
const app = express();
app.set('trust proxy', 1); // SWA/リバースプロキシ配下での secure 判定に必要
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ====== DBプール（設定が無くても落とさない）======
const pool: Pool | null =
  safeLen(env.DB_URL) > 0 ? new Pool({ connectionString: env.DB_URL }) : null;

// ====== JWTユーティリティ ======
const signToken = (payload: object) =>
  jwt.sign(payload, env.SESSION_SECRET || 'change-me', { expiresIn: '7d' });

const readUserFromCookie = (req: Request) => {
  const token = (req.cookies?.sid as string | undefined) ?? '';
  if (!token) return null;
  try {
    return jwt.verify(token, env.SESSION_SECRET || 'change-me') as any;
  } catch {
    return null;
  }
};

// ====== 監視系（必ず 200 を返す）======
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbUrlLen = safeLen(env.DB_URL);
  if (!pool) {
    return res
      .status(200)
      .json({ status: 'degraded', db: 'not_configured', dbUrlLen });
  }
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'ok', dbUrlLen });
  } catch (e: any) {
    return res
      .status(200)
      .json({
        status: 'degraded',
        db: 'fail',
        dbUrlLen,
        message: String(e?.message || e),
      });
  }
});

app.get('/api/diag/env', (_req: Request, res: Response) => {
  res.status(200).json({
    nodeEnv: env.NODE_ENV,
    allowDummy: env.ALLOW_DUMMY,
    hasDbUrlLength: safeLen(env.DB_URL),
    hasSessionSecretLength: safeLen(env.SESSION_SECRET),
    trustProxy: app.get('trust proxy'),
    origin: env.FRONTEND_ORIGIN,
  });
});

app.get('/api/diag/echo', (req: Request, res: Response) => {
  res.status(200).json({
    path: req.path,
    method: req.method,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
    },
    cookies: Object.keys(req.cookies || {}),
  });
});

// ====== レート制限（認証系にだけ適用）======
const authLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 100 });
app.use('/api/auth', authLimiter);

// ====== 認証系 API ======
// POST /api/auth/login { username, password }
app.post('/api/auth/login', async (req: Request, res: Response) => {
  // 準備不足は 503 を返す（落とさない）
  if (safeLen(env.SESSION_SECRET) < 16) {
    return res
      .status(503)
      .json({
        error: 'server_not_ready',
        reason: 'SESSION_SECRET too short or missing',
      });
  }
  const { username, password } = (req.body || {}) as {
    username?: string;
    password?: string;
  };

  // ダミーモード（緊急疎通用）
  if (env.ALLOW_DUMMY) {
    const token = signToken({
      id: 'demo',
      username: username || 'demo',
      role: 'user',
      displayName: 'Demo User',
    });
    res.cookie('sid', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ ok: true, mode: 'dummy' });
  }

  // 本番モード（DB照合）
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'Username and password are required' });
  }
  if (!pool) {
    return res
      .status(503)
      .json({ error: 'server_not_ready', reason: 'DATABASE_URL missing' });
  }
  try {
    const q =
      'SELECT id, username, password, display_name, role FROM users WHERE username=$1 LIMIT 1';
    const { rows } = await pool.query(q, [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    // ローカル開発環境では平文パスワードを直接比較
    const ok = user.password === password;
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    });
    res.cookie('sid', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true, mode: 'db' });
  } catch (e: any) {
    res
      .status(500)
      .json({ message: 'Login failed', error: String(e?.message || e) });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const u = readUserFromCookie(req);
  if (!u) return res.json({ authenticated: false, user: null });
  return res.json({
    authenticated: true,
    user: {
      id: (u as any).id,
      username: (u as any).username,
      displayName: (u as any).displayName,
      role: (u as any).role,
    },
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('sid');
  res.json({ ok: true });
});

// ====== エラーハンドラ（最後）======
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const msg = String(err?.message || err);
  const top = (err?.stack || '').split('\n').slice(0, 2).join(' | ');
  return res.status(500).json({ err: msg, path: req.path, stack: top });
});
app.use((req: Request, res: Response) =>
  res
    .status(404)
    .json({ error: 'Not found', path: req.path, method: req.method })
);

// ====== listen を 1 箇所に統一 & 起動ログ ======
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  const line = `[BOOT] listening http://0.0.0.0:${port} (${env.NODE_ENV || 'dev'}) ${new Date().toISOString()}\n`;
  try {
    fs.appendFileSync('../server_boot.log', line);
  } catch {}
  console.log(line.trim());
});
