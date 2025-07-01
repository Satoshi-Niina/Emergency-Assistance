# Azure デプロイメントガイド

## 概要
このガイドでは、Emergency AssistanceシステムをAzureにデプロイする手順を説明します。

## 前提条件
- Azure CLIがインストールされている
- Azureアカウントにアクセス権限がある
- PostgreSQLデータベースが設定されている

## 1. リソースグループの作成

```bash
az group create --name emergency-assistance-rg --location japaneast
```

## 2. PostgreSQLデータベースの作成

```bash
# PostgreSQLサーバーの作成
az postgres flexible-server create \
  --resource-group emergency-assistance-rg \
  --name emergency-db-server \
  --location japaneast \
  --admin-user dbadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --version 15

# データベースの作成
az postgres flexible-server db create \
  --resource-group emergency-assistance-rg \
  --server-name emergency-db-server \
  --database-name emergency_assistance
```

## 3. バックエンドAPI（App Service）のデプロイ

```bash
# App Serviceプランの作成
az appservice plan create \
  --resource-group emergency-assistance-rg \
  --name emergency-backend-plan \
  --sku B1 \
  --is-linux

# Web Appの作成
az webapp create \
  --resource-group emergency-assistance-rg \
  --plan emergency-backend-plan \
  --name emergency-backend-api \
  --runtime "NODE|18-lts"

# 環境変数の設定
az webapp config appsettings set \
  --resource-group emergency-assistance-rg \
  --name emergency-backend-api \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    FRONTEND_URL="https://emergency-assistance-app.azurestaticapps.net" \
    DATABASE_URL="postgresql://dbadmin:YourSecurePassword123!@emergency-db-server.postgres.database.azure.com:5432/emergency_assistance?sslmode=require" \
    SESSION_SECRET="your-super-secret-session-key-change-this-in-production" \
    AZURE_STORAGE_CONNECTION_STRING="your-azure-storage-connection-string" \
    AZURE_STORAGE_ACCOUNT_NAME="your-storage-account" \
    AZURE_STORAGE_ACCOUNT_KEY="your-account-key" \
    AZURE_STORAGE_CONTAINER_NAME="knowledge-base" \
    OPENAI_API_KEY="your-openai-api-key" \
    TRUST_PROXY=true \
    CORS_ORIGIN="https://emergency-assistance-app.azurestaticapps.net"

# デプロイ
cd server
npm install
npm run build
az webapp deployment source config-zip \
  --resource-group emergency-assistance-rg \
  --name emergency-backend-api \
  --src dist.zip
```

## 4. フロントエンド（Static Web Apps）のデプロイ

```bash
# Static Web Appsの作成
az staticwebapp create \
  --resource-group emergency-assistance-rg \
  --name emergency-assistance-app \
  --location japaneast \
  --source https://github.com/your-username/emergency-assistance \
  --branch main \
  --app-location "/client" \
  --api-location "/server" \
  --output-location "dist"

# 環境変数の設定
az staticwebapp appsettings set \
  --name emergency-assistance-app \
  --setting-names \
    VITE_API_BASE_URL="https://emergency-backend-api.azurewebsites.net"
```

## 5. データベースマイグレーション

```bash
# マイグレーションの実行
cd server
npm run migrate
```

## 6. 動作確認

### バックエンドAPIの確認
```bash
curl https://emergency-backend-api.azurewebsites.net/api/health
```

### フロントエンドアプリの確認
ブラウザで `https://emergency-assistance-app.azurestaticapps.net` にアクセス

## トラブルシューティング

### 405エラー（Method Not Allowed）の解決

1. **認証ルートの重複登録を確認**
   - `server/index.ts`で認証ルートが重複して登録されていないか確認
   - `registerRoutes`内でのみ認証ルートを登録する

2. **CORS設定の確認**
   - フロントエンドのオリジンが許可されているか確認
   - サーバーログでCORSエラーがないか確認

3. **環境変数の確認**
   ```bash
   # 環境確認スクリプトの実行
   node scripts/check-azure-env.js
   ```

4. **APIエンドポイントの確認**
   ```bash
   # 各エンドポイントのテスト
   curl -X POST https://emergency-backend-api.azurewebsites.net/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

### ログの確認

```bash
# バックエンドログの確認
az webapp log tail --name emergency-backend-api --resource-group emergency-assistance-rg

# Static Web Appsログの確認
az staticwebapp logs show --name emergency-assistance-app --resource-group emergency-assistance-rg
```

## セキュリティ設定

### データベース接続のセキュリティ
```bash
# ファイアウォールルールの設定
az postgres flexible-server firewall-rule create \
  --resource-group emergency-assistance-rg \
  --name emergency-db-server \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### SSL証明書の設定
```bash
# カスタムドメインの追加（オプション）
az webapp config hostname add \
  --webapp-name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --hostname your-domain.com
```

## 監視とアラート

```bash
# Application Insightsの有効化
az monitor app-insights component create \
  --app emergency-assistance-insights \
  --location japaneast \
  --resource-group emergency-assistance-rg \
  --application-type web
```

## バックアップと復元

```bash
# データベースのバックアップ
az postgres flexible-server backup create \
  --resource-group emergency-assistance-rg \
  --name emergency-db-server \
  --backup-name daily-backup
```

## コスト最適化

- 開発環境ではB1スキューを使用
- 本番環境では必要に応じてS1以上にスケールアップ
- 自動スケーリングの設定を検討

## 更新手順

```bash
# バックエンドの更新
cd server
npm run build
az webapp deployment source config-zip \
  --resource-group emergency-assistance-rg \
  --name emergency-backend-api \
  --src dist.zip

# フロントエンドの更新
cd client
npm run build:azure
# GitHubにプッシュすると自動デプロイ
```

このガイドに従って、Emergency Assistance SystemをAzureに安全かつ効率的にデプロイできます。 