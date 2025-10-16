
// -*- coding: utf-8 -*-

// 統合サーバー - NODE_ENVで開発/本番を自動分岐
// ホットリロード・静的配信・API統合
// UTF-8 (BOMなし) エンコード標準

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import sharp from 'sharp';

// UTF-8環境設定
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, encoding: 'utf8' });
  console.log('📄 Loaded .env file from:', envPath);
} else {
  console.log('📄 .env file not found, using system environment variables');
}

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

// データベース接続プール
let dbPool = null;
function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set - running without database');
    return;
  }
  try {
    console.log('🔗 Initializing database connection...');
    const isLocalhost = process.env.DATABASE_URL.includes('localhost') || 
                       process.env.DATABASE_URL.includes('127.0.0.1');
    const sslConfig = isLocalhost 
      ? false
      : process.env.PG_SSL === 'require' 
      ? { rejectUnauthorized: false }
      : process.env.PG_SSL === 'disable' 
      ? false 
      : { rejectUnauthorized: false };
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    });
    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}
initializeDatabase();

// CORS設定
const corsOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
}));

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// NODE_ENVで分岐
if (isDevelopment) {
  // Vite開発サーバー起動
  let viteServer = null;
  function startViteServer() {
    if (viteServer) viteServer.kill();
    console.log('🚀 Starting Vite development server...');
    const clientDir = path.join(__dirname, '..', 'client');
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    viteServer = spawn(npmCommand, ['run', 'dev'], { cwd: clientDir, stdio: 'inherit', shell: true });
    viteServer.on('close', (code) => {
      console.log(`Vite dev server exited with code ${code}`);
    });
  }
  startViteServer();
  // 必要ならプロキシ設定など追加
} else if (isProduction) {
  // 静的ファイル配信
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    console.log('📁 Serving static files from:', clientDistPath);
  } else {
    console.warn('⚠️ Client dist directory not found:', clientDistPath);
  }
}

// JWT認証ミドルウェア例
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}



import authLoginHandler from './src/api/auth/login/index.js';
// --- /api/auth/login: OPTIONSリクエストにもCORSヘッダーを返す ---
app.options('/api/auth/login', (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Azure Functions形式(context, req)→Express(req, res)ラッパー
app.post('/api/auth/login', async (req, res) => {
  // CORS: credentials対応
  const origin = req.headers.origin || '';
  // contextモック
  const context = {
    log: (...args) => console.log('[auth/login]', ...args),
  };
  context.log.error = (...args) => console.error('[auth/login]', ...args);
  // Azure Functions互換request
  const request = {
    method: req.method,
    headers: req.headers,
    json: async () => req.body,
    body: req.body,
    url: req.originalUrl,
  };
  try {
    const result = await authLoginHandler(context, request);
    if (result) {
      res.status(result.status || 200);
      // CORS: credentials対応
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (result.headers) {
        Object.entries(result.headers).forEach(([k, v]) => {
          // Origin/Credentials系は上書き
          if (!['access-control-allow-origin','access-control-allow-credentials','vary'].includes(k.toLowerCase())) {
            res.setHeader(k, v);
          }
        });
      }
      if (result.body !== undefined) {
        res.send(result.body);
      } else {
        res.end();
      }
    } else {
      res.status(500).json({ success: false, error: 'No response from login handler' });
    }
  } catch (e) {
    console.error('[auth/login] handler error:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🌏 Unified server running on port ${PORT} [${NODE_ENV}]`);
});
