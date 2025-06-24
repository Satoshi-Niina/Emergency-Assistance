#!/bin/bash

# Emergency Assistance System デプロイスクリプト
# 使用方法: ./scripts/deploy.sh [production|staging]

set -e

# 設定
ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DEPLOY_DIR="./deploy"

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 環境チェック
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    log_error "Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment..."

# 1. 依存関係のインストール
log_info "Installing dependencies..."
npm ci

# 2. 共有ライブラリのビルド
log_info "Building shared library..."
npm run build:shared

# 3. クライアントのビルド
log_info "Building client..."
npm run build:client

# 4. サーバーのビルド
log_info "Building server..."
npm run build:server

# 5. データベースマイグレーション（本番環境のみ）
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Running database migration..."
    npm run db:migrate
fi

# 6. デプロイディレクトリの準備
log_info "Preparing deployment directory..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# 7. 必要なファイルのコピー
log_info "Copying build artifacts..."
cp -r client/dist $DEPLOY_DIR/client
cp -r server/dist $DEPLOY_DIR/server
cp -r shared/dist $DEPLOY_DIR/shared
cp -r knowledge-base $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/

# 8. 環境変数ファイルの設定
if [[ "$ENVIRONMENT" == "production" ]]; then
    cp env.production $DEPLOY_DIR/.env
else
    cp env.staging $DEPLOY_DIR/.env
fi

# 9. バックアップの作成（本番環境のみ）
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating backup..."
    mkdir -p $BACKUP_DIR
    tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz $DEPLOY_DIR
fi

# 10. デプロイ実行
log_info "Deploying to $ENVIRONMENT..."
# ここに実際のデプロイコマンドを記述
# 例: rsync, scp, またはクラウドプロバイダーのCLI

# 11. ヘルスチェック
log_info "Performing health check..."
sleep 10
curl -f http://localhost:3001/api/health || {
    log_error "Health check failed"
    exit 1
}

log_info "Deployment to $ENVIRONMENT completed successfully!" 