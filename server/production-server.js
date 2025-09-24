#!/usr/bin/env node

// Production-ready server for Azure App Service
// SWA + App Service cross-origin authentication support
// Updated: 2024-12-19

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');

// Environment validation
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required');
  process.exit(1);
}

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// ① ヘルスは CORS より前（Originなしでも通す）
const health = (_req, res) => res.status(200).json({ ok: true });
app.get('/api/health', health);
app.get('/api/healthz', health);
app.get('/health', health);
app.get('/healthz', health);

// ② CORS：Originなしは許可、未許可は "false" を返す（throw しない）
const ALLOW = new Set(['https://witty-river-012f39e00.1.azurestaticapps.net']);
const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);        // ヘルス/直叩き/curl を許可
    if (ALLOW.has(origin)) return cb(null, true);
    return cb(null, false);                    // 403/500にせず CORS ヘッダを付けない
  },
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));           // ③ Preflight も同方針

// Request logging
app.use(morgan('combined', {
  skip: (req, res) => req.url === '/api/health'
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Session configuration for cross-origin
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'none', // Cross-origin support
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: undefined // Let browser handle domain
  },
  name: 'sid',
  proxy: true // Trust proxy for Azure App Service
}));

// Request ID middleware for error tracking
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// PostgreSQL pool initialization removed - handled in auth routes

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    // Check Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { 
          id: payload.userId, 
          username: payload.username,
          authMethod: 'jwt'
        };
        return next();
      } catch (jwtError) {
        console.warn(`[${req.requestId}] JWT verification failed:`, jwtError.message);
        // Fall through to session check
      }
    }

    // Check session
    if (req.session && req.session.userId) {
      req.user = { 
        id: req.session.userId, 
        username: req.session.username,
        authMethod: 'session'
      };
      return next();
    }

    // No valid authentication
    return res.status(401).json({
      success: false,
      error: 'authentication_required',
      message: '認証が必要です',
      requestId: req.requestId
    });

  } catch (error) {
    console.error(`[${req.requestId}] Authentication error:`, error);
    return res.status(500).json({
      success: false,
      error: 'authentication_error',
      message: '認証処理でエラーが発生しました',
      requestId: req.requestId
    });
  }
};

// API Routes
const router = express.Router();

// Health check - no external dependencies (moved to top level)

// Handshake endpoint
router.get('/auth/handshake', (req, res) => {
  try {
    res.json({
      ok: true,
      mode: 'session', // Default to session mode for cross-origin
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    console.error(`[${req.requestId}] Handshake error:`, error);
    res.status(200).json({
      ok: true,
      mode: 'session',
      env: 'production',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
});

// Mount auth routes from routes/auth.js
const authRouter = require('./routes/auth.js');
app.use('/api/auth', authRouter);

// Mount API router
app.use('/api', router);

// Global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || crypto.randomUUID();
  
  console.error(`[${requestId}] Unhandled error:`, err);
  console.error(`[${requestId}] Stack trace:`, err.stack);
  console.error(`[${requestId}] Request details:`, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  res.status(500).json({
    success: false,
    error: 'internal_error',
    message: 'サーバー内部エラーが発生しました',
    requestId: requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: 'リソースが見つかりません',
    path: req.originalUrl,
    requestId: req.requestId
  });
});

// Start server
const PORT = Number(process.env.PORT?.trim() || '8000');
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔐 Login API: http://${HOST}:${PORT}/api/auth/login`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Database URL configured: ${process.env.DATABASE_URL ? 'YES' : 'NO'}`);
  console.log(`🔑 JWT Secret configured: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
  console.log(`🍪 Session Secret configured: ${process.env.SESSION_SECRET ? 'YES' : 'NO'}`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`📄 Main file: ${__filename}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});