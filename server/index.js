#!/usr/bin/env node

// Main entry point for Azure App Service
// This file ensures that production-server.js is started correctly

console.log('🚀 Starting Emergency Assistance Backend...');
console.log('📁 Working directory:', process.cwd());
console.log('📄 Main file:', __filename);
console.log('⏰ Start time:', new Date().toISOString());

// Start the production server
require('./production-server.js');
