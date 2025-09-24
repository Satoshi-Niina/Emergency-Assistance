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

// CORS configuration for SWA cross-origin - 本番環境用厳密設定
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://witty-river-012f39e00.1.azurestaticapps.net',
      'http://localhost:5173', // Development
      'http://localhost:3000'   // Development
    ];
    
    // 本番環境ではSWA URLのみ許可
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // 開発環境では緩和
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));

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

// Initialize PostgreSQL pool
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('connect', () => {
    console.log('✅ Database connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Database error:', err);
  });
} else {
  console.warn('⚠️ DATABASE_URL not set - running without database');
}

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

// Health check - no external dependencies
const healthHandler = (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    requestId: req.requestId
  });
};

router.get('/health', healthHandler);

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

// Login endpoint
router.post('/auth/login', async (req, res) => {
  try {
    console.log(`[${req.requestId}] Login request received:`, {
      body: req.body,
      bypassDb: process.env.BYPASS_DB_FOR_LOGIN,
      timestamp: new Date().toISOString()
    });

    const { username, password } = req.body;

    if (!username || !password) {
      console.log(`[${req.requestId}] Missing credentials`);
      return res.status(400).json({
        success: false,
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です',
        requestId: req.requestId
      });
    }

    // バイパスフラグ確認
    const bypassDb = process.env.BYPASS_DB_FOR_LOGIN === 'true';
    console.log(`[${req.requestId}] Bypass DB flag: ${bypassDb}`);
    
    console.log('[auth/login] Login attempt:', { 
      username, 
      bypassDb,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });

    // バイパスモード時は仮ログイン
    if (bypassDb) {
      console.log(`[${req.requestId}] Bypass mode: Creating demo session`);
      
      try {
        // セッションにユーザー情報を設定
        req.session.user = { 
          id: 'demo', 
          name: username,
          role: 'user'
        };
        console.log(`[${req.requestId}] Session user set:`, req.session.user);
        
        // JWTトークンも生成（オプション）
        const token = jwt.sign(
          { id: 'demo', username, role: 'user' }, 
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '1d' }
        );
        console.log(`[${req.requestId}] JWT token generated`);
        
        const response = { 
          success: true, 
          mode: 'session',
          user: req.session.user,
          token,
          accessToken: token,
          expiresIn: '1d',
          requestId: req.requestId
        };
        
        console.log(`[${req.requestId}] Returning bypass response:`, response);
        return res.json(response);
      } catch (sessionError) {
        console.error(`[${req.requestId}] Session error:`, sessionError);
        return res.status(503).json({
          success: false,
          error: 'session_error',
          message: 'セッション作成に失敗しました',
          requestId: req.requestId
        });
      }
    }

    // Database check
    if (!pool) {
      return res.status(503).json({
        success: false,
        error: 'auth_backend_unavailable',
        message: '認証サービスが一時的に利用できません',
        requestId: req.requestId
      });
    }

    // Query user
    const result = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません',
        requestId: req.requestId
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません',
        requestId: req.requestId
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Regenerate session
    req.session.regenerate((err) => {
      if (err) {
        console.error(`[${req.requestId}] Session regeneration error:`, err);
        return res.status(503).json({
          success: false,
          error: 'session_error',
          message: 'セッション作成に失敗しました',
          requestId: req.requestId
        });
      }

      // Store user info in session
      req.session.userId = user.id;
      req.session.user = { 
        id: user.id, 
        name: user.username,
        role: 'user'
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error(`[${req.requestId}] Session save error:`, saveErr);
          return res.status(503).json({
            success: false,
            error: 'session_error',
            message: 'セッション保存でエラーが発生しました',
            requestId: req.requestId
          });
        }

        // Success response
        res.json({
          success: true,
          token: token,
          accessToken: token,
          expiresIn: '24h',
          user: req.session.user,
          requestId: req.requestId
        });
      });
    });

  } catch (error) {
    console.error(`[${req.requestId}] Login error:`, error);
    console.error(`[${req.requestId}] Error stack:`, error.stack);
    console.error(`[${req.requestId}] Error details:`, {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(503).json({
      success: false,
      error: 'auth_internal_error',
      message: '認証処理中にエラーが発生しました',
      requestId: req.requestId
    });
  }
});

// Me endpoint
router.get('/auth/me', (req, res) => {
  try {
    // セッションベースの認証をチェック
    if (req.session?.user) {
      console.log('[auth/me] Session-based auth:', req.session.user);
      return res.json({ 
        success: true, 
        user: req.session.user,
        authenticated: true,
        requestId: req.requestId
      });
    }

    // Bearer token認証をチェック
    const auth = req.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        console.log('[auth/me] Token-based auth:', payload);
        return res.json({ 
          success: true, 
          user: { id: payload.sub || payload.id, ...payload },
          authenticated: true,
          requestId: req.requestId
        });
      } catch (tokenError) {
        console.log('[auth/me] Invalid token:', tokenError.message);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_token',
          message: '無効なトークンです',
          requestId: req.requestId
        });
      }
    }

    // 未認証
    console.log('[auth/me] No authentication found');
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です',
      requestId: req.requestId
    });
    
  } catch (error) {
    console.error('[auth/me] Unexpected error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です',
      requestId: req.requestId
    });
  }
});

// Logout endpoint
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(`[${req.requestId}] Session destruction error:`, err);
      return res.status(500).json({
        success: false,
        error: 'logout_error',
        message: 'ログアウトでエラーが発生しました',
        requestId: req.requestId
      });
    }
    
    res.clearCookie('sid', { 
      path: '/',
      secure: true,
      sameSite: 'none'
    });
    
    res.json({ 
      success: true,
      requestId: req.requestId
    });
  });
});

// Mount API router
app.use('/api', router);

// Health endpoints (CI compatibility) - root level
app.get('/health', healthHandler);
app.get('/healthz', healthHandler);

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
  if (pool) {
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (pool) {
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});