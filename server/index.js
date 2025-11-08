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

    import('./azure-server.js').then(module => {
      console.log('✅ Azure server module loaded successfully');
      console.log('📊 Server startup completed at:', new Date().toISOString());
    }).catch(error => {
      console.error('❌ Failed to load azure-server.js:', error);
      console.error('Stack trace:', error.stack);

      // Enhanced EISDIR debugging
      if (error.code === 'EISDIR') {
        console.error('🔍 EISDIR Details:');
        console.error('  - Path:', error.path);
        console.error('  - Syscall:', error.syscall);
        console.error('  - Errno:', error.errno);
        console.error('  - Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      }

      process.exit(1);
    });

    // Catch any unhandled rejections during module loading
    process.on('unhandledRejection', (reason, promise) => {
      console.error('⚠️ Unhandled promise rejection during startup:', promise, 'reason:', reason);
      if (reason && reason.code === 'EISDIR') {
        console.error('🔍 EISDIR in promise rejection:');
        console.error('  - Path:', reason.path);
        console.error('  - Syscall:', reason.syscall);
        console.error('  - Errno:', reason.errno);
        console.error('  - Full error object:', JSON.stringify(reason, Object.getOwnPropertyNames(reason), 2));
      }
    });
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
