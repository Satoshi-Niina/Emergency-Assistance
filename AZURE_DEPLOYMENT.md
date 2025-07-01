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

## GitHub Secrets 設定手順

### 1. AZURE_CREDENTIALS の設定

#### A. Azure CLIでサービスプリンシパルを作成

```bash
# Azure CLIにログイン
az login

# サブスクリプションIDを確認
az account show --query id --output tsv

# サービスプリンシパルを作成（サブスクリプションIDを置き換え）
az ad sp create-for-rbac --name "emergency-backend-deploy" --role contributor \
    --scopes /subscriptions/{YOUR_SUBSCRIPTION_ID}/resourceGroups/emergency-assistance-rg \
    --sdk-auth
```

#### B. 出力されたJSONをGitHub Secretsに設定

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. "New repository secret" をクリック
3. Name: `AZURE_CREDENTIALS`
4. Value: 上記コマンドで出力されたJSON全体をコピー&ペースト

### 2. AZURE_BACKEND_PUBLISH_PROFILE の設定

#### A. Azure Portalでパブリッシュプロファイルを取得

1. Azure Portal → App Services → emergency-backend-api
2. "Get publish profile" をクリック
3. ファイルをダウンロード

#### B. GitHub Secretsに設定

1. ダウンロードしたファイルの内容をすべてコピー
2. GitHub Secretsで "New repository secret" をクリック
3. Name: `AZURE_BACKEND_PUBLISH_PROFILE`
4. Value: ファイルの内容をペースト

### 3. AZURE_STATIC_WEB_APPS_API_TOKEN の設定

#### A. Azure PortalでStatic Web Appsのトークンを取得

1. Azure Portal → Static Web Apps → emergency-frontend
2. "Manage deployment tokens" をクリック
3. "Copy" でトークンをコピー

#### B. GitHub Secretsに設定

1. GitHub Secretsで "New repository secret" をクリック
2. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. Value: コピーしたトークンをペースト

## 環境変数の確認

### バックエンド環境変数（Azure App Service）

Azure Portal → App Services → emergency-backend-api → Configuration → Application settings で以下を設定：

```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://emergency-backend-api.azurewebsites.net
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER_NAME=your-container-name
```

### フロントエンド環境変数（Azure Static Web Apps）

Azure Portal → Static Web Apps → emergency-frontend → Configuration → Application settings で以下を設定：

```
VITE_API_BASE_URL=https://emergency-backend-api.azurewebsites.net
VITE_AZURE_SPEECH_KEY=your-speech-key
VITE_AZURE_SPEECH_REGION=your-speech-region
```

## デプロイ確認

1. GitHub Actionsでワークフローが正常に実行されることを確認
2. フロントエンド: https://emergency-frontend.azurestaticapps.net
3. バックエンド: https://emergency-backend-api.azurewebsites.net

## トラブルシューティング

### 認証エラーが発生する場合

1. `AZURE_CREDENTIALS` のJSONが正しく設定されているか確認
2. サービスプリンシパルに適切な権限があるか確認
3. サブスクリプションIDが正しいか確認

### デプロイエラーが発生する場合

1. Azure App Serviceのログを確認
2. 環境変数が正しく設定されているか確認
3. パブリッシュプロファイルが最新か確認

このガイドに従って、Emergency Assistance SystemをAzureに安全かつ効率的にデプロイできます。 