#!/bin/bash
# Docker用クリーンビルドスクリプト
# 修正があった際の完全なクリーンビルド手順

echo "🧹 Docker用クリーンビルド開始..."

# 1. 既存のDockerコンテナとイメージを停止・削除
echo "🛑 既存のDockerコンテナを停止中..."
docker-compose -f server/docker-compose.yml down 2>/dev/null || true
docker stop emergency-assistance 2>/dev/null || true
docker rm emergency-assistance 2>/dev/null || true

echo "🗑️ 既存のDockerイメージを削除中..."
docker rmi emergency-assistance 2>/dev/null || true
docker rmi emergency-assistance_backend 2>/dev/null || true

# 2. フロントエンドのビルドファイルを削除
echo "🗑️ フロントエンドのビルドファイルを削除中..."
rm -rf client/dist

# 3. サーバーのpublicフォルダを削除
echo "🗑️ サーバーのpublicフォルダを削除中..."
rm -rf server/public

# 4. node_modulesのキャッシュをクリア
echo "🗑️ node_modulesキャッシュをクリア中..."
rm -rf node_modules/.cache

# 5. Docker Composeでビルド・起動
echo "🔨 Docker Composeでビルド・起動中..."
docker-compose -f server/docker-compose.yml up --build -d

if [ $? -eq 0 ]; then
    echo "✅ Docker Compose起動完了"
else
    echo "❌ Docker Compose起動に失敗しました"
    exit 1
fi

# 6. ログを表示
echo "📝 アクセス先: http://localhost:8080"
echo "🔗 API: http://localhost:8080/api"
echo "💡 ブラウザでハードリフレッシュ (Ctrl+Shift+R) を実行してください"
echo "📊 ログを表示中... (Ctrl+C で停止)"

docker-compose -f server/docker-compose.yml logs -f
