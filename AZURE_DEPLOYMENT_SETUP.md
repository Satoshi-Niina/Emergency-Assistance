# Azure デプロイメント設定ガイド

## 現在の状況

GitHub アクションワークフローは作成済みですが、Azure リソースとの連携に必要な認証情報の設定が必要です。

## GitHub Secrets の設定手順

### 1. GitHub リポジトリでの設定
1. https://github.com/Satoshi-Niina/Emergency-Assistance にアクセス
2. "Settings" タブをクリック
3. 左メニューから "Secrets and variables" > "Actions" を選択
4. "New repository secret" をクリックして以下を設定

### 2. 必要な GitHub Secrets 設定

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

**重要**: シークレット名は既存のワークフローファイルと一致させる必要があります

```
AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000=<Static Web Apps Deployment Token>
```

### 3. API トークンの確認方法
Azure Portal で Static Web App を開き：
1. "Deployment tokens" メニューを選択
2. トークンが表示されない場合は "Reset token" をクリック
3. 新しいトークンをコピーして GitHub Secrets に設定

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

#### Azure CLI での作成方法
```bash
# Static Web App の作成
az staticwebapp create \
  --name Emergencyassistance-swa \
  --resource-group emergency-assistance-rg \
  --source https://github.com/Satoshi-Niina/Emergency-Assistance \
  --location "East Asia" \
  --branch main \
  --app-location "./client" \
  --api-location "./api" \
  --output-location "./client/dist"
```

#### Azure Portal での作成方法
1. Azure Portal にログイン
2. "Static Web Apps" サービスを検索
3. "+ Create" をクリック
4. 以下の設定で作成：
   - **Name**: `Emergencyassistance-swa`
   - **Resource Group**: `emergency-assistance-rg`
   - **Region**: `East Asia`
   - **Source**: `GitHub`
   - **Repository**: `Satoshi-Niina/Emergency-Assistance`
   - **Branch**: `main`
   - **App location**: `./client`
   - **API location**: `./api`
   - **Output location**: `./client/dist`

#### デプロイメントトークンの取得
作成後、以下の手順でトークンを取得：
1. Azure Portal で作成した Static Web App を開く
2. 左メニューから "Deployment tokens" を選択
3. トークンをコピーして GitHub Secrets に設定

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

**原因と解決策**:

1. **Static Web App リソースが存在しない**
   ```bash
   # Azure CLI で確認
   az staticwebapp list --resource-group emergency-assistance-rg
   ```
   リソースが存在しない場合は上記の作成手順を実行

2. **API トークンが無効**
   - Azure Portal で Static Web App を開く
   - "Deployment tokens" で新しいトークンを生成
   - GitHub Secrets の `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` を更新

3. **シークレット名の不一致**
   - ワークフローファイルで使用されているシークレット名を確認
   - GitHub Settings > Secrets で同じ名前で設定されているか確認

4. **リージョンの問題**
   - Static Web App のリージョンと設定が一致しているか確認

### エラー: Container registry access denied

→ Service Principal に ACR の push/pull 権限が付与されているか確認

### 即座の対処法（一時的）

エラーを即座に解決したい場合：

1. **Static Web Apps ワークフローを完全に無効化**:
   ```bash
   # ワークフローファイルの名前を変更して無効化
   mv .github/workflows/azure-static-web-apps-salmon-desert-065ec5000.yml .github/workflows/azure-static-web-apps-salmon-desert-065ec5000.yml.disabled
   ```

2. **手動でビルドをテスト**:
   ```bash
   cd client
   npm install
   npm run build
   ```

3. **Azure リソース作成後に再有効化**:
   適切なリソースと API トークン設定後にワークフローを再有効化
