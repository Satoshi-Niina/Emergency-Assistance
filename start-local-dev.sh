#!/usr/bin/env bash

# ローカル開発環境の起動スクリプト
# 本番環境との完全分離

echo "🚀 Starting Local Development Environment..."

# 環境変数の確認
echo "📊 Environment Check:"
echo "  - NODE_ENV: ${NODE_ENV:-development}"
echo "  - PORT: ${PORT:-8000}"
echo "  - FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}"

# ローカル環境変数ファイルの確認
if [ -f "local.env" ]; then
    echo "✅ Found local.env file"
else
    echo "⚠️ local.env file not found, using system environment variables"
fi

# ローカルサーバーを起動
echo "🔧 Starting local development server..."
node server/local-server.js
