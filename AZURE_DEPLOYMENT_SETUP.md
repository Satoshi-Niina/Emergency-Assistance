# Azure デプロイメント設定ガイド

## 現在の状況

GitHub アクションワークフローは作成済みですが、Azure リソースとの連携に必要な認証情報の設定が必要です。

## 必要な GitHub Secrets 設定

### バックエンド (Azure Container Apps) 用

以下の Secrets を GitHub リポジトリの Settings > Secrets and variables > Actions で設定してください：

```
AZURE_CLIENT_ID=<Azure Service Principal Client ID>
AZURE_TENANT_ID=<Azure Tenant ID>
AZURE_SUBSCRIPTION_ID=<Azure Subscription ID>
REGISTRY_LOGIN_SERVER=<ACR Login Server>
REGISTRY_USERNAME=<ACR Username>
REGISTRY_PASSWORD=<ACR Password>
RESOURCE_GROUP=<Resource Group Name>
DATABASE_URL=<PostgreSQL Connection String>
OPENAI_API_KEY=<OpenAI API Key>
AZURE_STORAGE_CONNECTION_STRING=<Azure Storage Connection String>
```

### フロントエンド (Azure Static Web Apps) 用

```
AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000=<Static Web Apps Deployment Token>
```

## Azure リソースの作成手順

### 1. Resource Group の作成

```bash
az group create --name emergency-assistance-rg --location japaneast
```

### 2. Container Registry の作成

```bash
az acr create --resource-group emergency-assistance-rg --name emergencyassistancecr --sku Basic
```

### 3. Container Apps Environment の作成

```bash
az containerapp env create --name emergency-assistance-env --resource-group emergency-assistance-rg --location japaneast
```

### 4. Container App の作成

```bash
az containerapp create \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --environment emergency-assistance-env \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 3000 \
  --ingress external
```

### 5. Static Web App の作成

Azure Portal または Azure CLI で Static Web Apps リソースを作成し、デプロイメントトークンを取得してください。

## Service Principal の作成

```bash
az ad sp create-for-rbac --name "emergency-assistance-sp" --role Contributor --scopes /subscriptions/{subscription-id}/resourceGroups/emergency-assistance-rg --sdk-auth
```

実行結果から以下の値を GitHub Secrets に設定：

- `clientId` → `AZURE_CLIENT_ID`
- `tenantId` → `AZURE_TENANT_ID`
- `subscriptionId` → `AZURE_SUBSCRIPTION_ID`

## ワークフロー有効化手順

1. 上記の Secrets をすべて設定
2. `.github/workflows/azure-backend-deploy.yml` のコメントアウトされた部分を有効化
3. `.github/workflows/azure-static-web-apps-salmon-desert-065ec5000.yml` のトリガーを有効化

## 現在の制限事項

- Azure リソースが未作成のため、デプロイメント機能は一時的に無効化されています
- ビルドとテスト機能のみが動作中です
- 適切な認証情報設定後に自動デプロイが開始されます

## トラブルシューティング

### エラー: "Login failed with Error: Using auth-type: SERVICE_PRINCIPAL"

→ `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` の設定を確認

### エラー: "No matching Static Web App was found or the api key was invalid"

→ `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` の値を確認

### エラー: Container registry access denied

→ Service Principal に ACR の push/pull 権限が付与されているか確認
