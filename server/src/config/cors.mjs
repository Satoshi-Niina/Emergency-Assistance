import { FRONTEND_URL, STATIC_WEB_APP_URL } from './env.mjs';

export const allowedOrigins = [
  FRONTEND_URL,
  STATIC_WEB_APP_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5002',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://emergency-assistantapp.azurewebsites.net',  // 本番App Service
  'https://happy-bush-083160b00.3.azurestaticapps.net',
  'https://witty-river-012f39e00.1.azurestaticapps.net'
];

export const corsOptions = {
  origin: function (origin, callback) {
    // originなし（同一オリジン）または許可リストに含まれる場合は許可
    // originなし（同一オリジン）または許可リストに含まれる場合は許可
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin.includes('azurestaticapps.net') || origin.includes('azurewebsites.net')) {
      // Azure関連ドメインを許可
      callback(null, true);
    } else {
      // デバッグのため、一時的にすべて許可しつつログ出力
      console.warn('[CORS] ⚠️ Allowing unknown origin:', origin);
      callback(null, true);

      // 元の厳格なロジック:
      // console.warn('❌ CORS blocked origin:', origin);
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'X-Health-Token'
  ],
  exposedHeaders: ['Set-Cookie', 'Cache-Control', 'Content-Type'],
  maxAge: 86400, // 24時間
  preflightContinue: false,
  optionsSuccessStatus: 204
};
