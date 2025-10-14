#!/bin/bash

# ホットリロード統合開発サーバー起動スクリプト
# 元ファイルを直接修正・確認できる開発環境

echo "🔥 Emergency Assistance ホットリロード開発環境を起動中..."
echo "📝 特徴:"
echo "  - 元ファイルを直接修正・確認"
echo "  - ビルド不要、即座に反映"
echo "  - フロントエンド・バックエンド統合"
echo "  - Docker不要"
echo "  - 本番環境と同じAPIエンドポイント"

# 環境変数の設定
export NODE_ENV="development"
export PORT="8080"
export CLIENT_PORT="5173"
export DATABASE_URL="postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb"
export JWT_SECRET="dev-secret-key-32-characters-long"
export SESSION_SECRET="dev-session-secret-32-characters-long"
export FRONTEND_URL="http://localhost:8080"
export BYPASS_DB_FOR_LOGIN="true"
export OPENAI_API_KEY="sk-CHANGE_THIS_TO_YOUR_ACTUAL_OPENAI_API_KEY"
export CORS_ALLOW_ORIGINS="http://localhost:8080,http://localhost:5173"

echo "⚙️ 環境変数設定完了"

# 統合ホットリロードサーバーを起動
echo "🚀 統合ホットリロードサーバーを起動中..."

node server/unified-hot-reload-server.js

echo "✅ ホットリロード開発環境が起動しました！"
echo "🌐 アクセス: http://localhost:8080"
echo "🔗 API: http://localhost:8080/api"
echo "🔥 ホットリロード: 有効"
echo "📝 ファイルを編集すると即座に反映されます"
echo "💡 停止するには Ctrl+C を押してください"
