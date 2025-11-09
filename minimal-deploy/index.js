#!/usr/bin/env node

// 緊急修復用の最小限サーバー - node_modules問題を解決するため
// Azure上で自動的にnpm installが実行されることを確認

console.log('🚀 Emergency Assistance Server - Minimal Deploy');
console.log('📦 Node.js:', process.version);
console.log('📁 Working Directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Critical modules check
const requiredModules = ['express', 'cors', 'pg', '@azure/storage-blob', 'bcryptjs'];

console.log('🔍 Checking required modules...');

let allModulesAvailable = true;

for (const moduleName of requiredModules) {
    try {
        await import(moduleName);
        console.log(`✅ ${moduleName}: Available`);
    } catch (error) {
        console.error(`❌ ${moduleName}: Missing - ${error.message}`);
        allModulesAvailable = false;
    }
}

if (!allModulesAvailable) {
    console.error('❌ Critical modules are missing!');
    console.error('🔧 This indicates that npm install was not executed during deployment');
    console.error('📋 Expected location: /home/site/wwwroot/node_modules/');

    // List current directory contents for debugging
    try {
        const fs = await import('fs');
        const path = await import('path');

        console.log('\n📂 Current directory contents:');
        const files = await fs.promises.readdir(process.cwd());
        files.forEach(file => console.log(`  - ${file}`));

        // Check if node_modules exists
        if (files.includes('node_modules')) {
            console.log('\n📦 node_modules contents:');
            const nodeModules = await fs.promises.readdir('node_modules');
            console.log(`  Found ${nodeModules.length} modules`);
            nodeModules.slice(0, 10).forEach(mod => console.log(`  - ${mod}`));
            if (nodeModules.length > 10) {
                console.log(`  ... and ${nodeModules.length - 10} more`);
            }
        } else {
            console.log('❌ node_modules directory not found!');
        }
    } catch (fsError) {
        console.error('❌ Cannot access filesystem:', fsError.message);
    }

    process.exit(1);
}

// If all modules are available, start basic Express server
console.log('✅ All required modules available - starting server...');

const express = (await import('express')).default;
const cors = (await import('cors')).default;

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Emergency Assistance Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0-MINIMAL',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'production',
        modulesStatus: 'all-available'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Emergency Assistance Server - Minimal Deploy',
        status: 'operational',
        endpoints: ['/api/health'],
        timestamp: new Date().toISOString()
    });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🎉 Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`✅ Emergency server deployment successful!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err);
    console.error('Stack trace:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
});
