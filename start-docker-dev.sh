#!/bin/bash
# Docker開発環境の自動更新スクリプト

echo "🐳 Docker開発環境を起動中..."

# Docker Composeで開発環境を起動（ファイル監視付き）
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Docker開発環境が起動しました"
echo "📝 ファイルを編集すると自動的にコンテナが再ビルドされます"
echo "🔗 アクセスURL: http://localhost:8080"
