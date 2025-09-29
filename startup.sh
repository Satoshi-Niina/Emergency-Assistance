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

# Check if we can use Node.js 20
if command -v node20 &> /dev/null; then
    echo "🔄 Using Node.js 20..."
    node20 production-server.js
elif [ -f "/opt/nodejs/20.19.3/bin/node" ]; then
    echo "🔄 Using Node.js 20 from /opt/nodejs/20.19.3/bin/node..."
    /opt/nodejs/20.19.3/bin/node production-server.js
elif [ -f "/usr/local/bin/node20" ]; then
    echo "🔄 Using Node.js 20 from /usr/local/bin/node20..."
    /usr/local/bin/node20 production-server.js
else
    echo "⚠️  Node.js 20 not found, using default Node.js..."
    echo "📊 Current Node.js version: $(node --version)"
    
    # Try to install Node.js 20 without sudo
    echo "🔄 Attempting to install Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update
    apt-get install -y nodejs
    
    # Check if installation was successful
    if command -v node &> /dev/null; then
        echo "✅ Node.js installation successful"
        echo "📊 New Node.js version: $(node --version)"
        node production-server.js
    else
        echo "❌ Node.js installation failed, using default version"
        node production-server.js
    fi
fi
