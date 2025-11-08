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
    console.log(' 🔄 Attempting to import azure-server.js...');

    // Add process error handlers before import
    process.on('uncaughtException', (error) => {
      console.error(' 💥 UNCAUGHT EXCEPTION:', error);
      console.error(' 📍 Error Code:', error.code);
      console.error(' 📍 Error Errno:', error.errno);
      console.error(' 📍 Error Syscall:', error.syscall);
      console.error(' 📍 Error Path:', error.path);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(' 💥 UNHANDLED REJECTION at:', promise);
      console.error(' 📍 Reason:', reason);
      process.exit(1);
    });

    await import('./azure-server.js');
    console.log(' ✅ Production server loaded successfully');
  } catch (error) {
    console.error(' ❌ IMPORT ERROR:', error.message);
    console.error(' 📍 Error Code:', error.code);
    console.error(' 📍 Error Errno:', error.errno);
    console.error(' 📍 Error Syscall:', error.syscall);
    console.error(' 📍 Error Path:', error.path);
    console.error(' 📍 Full Stack:', error.stack);
    process.exit(1);
  }
}

startServer();
