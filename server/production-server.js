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

// ① ヘルスチェックエンドポイント（CORSより前で定義）
const healthCheck = async (req, res) => {
  try {
    console.log('🏥 Health check request:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // データベース接続チェック
    let dbStatus = 'not_initialized';
    if (dbPool) {
      try {
        await dbPool.query('SELECT NOW()');
        dbStatus = 'connected';
      } catch (dbError) {
        console.warn('Database connection test failed:', dbError.message);
        dbStatus = 'error';
      }
    }
    
    res.status(200).json({ 
      ok: true, 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      service: 'Emergency Assistance Backend'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(200).json({ 
      ok: false, 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance Backend'
    });
  }
};

// Ping endpoint (always returns 200)
const pingCheck = (req, res) => {
  try {
    console.log('🏓 Ping request:', {
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      ping: 'pong',
      timestamp: new Date().toISOString(),
      service: 'Emergency Assistance Backend'
    });
  } catch (error) {
    console.error('❌ Ping check failed:', error);
    res.status(200).json({
      ping: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Register health check endpoints
app.get('/api/health', healthCheck);
app.get('/api/healthz', healthCheck);
app.get('/health', healthCheck);
app.get('/healthz', healthCheck);
app.get('/ping', pingCheck);

// ② CORS：Originなしは許可、未許可は "false" を返す（throw しない）
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net';
const ALLOW = new Set([
  FRONTEND_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178'
]);
const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    console.log('🔍 CORS Origin check:', { origin, allowed: ALLOW.has(origin) });
    // 開発環境では localhost をすべて許可
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    if (ALLOW.has(origin)) return cb(null, true);
    console.log('❌ CORS Origin rejected:', origin);
    return cb(null, false);
  },
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// PostgreSQL pool initialization

// データベース接続プールの初期化
let dbPool = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  try {
    // 開発環境ではSSLを無効にする
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslConfig = isDevelopment ? false : { 
      require: true, 
      rejectUnauthorized: false 
    };
    
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // 接続テスト
    dbPool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('❌ Database connection test failed:', err.message);
      } else {
        console.log('✅ Database connection test successful:', result.rows[0]);
      }
    });

    console.log('✅ Database pool initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// データベース接続を初期化
initializeDatabase();

// データベース接続をリクエストに追加
app.use((req, res, next) => {
  req.db = dbPool;
  next();
});

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
  console.log(`📊 Health check endpoints:`);
  console.log(`   - http://${HOST}:${PORT}/api/health`);
  console.log(`   - http://${HOST}:${PORT}/api/healthz`);
  console.log(`   - http://${HOST}:${PORT}/ping`);
  console.log(`🔐 Login API: http://${HOST}:${PORT}/api/auth/login`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Database URL configured: ${process.env.DATABASE_URL ? 'YES' : 'NO'}`);
  console.log(`🔑 JWT Secret configured: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
  console.log(`🍪 Session Secret configured: ${process.env.SESSION_SECRET ? 'YES' : 'NO'}`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`📄 Main file: ${__filename}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  
  // 起動後のヘルスチェックテスト
  setTimeout(() => {
    console.log('🔍 Testing health endpoints...');
    const testEndpoints = ['/api/health', '/api/healthz', '/ping'];
    
    testEndpoints.forEach(endpoint => {
      const http = require('http');
      const options = {
        hostname: HOST,
        port: PORT,
        path: endpoint,
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ ${endpoint}: ${res.statusCode} - ${jsonData.ok ? 'OK' : 'ERROR'}`);
          } catch (error) {
            console.log(`✅ ${endpoint}: ${res.statusCode} - Response received`);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ ${endpoint}: ${error.message}`);
      });
      
      req.on('timeout', () => {
        console.log(`⏰ ${endpoint}: Timeout`);
        req.destroy();
      });
      
      req.end();
    });
  }, 2000);
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