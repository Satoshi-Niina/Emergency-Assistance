#!/bin/bash

# Azure Service Principal作成スクリプト
# 使用方法: ./create-azure-service-principal.sh

echo "🔧 Azure Service Principalを作成中..."

# 変数設定
APP_NAME="emergency-backend"
RESOURCE_GROUP="your-resource-group-name"
SUBSCRIPTION_ID="your-subscription-id"

echo "📋 設定情報:"
echo "  App Name: $APP_NAME"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Subscription ID: $SUBSCRIPTION_ID"

# Azure CLIにログイン
echo "🔐 Azure CLIにログイン中..."
az login

# 現在のサブスクリプションを確認
echo "📊 現在のサブスクリプション:"
az account show --query "name" -o tsv

# サブスクリプションIDを設定（必要に応じて）
if [ "$SUBSCRIPTION_ID" != "your-subscription-id" ]; then
    echo "🔄 サブスクリプションを設定中..."
    az account set --subscription $SUBSCRIPTION_ID
fi

# サービスプリンシパルを作成
echo "👤 サービスプリンシパルを作成中..."
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "emergency-backend-deploy" \
    --role contributor \
    --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME \
    --sdk-auth)

echo "✅ サービスプリンシパル作成完了"
echo ""
echo "📋 GitHub Secretsに設定するJSON:"
echo "$SP_OUTPUT"
echo ""
echo "🔑 このJSONをGitHub Secretsの AZURE_CREDENTIALS に設定してください"
echo "📝 手順:"
echo "  1. GitHubリポジトリ → Settings → Secrets and variables → Actions"
echo "  2. New repository secret"
echo "  3. Name: AZURE_CREDENTIALS"
echo "  4. Value: 上記のJSON"
echo "  5. Add secret" 