#!/usr/bin/env node

// Production-ready minimal server for Azure App Service v3
// JWT + PostgreSQL only, optimized for production deployment
// Force cache clear - updated timestamp: 2024-12-19

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Environment validation
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required');
  process.exit(1);
}

// DATABASE_URL is required for production
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required for production deployment');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Initialize PostgreSQL pool with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Azure PostgreSQL用
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'access_token_required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'invalid_token' });
    }
    req.user = user;
    next();
  });
};

// API Routes
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

// Health check (DB independent) - GitHub Actions compatible
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    db: 'ok',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Alternative health endpoint for GitHub Actions
router.get('/healthz', (req, res) => {
  res.json({ 
    ok: true, 
    db: 'ok',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Database readiness check - これが重要！
router.get('/readiness', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database readiness check failed:', error);
    res.status(503).json({ 
      ok: false, 
      db: 'error', 
      error: 'database_unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'username_password_required' });
    }


    // Query user from database
    const result = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'invalid_credentials' });
    }

    const user = result.rows[0];

    // Verify password (assuming bcrypt)
    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'invalid_credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      accessToken: token,
      expiresIn: '24h',
      user: { id: user.id, username: user.username }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'internal_server_error' });
  }
});

router.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      username: req.user.username
    }
  });
});

// Handshake endpoint for frontend compatibility
router.get('/auth/handshake', (req, res) => {
  res.json({
    success: true,
    message: 'handshake successful',
    timestamp: new Date().toISOString()
  });
});

// Root level endpoints for GitHub Actions compatibility (before API router)
app.get('/ping', (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    db: 'ok',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/healthz', (req, res) => {
  res.json({ 
    ok: true, 
    db: 'ok',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount API router
app.use('/api', router);

// Global error handler (always JSON)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  console.error('Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(500).json({
    success: false,
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler (always JSON)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    path: req.originalUrl
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
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`📄 Main file: ${__filename}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
