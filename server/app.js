#!/usr/bin/env node

/**
 * Azure App Service Entry Point (CommonJS)
 * Spawns ES Module azure-server.js as child process
 * Windows Web App compatible
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Azure App Service environment setup
console.log('🚀 Azure App Service Entry Point Starting (CommonJS)...');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🏗️ Node.js Version: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔌 Port: ${process.env.PORT || 'not set'}`);

// Ensure required environment variables
process.env.PORT = process.env.PORT || 8000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function startServer() {
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

        console.log('✅ azure-server.js found, spawning process...');

        // Spawn Node.js process for ES Module
        const nodeArgs = [serverPath];
        const child = spawn('node', nodeArgs, {
            stdio: 'inherit', // Pass through stdin, stdout, stderr
            env: process.env,
            cwd: __dirname
        });

        child.on('error', (err) => {
            console.error('❌ Failed to spawn azure-server.js:', err);
            process.exit(1);
        });

        child.on('exit', (code, signal) => {
            console.log('� azure-server.js exited with code:', code, 'signal:', signal);
            if (code !== 0) {
                console.error('❌ Server exited with non-zero code');
                process.exit(code || 1);
            }
        });

        // Forward signals to child process
        process.on('SIGTERM', () => {
            console.log('� Received SIGTERM, forwarding to child...');
            child.kill('SIGTERM');
        });

        process.on('SIGINT', () => {
            console.log('📤 Received SIGINT, forwarding to child...');
            child.kill('SIGINT');
        });

        console.log('🎉 Azure server process spawned successfully');
        console.log('🔄 Waiting for server to start...');

    } catch (error) {
        console.error('❌ Failed to start server process:', error);
        console.error('� Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n')
        });
        process.exit(1);
    }
}

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
