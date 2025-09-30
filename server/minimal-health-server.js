#!/usr/bin/env node

// Minimal health server for Azure App Service testing
// This server only provides health check endpoints

import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(express.json());

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Emergency Assistance - Minimal Health Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal Health Server running on 0.0.0.0:${PORT}`);
  console.log(`📊 Health check endpoints:`);
  console.log(`   - http://0.0.0.0:${PORT}/api/health`);
  console.log(`   - http://0.0.0.0:${PORT}/api/healthz`);
  console.log(`   - http://0.0.0.0:${PORT}/ping`);
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
