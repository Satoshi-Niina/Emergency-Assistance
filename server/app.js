#!/usr/bin/env node

/**
 * Azure App Service Entry Point
 * CommonJS wrapper for ES Module azure-server.js
 * Optimized for Azure App Service reliability
 */

const path = require('path');

// Azure App Service environment setup
console.log('🚀 Azure App Service Entry Point Starting...');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🏗️ Node.js Version: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔌 Port: ${process.env.PORT || 'not set'}`);

// Ensure required environment variables
process.env.PORT = process.env.PORT || 8000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function startServer() {
    try {
        console.log('📦 Loading ES Module azure-server.js...');

        // Import the ES Module azure-server.js
        const serverModule = await import('./azure-server.js');

        console.log('✅ Azure server module loaded successfully');
        console.log('🎯 Server should be starting on port:', process.env.PORT);

        // The azure-server.js exports the app by default and starts the server
        // No need to do anything else here as the module handles its own startup

    } catch (error) {
        console.error('❌ Failed to start azure-server.js:', error);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n')
        });

        // List files in current directory for debugging
        console.error('📁 Files in current directory:');
        try {
            const fs = require('fs');
            const files = fs.readdirSync(__dirname);
            files.forEach(file => {
                const stats = fs.statSync(path.join(__dirname, file));
                console.error(`   ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
            });
        } catch (listError) {
            console.error('Cannot list directory contents:', listError.message);
        }

        process.exit(1);
    }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('📤 Received SIGTERM signal, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 Received SIGINT signal, shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
