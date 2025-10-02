#!/usr/bin/env bash

# 本番環境の起動スクリプト
# Azure App Service用

echo "🚀 Starting Production Environment..."

# 環境変数の確認
echo "📊 Environment Check:"
echo "  - NODE_ENV: ${NODE_ENV:-production}"
echo "  - PORT: ${PORT:-8080}"
echo "  - DATABASE_URL: ${DATABASE_URL:+SET}"
echo "  - PG_SSL: ${PG_SSL:-not_set}"
echo "  - FRONTEND_URL: ${FRONTEND_URL:-not_set}"

# 本番サーバーを起動
echo "🔧 Starting production server..."
node server/production-server.js
