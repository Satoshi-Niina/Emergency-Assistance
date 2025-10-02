#!/bin/bash

# Azure App Service クイックデプロイスクリプト
# CORS問題とサーバー起動問題を修正

RESOURCE_GROUP="emergency-assistance-rg"
APP_NAME="emergencyassistance-sv-fbanemhrbshuf9bd"

echo "🚀 Azure App Service クイックデプロイ開始..."

# 1. 環境変数設定
echo "🔧 環境変数設定中..."
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        PORT=8080 \
        FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
        BYPASS_DB_FOR_LOGIN=true \
    --output none

# 2. スタートアップコマンド設定
echo "🚀 スタートアップコマンド設定中..."
az webapp config set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --startup-file "node azure-server.js" \
    --output table

# 3. Node.js バージョン設定
echo "📦 Node.js バージョン設定中..."
az webapp config set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --node-version "20-lts" \
    --output table

# 4. App Service再起動
echo "🔄 App Service再起動中..."
az webapp restart \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

echo "✅ 設定完了！"
echo "フロントエンド: https://witty-river-012f39e00.1.azurestaticapps.net"
echo "バックエンド: https://$APP_NAME.japanwest-01.azurewebsites.net"
echo "ヘルスチェック: https://$APP_NAME.japanwest-01.azurewebsites.net/api/health"
