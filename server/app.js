#!/usr/bin/env node

/**
 * Azure App Service Entry Point (CommonJS -> ESModules)
 * Direct dynamic import of ES Module azure-server.js
 * Maintains ESModules architecture while ensuring Azure compatibility
 */

const path = require('path');
const fs = require('fs');

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
        const serverPath = path.join(__dirname, 'azure-server.js');

        console.log('🎯 Target server file:', serverPath);

        // Check if azure-server.js exists
        if (!fs.existsSync(serverPath)) {
            console.error('❌ ERROR: azure-server.js not found at:', serverPath);
            console.error('📁 Files in current directory:');
            try {
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

        console.log('✅ azure-server.js found, loading ES Module directly...');

        // Direct dynamic import of ES Module - maintains ESModules architecture
        // This approach keeps the azure-server.js as ES Module while providing CommonJS compatibility
        const serverModule = await import('./azure-server.js');

        console.log('✅ ES Module azure-server.js loaded successfully');
        console.log('🎉 Server should be starting now...');

        // Keep the process alive - azure-server.js handles its own lifecycle
        console.log('🔄 Keeping wrapper process alive for Azure App Service...');

    } catch (error) {
        console.error('❌ Failed to load azure-server.js ES Module:', error);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 10).join('\n')
        });

        // Enhanced debugging for Azure App Service
        console.error('🔍 Azure App Service Debug Info:');
        console.error('   Current working directory:', process.cwd());
        console.error('   __dirname:', __dirname);
        console.error('   process.argv:', process.argv);
        console.error('   Node.js version:', process.version);
        console.error('   Platform:', process.platform);

        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📤 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception in wrapper:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection in wrapper:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
