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
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin && origin.includes('azurestaticapps.net')) {
      // すべての azurestaticapps.net ドメインを許可
      callback(null, true);
    } else if (origin && origin.includes('azurewebsites.net')) {
      // すべての azurewebsites.net ドメインを許可
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // 開発環境: すべて許可
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
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
