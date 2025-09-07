// Azure App Service用の最小限ローダー - エラー回避版 + Blob Storage対応
console.log('🔥 Azure Loader start -', new Date().toISOString());
console.log('📍 NODE_VERSION:', process.version);
console.log('📍 PLATFORM:', process.platform);
console.log('📍 ENV - PORT:', process.env.PORT, 'NODE_ENV:', process.env.NODE_ENV);
console.log('📍 BLOB_STORAGE:', process.env.AZURE_STORAGE_CONNECTION_STRING ? 'CONFIGURED' : 'NOT CONFIGURED');

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    // Azure App Service環境での安全な設定
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    
    const distDir = __dirname;
    const appUrl = pathToFileURL(path.join(distDir, 'app.js')).href;
    console.log('📥 Importing app from', appUrl);
    
    const mod = await import(appUrl);
    const app = mod.default || mod.app || mod;
    
    if (!app || typeof app.listen !== 'function') {
      throw new Error('Invalid app export - not an Express app');
    }
    
    const port = Number(process.env.PORT) || 8080;
    
    // favicon handler
    app.get('/favicon.ico', (_req, res) => res.status(204).end());
    
    // Emergency health check (before app.listen)
    app.get('/azure-health', (_req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        loader: 'azure-safe-loader'
      });
    });
    
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('🚀 Azure App Service started successfully');
      console.log(`🌐 Port: ${port}`);
      console.log('📊 Health: /azure-health');
      console.log('📊 API Health: /api/health');
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`📥 Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('🔚 Server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Error handling
    server.on('error', (error) => {
      console.error('🚨 Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('💥 Critical startup error:', error);
    console.error('Stack:', error.stack);
    
    // Emergency fallback server
    const express = await import('express');
    const fallbackApp = express.default();
    
    fallbackApp.get('*', (req, res) => {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    const port = Number(process.env.PORT) || 8080;
    fallbackApp.listen(port, '0.0.0.0', () => {
      console.log(`🆘 Fallback server running on port ${port}`);
    });
  }
})();
