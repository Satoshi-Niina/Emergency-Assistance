import session from 'express-session';
import { SESSION_SECRET, NODE_ENV } from './env.mjs';

const isAzureHosted = !!process.env.WEBSITE_SITE_NAME;
const isProductionEnv = NODE_ENV === 'production';

// デバッグ用: セッション設定を緩和
const sessionCookieSecure = false; // HTTPでもセッションが動作するように一時的に変更
const sessionCookieSameSite = 'lax'; // laxに変更

const sessionCookieHttpOnly = process.env.SESSION_COOKIE_HTTPONLY
  ? process.env.SESSION_COOKIE_HTTPONLY.toLowerCase() === 'true'
  : true;

const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN
  ? process.env.SESSION_COOKIE_DOMAIN.trim().replace(/^["']|["']$/g, '').trim()
  : undefined;

console.log('[Session Config]', {
  isAzureHosted,
  isProductionEnv,
  cookieSecure: sessionCookieSecure,
  cookieSameSite: sessionCookieSameSite,
  cookieHttpOnly: sessionCookieHttpOnly,
  cookieDomain: sessionCookieDomain,
  sessionSecret: SESSION_SECRET ? '✓ SET' : '✗ MISSING'
});

export const sessionConfig = {
  secret: SESSION_SECRET || (() => { throw new Error('SESSION_SECRET is required'); })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: sessionCookieSecure,
    httpOnly: sessionCookieHttpOnly,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: sessionCookieSameSite,
    domain: sessionCookieDomain,
    path: '/'
  },
  name: 'emergency.session',
  proxy: true,
  rolling: false
};

export const createSessionMiddleware = () => session(sessionConfig);
