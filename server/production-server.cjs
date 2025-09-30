#!/usr/bin/env node

// Production-ready server for Azure App Service (CJS version)
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
const fs = require('fs');
const path = require('path');

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

// Create uploads directory if needed
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

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
    if (global.dbPool) {
      try {
        await global.dbPool.query('SELECT NOW()');
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
      service: 'Emergency Assistance Backend',
      nodeVersion: process.version,
      app: 'ok',
      dbStatus: dbStatus
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

// Health check endpoints
app.get('/api/health', healthCheck);
app.get('/api/healthz', healthCheck);
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://witty-river-012f39e00.1.azurestaticapps.net',
      'http://localhost:5173',
      'http://localhost:5175',
      'http://localhost:3000',
      'http://localhost:8000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database connection
let dbPool;
try {
  if (process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PG_SSL === 'require' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    global.dbPool = dbPool;
    
    dbPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    console.log('✅ Database pool initialized');
  } else {
    console.warn('⚠️ DATABASE_URL not set, running without database');
  }
} catch (dbError) {
  console.error('❌ Database initialization failed:', dbError);
}

// Basic routes
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Emergency Assistance Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', require('./routes/index.cjs'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
  console.log(`📊 Health check endpoints:`);
  console.log(`   - http://0.0.0.0:${PORT}/api/health`);
  console.log(`   - http://0.0.0.0:${PORT}/api/healthz`);
  console.log(`   - http://0.0.0.0:${PORT}/ping`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${corsOptions.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (dbPool) {
    await dbPool.end();
    console.log('Database pool closed');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (dbPool) {
    await dbPool.end();
    console.log('Database pool closed');
  }
  process.exit(0);
});
