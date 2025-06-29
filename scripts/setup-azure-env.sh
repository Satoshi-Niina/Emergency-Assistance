#!/bin/bash

# Azure Web App環境変数設定スクリプト
# 使用方法: ./scripts/setup-azure-env.sh

set -e

# 設定
RESOURCE_GROUP="emergency-assistance-rg"
WEBAPP_NAME="emergency-backend-api"
FRONTEND_URL="https://emergency-assistance-app.azurestaticapps.net"

echo "🚀 Azure Web App環境変数設定開始"
echo "リソースグループ: $RESOURCE_GROUP"
echo "Web App名: $WEBAPP_NAME"
echo "フロントエンドURL: $FRONTEND_URL"
echo ""

# 環境変数の設定
echo "📝 環境変数を設定中..."

az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    FRONTEND_URL="$FRONTEND_URL" \
    TRUST_PROXY=true \
    CORS_ORIGIN="$FRONTEND_URL" \
    LOG_LEVEL=info

echo "✅ 基本環境変数設定完了"

# データベース設定（要確認）
echo ""
echo "⚠️  データベース設定を確認してください:"
echo "   DATABASE_URL=postgresql://username:password@host:port/database"
echo "   SESSION_SECRET=your-super-secret-session-key"
echo ""

read -p "データベースURLを入力してください: " DATABASE_URL
read -p "セッションシークレットを入力してください: " SESSION_SECRET

if [ -n "$DATABASE_URL" ] && [ -n "$SESSION_SECRET" ]; then
  az webapp config appsettings set \
    --name "$WEBAPP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
      DATABASE_URL="$DATABASE_URL" \
      SESSION_SECRET="$SESSION_SECRET"
  
  echo "✅ データベース設定完了"
else
  echo "⚠️  データベース設定をスキップしました"
fi

# Azure Storage設定（オプション）
echo ""
read -p "Azure Storage設定を行いますか？ (y/N): " SETUP_STORAGE

if [[ $SETUP_STORAGE =~ ^[Yy]$ ]]; then
  read -p "Azure Storage接続文字列を入力してください: " AZURE_STORAGE_CONNECTION_STRING
  read -p "Azure Storageアカウント名を入力してください: " AZURE_STORAGE_ACCOUNT_NAME
  read -p "Azure Storageアカウントキーを入力してください: " AZURE_STORAGE_ACCOUNT_KEY
  
  if [ -n "$AZURE_STORAGE_CONNECTION_STRING" ] && [ -n "$AZURE_STORAGE_ACCOUNT_NAME" ] && [ -n "$AZURE_STORAGE_ACCOUNT_KEY" ]; then
    az webapp config appsettings set \
      --name "$WEBAPP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --settings \
        AZURE_STORAGE_CONNECTION_STRING="$AZURE_STORAGE_CONNECTION_STRING" \
        AZURE_STORAGE_ACCOUNT_NAME="$AZURE_STORAGE_ACCOUNT_NAME" \
        AZURE_STORAGE_ACCOUNT_KEY="$AZURE_STORAGE_ACCOUNT_KEY" \
        AZURE_STORAGE_CONTAINER_NAME="knowledge-base"
    
    echo "✅ Azure Storage設定完了"
  else
    echo "⚠️  Azure Storage設定をスキップしました"
  fi
fi

# OpenAI設定（オプション）
echo ""
read -p "OpenAI設定を行いますか？ (y/N): " SETUP_OPENAI

if [[ $SETUP_OPENAI =~ ^[Yy]$ ]]; then
  read -p "OpenAI APIキーを入力してください: " OPENAI_API_KEY
  
  if [ -n "$OPENAI_API_KEY" ]; then
    az webapp config appsettings set \
      --name "$WEBAPP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --settings \
        OPENAI_API_KEY="$OPENAI_API_KEY"
    
    echo "✅ OpenAI設定完了"
  else
    echo "⚠️  OpenAI設定をスキップしました"
  fi
fi

# 設定確認
echo ""
echo "📋 現在の設定を確認中..."
az webapp config appsettings list \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].{name:name, value:value}" \
  --output table

echo ""
echo "🎉 環境変数設定完了！"
echo ""
echo "次のステップ:"
echo "1. Web Appを再起動してください"
echo "2. ログを確認してエラーがないかチェックしてください"
echo "3. フロントエンドからAPIリクエストをテストしてください" 