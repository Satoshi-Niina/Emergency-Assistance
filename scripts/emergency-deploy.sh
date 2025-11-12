#!/bin/bash
# 緊急デプロイスクリプト - タイムアウト対策

set -e

echo "🚨 Emergency Deployment Script - Timeout Mitigation"
echo "=================================================="

# 設定
PROJECT_ROOT="c:/Users/Satoshi Niina/OneDrive/Desktop/system/Emergency-Assistance"
DEPLOY_DIR="emergency-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📦 Step 1: Creating minimal deployment package..."

# クリーンアップ
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

cd "$PROJECT_ROOT"

echo "📁 Copying essential server files..."
# 必須ファイルのみをコピー
cp -r server/*.js "$DEPLOY_DIR/"
cp -r server/*.mjs "$DEPLOY_DIR/"
cp -r server/*.ts "$DEPLOY_DIR/"
cp server/package.json "$DEPLOY_DIR/"
cp server/package-lock.json "$DEPLOY_DIR/" 2>/dev/null || echo "No package-lock.json found"

# web.config があれば追加
[ -f server/web.config ] && cp server/web.config "$DEPLOY_DIR/"

echo "🏗️ Building client (if not exists)..."
if [ ! -d "client/dist" ]; then
    echo "Client dist not found, building..."
    cd client
    npm ci --prefer-offline --no-audit --no-fund
    npm run build
    cd ..
fi

echo "📁 Copying client build..."
mkdir -p "$DEPLOY_DIR/client"
cp -r client/dist "$DEPLOY_DIR/client/"

echo "⚡ Optimizing package.json for production..."
cd "$DEPLOY_DIR"

# package.json の最適化
cat > package_optimized.json << 'EOF'
{
  "name": "emergency-assistance-server",
  "version": "1.0.3",
  "main": "app.js",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "@azure/identity": "^4.0.1",
    "@azure/storage-blob": "^12.20.0",
    "bcryptjs": "^2.4.3",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.21.2",
    "express-rate-limit": "^8.1.0",
    "express-session": "^1.18.2",
    "express-validator": "^7.2.1",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.1",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.16.3",
    "uuid": "^13.0.0"
  }
}
EOF

mv package_optimized.json package.json

echo "📊 Package Statistics:"
echo "   Files: $(find . -type f | wc -l)"
echo "   Size: $(du -sh . | cut -f1)"

echo "✅ Emergency deployment package ready!"
echo ""
echo "🚀 Next Steps:"
echo "1. Zip this directory: $DEPLOY_DIR"
echo "2. Use Azure Portal ZIP Deploy:"
echo "   Portal > App Services > Emergency-Assistance > Deployment Center"
echo "3. Or use Azure CLI:"
echo "   az webapp deployment source config-zip --name Emergency-Assistance --src deploy.zip"
echo ""
echo "📍 Package location: $PROJECT_ROOT/$DEPLOY_DIR"

# ZIP作成（オプション）
if command -v zip &> /dev/null; then
    echo "📦 Creating ZIP file..."
    zip -r "../emergency-deploy-${TIMESTAMP}.zip" .
    echo "✅ ZIP created: emergency-deploy-${TIMESTAMP}.zip"
else
    echo "💡 Install zip utility to auto-create deployment ZIP"
fi

cd ..
echo "🎯 Emergency deployment package ready for manual deployment!"
