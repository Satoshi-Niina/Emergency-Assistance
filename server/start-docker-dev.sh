#!/bin/bash
# Docker開発環境の自動更新スクリプト

echo "🐳 Docker開発環境を起動中..."
echo "📝 ファイル変更時に自動でコンテナが更新されます"

# serverディレクトリに移動してDocker Compose Watchを実行
cd server

# Docker Compose Watch機能で自動更新を有効化
docker-compose watch

echo "✅ Docker開発環境が起動しました"
echo "🔄 ファイルを編集すると自動的にコンテナが更新されます"
echo "🔗 アクセスURL: http://localhost:8080"
echo "📊 PostgreSQL: localhost:5432"
