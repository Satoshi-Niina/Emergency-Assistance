#!/usr/bin/env bash

# 統合環境の起動スクリプト
# Docker環境で動作する統合サーバー

echo "🚀 Starting Emergency Assistance System..."

# 環境変数の確認
echo "📊 Environment Check:"
echo "  - NODE_ENV: ${NODE_ENV:-production}"
echo "  - PORT: ${PORT:-8080}"
echo "  - API_BASE_URL: ${API_BASE_URL:-/api}"
echo "  - CORS_ALLOW_ORIGINS: ${CORS_ALLOW_ORIGINS:-*}"

# Runtime config生成
echo "🔧 Generating runtime config..."
cat > public/runtime-config.js << EOF
window.runtimeConfig = {
  API_BASE_URL: "${API_BASE_URL:-/api}",
  CORS_ALLOW_ORIGINS: "${CORS_ALLOW_ORIGINS:-*}"
};
EOF

echo "✅ Runtime config generated:"
cat public/runtime-config.js

# 統合サーバーを起動
echo "🌐 Starting unified server..."
node server/unified-server.js
