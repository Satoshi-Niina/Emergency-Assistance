#!/usr/bin/env node

// Main entry point for Azure App Service - Simplified to avoid EISDIR
console.log(' Starting Emergency Assistance Backend...');
console.log(' Working directory:', process.cwd());
console.log(' Start time:', new Date().toISOString());

// Environment check
console.log(' Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('  - PORT:', process.env.PORT || 'undefined');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Direct import of azure-server.js
console.log(' Loading production server...');

async function startServer() {
  try {
    await import('./azure-server.js');
    console.log(' Production server loaded successfully');
  } catch (error) {
    console.error(' ERROR:', error.message);
    console.error(' Stack:', error.stack);
    process.exit(1);
  }
}

startServer();
