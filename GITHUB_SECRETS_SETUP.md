# GitHub Secrets 設定ガイド

## 🔐 必要なシークレットの設定

GitHub リポジトリの **Settings > Secrets and variables > Actions** で以下のシークレットを設定してください。

### 1. Azure 認証情報

#### AZURE_CREDENTIALS

Azure Service Principal の認証情報（JSON 形式）

```bash
# Service Principalを作成
az ad sp create-for-rbac --name "emergency-assistance-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --sdk-auth
```

出力される JSON をそのまま `AZURE_CREDENTIALS` シークレットに設定：

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### 2. データベース接続情報

#### DATABASE_URL

PostgreSQL 接続文字列

```
postgresql://your-admin@your-postgres-server.postgres.database.azure.com:5432/webappdb?sslmode=require
```

### 3. Azure Storage 接続情報

#### AZURE_STORAGE_CONNECTION_STRING

Azure Storage Account 接続文字列

```
DefaultEndpointsProtocol=https;AccountName=emergencyassistance;AccountKey=YOUR_STORAGE_KEY;EndpointSuffix=core.windows.net
```

### 4. API Keys

#### OPENAI_API_KEY

OpenAI API キー

```
sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### SESSION_SECRET

セッション暗号化用のシークレット（32 文字以上のランダム文字列）

```
your-very-secure-session-secret-key-here-32chars-minimum
```

### 5. Azure Static Web Apps Token

#### AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000

Azure Static Web Apps の API トークン（既に設定済み）

## 🏗️ Azure リソースの準備

### 1. Azure Container Registry の作成

```bash
az acr create \
  --resource-group emergency-assistance-rg \
  --name emergencyassistance \
  --sku Standard \
  --admin-enabled true
```

### 2. Azure Container Apps Environment の作成

```bash
# Log Analytics Workspace の作成
az monitor log-analytics workspace create \
  --resource-group emergency-assistance-rg \
  --workspace-name emergency-logs

# Container Apps Environment の作成
az containerapp env create \
  --name emergency-assistance-env \
  --resource-group emergency-assistance-rg \
  --logs-workspace-id "$(az monitor log-analytics workspace show \
    --resource-group emergency-assistance-rg \
    --workspace-name emergency-logs \
    --query customerId -o tsv)" \
  --logs-workspace-key "$(az monitor log-analytics workspace get-shared-keys \
    --resource-group emergency-assistance-rg \
    --workspace-name emergency-logs \
    --query primarySharedKey -o tsv)"
```

### 3. Azure Container App の作成

```bash
az containerapp create \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --environment emergency-assistance-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --registry-server emergencyassistance.azurecr.io \
  --env-vars \
    NODE_ENV=production \
    PORT=3001
```

## 🚀 デプロイ手順

### 1. シークレットの設定確認

GitHub リポジトリで以下のシークレットが設定されていることを確認：

- [x] `AZURE_CREDENTIALS`
- [x] `DATABASE_URL`
- [x] `AZURE_STORAGE_CONNECTION_STRING`
- [x] `OPENAI_API_KEY`
- [x] `SESSION_SECRET`
- [x] `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000`

### 2. ブランチへのプッシュ

```bash
git add .
git commit -m "Add GitHub Actions workflows for Azure deployment"
git push origin main
```

### 3. デプロイの確認

1. **GitHub Actions** タブでワークフローの実行状況を確認
2. **フロントエンド**: https://emergencyassistance-swa.azurestaticapps.net
3. **バックエンド**: Container App の URL を確認

```bash
az containerapp show \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## ⚠️ トラブルシューティング

### よくある問題

1. **Docker ビルドエラー**

   - `Dockerfile.backend` のパスを確認
   - Node.js バージョンの互換性確認

2. **認証エラー**

   - `AZURE_CREDENTIALS` の形式確認
   - Service Principal の権限確認

3. **環境変数エラー**

   - シークレット名のタイプミス確認
   - 接続文字列の形式確認

4. **Container App デプロイエラー**
   - リソースグループ名の確認
   - Container Registry の認証設定確認

### ログの確認方法

```bash
# Container App のログを確認
az containerapp logs show \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --follow
```
