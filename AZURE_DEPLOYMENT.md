# Azure デプロイガイド

このガイドでは、Emergency Assistance SystemをAzureにデプロイする手順を説明します。

## 前提条件

- Azure サブスクリプション
- Azure CLI がインストールされている
- GitHub アカウント
- Node.js 20.x

## 1. Azure リソースの作成

### 1.1 Azure Storage Account の作成

```bash
# リソースグループの作成
az group create --name emergency-assistance-rg --location japaneast

# Storage Account の作成
az storage account create \
  --name emergencyassistancestorage \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --sku Standard_LRS \
  --kind StorageV2

# Blob Container の作成
az storage container create \
  --name knowledge-base \
  --account-name emergencyassistancestorage
```

### 1.2 Azure Database for PostgreSQL の作成

```bash
# PostgreSQL サーバーの作成
az postgres flexible-server create \
  --name emergency-assistance-db \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --admin-user postgres \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --version 15

# データベースの作成
az postgres flexible-server db create \
  --resource-group emergency-assistance-rg \
  --server-name emergency-assistance-db \
  --database-name emergency_assistance
```

### 1.3 Azure App Service の作成

```bash
# App Service Plan の作成
az appservice plan create \
  --name emergency-assistance-plan \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --sku B1 \
  --is-linux

# Web App の作成
az webapp create \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg \
  --plan emergency-assistance-plan \
  --runtime "NODE|20-lts"
```

## 2. 環境変数の設定

### 2.1 Azure Storage の接続情報を取得

```bash
# Storage Account の接続文字列を取得
az storage account show-connection-string \
  --name emergencyassistancestorage \
  --resource-group emergency-assistance-rg

# Storage Account のキーを取得
az storage account keys list \
  --name emergencyassistancestorage \
  --resource-group emergency-assistance-rg
```

### 2.2 App Service の環境変数を設定

```bash
# 環境変数を設定
az webapp config appsettings set \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="postgresql://postgres:YourSecurePassword123!@emergency-assistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require" \
    SESSION_SECRET="your-super-secret-session-key-change-this-in-production" \
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=emergencyassistancestorage;AccountKey=YOUR_ACCOUNT_KEY;EndpointSuffix=core.windows.net" \
    AZURE_STORAGE_ACCOUNT_NAME="emergencyassistancestorage" \
    AZURE_STORAGE_ACCOUNT_KEY="YOUR_ACCOUNT_KEY" \
    AZURE_STORAGE_CONTAINER_NAME="knowledge-base" \
    OPENAI_API_KEY="your-openai-api-key" \
    AZURE_SPEECH_KEY="your-azure-speech-key" \
    AZURE_SPEECH_REGION="japaneast"
```

## 3. デプロイ方法

### 3.1 GitHub Actions を使用したデプロイ

1. GitHub リポジトリにコードをプッシュ
2. GitHub Secrets に Azure の認証情報を設定:
   - `AZURE_CREDENTIALS`: Azure サービスプリンシパルの JSON
   - `REGISTRY_USERNAME`: Azure Container Registry のユーザー名
   - `REGISTRY_PASSWORD`: Azure Container Registry のパスワード

3. GitHub Actions ワークフローが自動実行されます

### 3.2 手動デプロイ

```bash
# 依存関係のインストール
npm ci
cd client && npm ci

# アプリケーションのビルド
npm run build:client
npm run build:server

# Azure App Service にデプロイ
az webapp deployment source config-zip \
  --resource-group emergency-assistance-rg \
  --name emergency-assistance-app \
  --src deployment.zip
```

### 3.3 Docker を使用したデプロイ

```bash
# Docker イメージのビルド
docker build -f Dockerfile.azure -t emergency-assistance .

# Azure Container Registry にプッシュ
az acr build --registry emergencyassistanceregistry --image emergency-assistance .
```

## 4. Knowledge Base の同期

### 4.1 初回同期

```bash
# ローカルの knowledge-base を Azure Storage にアップロード
npm run sync:knowledge-base:upload
```

### 4.2 自動同期の設定

アプリケーションは起動時に自動的に Azure Storage から knowledge-base を同期します。

## 5. データベースマイグレーション

```bash
# マイグレーションの実行
npm run db:migrate

# シードデータの投入
npm run db:seed
```

## 6. 監視とログ

### 6.1 Application Insights の設定

```bash
# Application Insights の作成
az monitor app-insights component create \
  --app emergency-assistance-insights \
  --location japaneast \
  --resource-group emergency-assistance-rg \
  --application-type web

# App Service に Application Insights を接続
az webapp config appsettings set \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg \
  --settings \
    APPLICATIONINSIGHTS_CONNECTION_STRING="YOUR_APP_INSIGHTS_CONNECTION_STRING"
```

### 6.2 ログの確認

```bash
# アプリケーションログの確認
az webapp log tail \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg
```

## 7. セキュリティ設定

### 7.1 HTTPS の強制

```bash
# HTTPS リダイレクトの有効化
az webapp update \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg \
  --https-only true
```

### 7.2 カスタムドメインの設定

```bash
# カスタムドメインの追加
az webapp config hostname add \
  --webapp-name emergency-assistance-app \
  --resource-group emergency-assistance-rg \
  --hostname your-domain.com
```

## 8. バックアップと復元

### 8.1 自動バックアップの設定

```bash
# データベースの自動バックアップを有効化
az postgres flexible-server update \
  --name emergency-assistance-db \
  --resource-group emergency-assistance-rg \
  --backup-retention 7
```

### 8.2 Knowledge Base のバックアップ

```bash
# 手動バックアップの作成
npm run backup:knowledge-base

# バックアップ一覧の確認
npm run list:backups

# バックアップからの復元
npm run restore:knowledge-base --backup-name="2024-01-01T00-00-00-000Z"
```

## 9. トラブルシューティング

### 9.1 よくある問題

1. **ポートエラー**: App Service はポート 8080 を使用
2. **環境変数エラー**: すべての必須環境変数が設定されているか確認
3. **データベース接続エラー**: SSL 設定とファイアウォール設定を確認
4. **Storage 接続エラー**: 接続文字列とアクセスキーを確認

### 9.2 ログの確認

```bash
# 詳細なログを確認
az webapp log download \
  --name emergency-assistance-app \
  --resource-group emergency-assistance-rg
```

## 10. スケーリング

### 10.1 自動スケーリングの設定

```bash
# 自動スケーリングルールの作成
az monitor autoscale create \
  --resource-group emergency-assistance-rg \
  --resource emergency-assistance-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name emergency-assistance-autoscale \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

## 11. コスト最適化

- 開発環境では Basic プラン (B1) を使用
- 本番環境では Standard プラン (S1) 以上を推奨
- 使用していないリソースは停止または削除

## 12. 更新とメンテナンス

### 12.1 アプリケーションの更新

```bash
# 新しいバージョンのデプロイ
git push origin main
```

### 12.2 依存関係の更新

```bash
# セキュリティアップデートの確認
npm audit
npm update
```

このガイドに従って、Emergency Assistance SystemをAzureに安全かつ効率的にデプロイできます。 