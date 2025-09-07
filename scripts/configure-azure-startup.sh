#!/bin/bash
# Azure App Service設定用スクリプト

RESOURCE_GROUP="your-resource-group"
APP_NAME="emergencyassistance-sv"

echo "Azure App ServiceでのStartup Commandを設定中..."

# Startup Commandをnpm startに設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "npm start"

echo "設定完了: npm start"

# 設定の確認
echo "現在の設定を確認中..."
az webapp config show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --query "appCommandLine"

echo "設定が完了しました！"
