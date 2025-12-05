import session from 'express-session';
import { SESSION_SECRET, NODE_ENV } from './env.mjs';

const isAzureHosted = !!process.env.WEBSITE_SITE_NAME;
const isProductionEnv = NODE_ENV === 'production';

const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE.toLowerCase() === 'true'
  : (isAzureHosted || isProductionEnv);

const sessionCookieSameSite = process.env.SESSION_COOKIE_SAMESITE
  ? process.env.SESSION_COOKIE_SAMESITE.toLowerCase()
  : (sessionCookieSecure ? 'none' : 'lax');

const sessionCookieHttpOnly = process.env.SESSION_COOKIE_HTTPONLY
  ? process.env.SESSION_COOKIE_HTTPONLY.toLowerCase() === 'true'
  : false;

const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN 
  ? process.env.SESSION_COOKIE_DOMAIN.trim().replace(/^["']|["']$/g, '').trim() 
  : undefined;

export const sessionConfig = {
  secret: SESSION_SECRET,
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
