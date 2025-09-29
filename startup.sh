#!/bin/bash
# Custom startup script for Azure App Service

echo "🚀 Starting Emergency Assistance Server..."

# Set Node.js version
export WEBSITES_NODE_DEFAULT_VERSION=20.19.3
export NODEJS_VERSION=20.19.3
export NODE_VERSION=20.19.3

# Set environment variables
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
export SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
export FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# Verify Node.js version
echo "📊 Node.js version: $(node --version)"
echo "📊 NPM version: $(npm --version)"

# Start the application
echo "🚀 Starting application..."
node production-server.js
