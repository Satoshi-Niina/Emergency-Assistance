#!/usr/bin/env node

// Minimal ESM production server for auth testing
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// CORS configuration
const ALLOW = new Set([
  'http://localhost:5173',
  'http://localhost:5175',
  'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net'
]);

const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    console.log('🔍 CORS Origin check:', { origin, allowed: ALLOW.has(origin) });
    // 開発環境では localhost をすべて許可
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    if (ALLOW.has(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    console.log('🏥 Health check request:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ 
      ok: true, 
      status: 'healthy',
      timestamp: new Date().toISOString(),
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
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '(unknown)',
    builtAt: process.env.BUILT_AT || new Date().toISOString()
  });
});

// Diagnostic endpoints
app.get('/api/_diag/env', (req, res) => {
  function mark(k){ return process.env[k] ? 'SET' : 'UNSET'; }
  res.json({
    STORAGE_BASE_PREFIX: process.env.STORAGE_BASE_PREFIX || '(empty)',
    AZURE_STORAGE_CONNECTION_STRING: mark('AZURE_STORAGE_CONNECTION_STRING'),
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || '(empty)',
    FRONTEND_URL: process.env.FRONTEND_URL || '(empty)',
    NODE_ENV: process.env.NODE_ENV || '(empty)'
  });
});

app.get('/api/_diag/routes', (req, res) => {
  const router = app && app._router ? app._router : null;
  const stack = router && Array.isArray(router.stack) ? router.stack : [];
  const paths = [];
  for (let i = 0; i < stack.length; i++) {
    const r = stack[i];
    if (r && r.route && r.route.path) paths.push(r.route.path);
  }
  res.json({ count: paths.length, paths: paths });
});

// Simple auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    console.log('🔐 Login attempt:', { username, timestamp: new Date().toISOString() });
    
    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // Simple demo login for testing
    if (username === 'test' && password === 'test') {
      return res.json({ 
        success: true, 
        token: 'demo-token',
        user: { 
          id: 'demo', 
          username: 'test',
          role: 'user'
        }
      });
    }

    return res.status(401).json({ 
      success: false, 
      error: 'invalid_credentials',
      message: 'ユーザー名またはパスワードが正しくありません'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 ESM Production server running on port ${PORT}`);
  console.log('✅ ESM conversion successful!');
  console.log('📡 Available endpoints:');
  console.log('  - GET /api/health');
  console.log('  - GET /api/version');
  console.log('  - GET /api/_diag/env');
  console.log('  - GET /api/_diag/routes');
  console.log('  - POST /api/auth/login');
});
