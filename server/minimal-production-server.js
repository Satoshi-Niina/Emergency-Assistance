#!/usr/bin/env node

// Minimal production server for Azure App Service
// Focus on health check and basic functionality

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://witty-river-012f39e00.1.azurestaticapps.net',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production'
  });
});

// Additional health endpoints
app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    arch: process.arch
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// Environment info endpoint
app.get('/api/_diag/env', (req, res) => {
  const mask = (key) => process.env[key] ? '***' : '(unset)';
  res.json({
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      FRONTEND_URL: process.env.FRONTEND_URL,
      JWT_SECRET: mask('JWT_SECRET'),
      SESSION_SECRET: mask('SESSION_SECRET'),
      DATABASE_URL: mask('DATABASE_URL'),
      PGSSLMODE: process.env.PGSSLMODE || '(unset)'
    }
  });
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Assistance API Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`🚀 Server running on ${host}:${port}`);
  console.log(`📊 Health check available at /api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
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
