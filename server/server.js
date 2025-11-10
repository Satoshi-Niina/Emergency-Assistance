#!/usr/bin/env node

// Azure App Service ES Modules Entry Point
// This file serves as a CommonJS wrapper for the ES Module azure-server.js

const path = require('path');
const { spawn } = require('child_process');

console.log('🔄 Azure App Service ES Module Wrapper Starting...');
console.log('📍 Current directory:', process.cwd());
console.log('🏗️ Node.js version:', process.version);
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');

// Azure App Service specific environment setup
process.env.PORT = process.env.PORT || 8000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Resolve the path to azure-server.js
const serverPath = path.join(__dirname, 'azure-server.js');
console.log('🎯 Target server file:', serverPath);

// Check if azure-server.js exists
const fs = require('fs');
if (!fs.existsSync(serverPath)) {
    console.error('❌ ERROR: azure-server.js not found at:', serverPath);
    console.error('📋 Available files in current directory:');
    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => console.error('   -', file));
    } catch (err) {
        console.error('Cannot read directory:', err.message);
    }
    process.exit(1);
}

console.log('✅ azure-server.js found, launching ES Module...');

// Launch the ES Module with node --experimental-modules if needed
const nodeArgs = [
    serverPath
];

// For older Node.js versions that need experimental modules flag
const nodeMajorVersion = parseInt(process.version.split('.')[0].substring(1));
if (nodeMajorVersion < 14) {
    nodeArgs.unshift('--experimental-modules');
}

console.log('🚀 Launching with args:', nodeArgs);

const child = spawn('node', nodeArgs, {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname
});

child.on('error', (err) => {
    console.error('❌ Failed to start azure-server.js:', err);
    process.exit(1);
});

child.on('exit', (code, signal) => {
    console.log('📊 azure-server.js exited with code:', code, 'signal:', signal);
    process.exit(code);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('📤 Received SIGTERM, forwarding to child process...');
    child.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('📤 Received SIGINT, forwarding to child process...');
    child.kill('SIGINT');
});

// Keep the wrapper alive
process.on('exit', () => {
    console.log('🔚 Azure App Service wrapper exiting...');
});

console.log('🔄 Azure App Service ES Module Wrapper initialized successfully');
