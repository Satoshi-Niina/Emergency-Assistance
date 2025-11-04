# Azure デプロイ設定ガイド

このガイドでは、GitHub Actionsを使用してAzure Static Web Apps（フロントエンド）とAzure App Service（バックエンド）にデプロイするための設定手順を説明します。

## 前提条件

1. Azureサブスクリプション
2. Azure CLIのインストール（ローカル設定用）
3. GitHubリポジトリへのアクセス権限

## セットアップ手順

### 1. Azureリソースの作成

#### Azure Static Web App（フロントエンド）の作成

```bash
# リソースグループの作成（まだの場合）
az group create \
  --name emergency-assistance-rg \
  --location japaneast

# Static Web Appの作成
az staticwebapp create \
  --name emergency-assistance-frontend \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --sku Free
```

作成後、Azure Portalで **Manage deployment token** を取得してGitHub Secretsに設定します。

#### Azure App Service（バックエンド）の作成

```bash
# App Serviceプランの作成
az appservice plan create \
  --name emergency-assistance-plan \
  --resource-group emergency-assistance-rg \
  --sku B1 \
  --is-linux

# App Serviceの作成（Dockerコンテナ用）
az webapp create \
  --name emergency-assistance-backend \
  --resource-group emergency-assistance-rg \
  --plan emergency-assistance-plan \
  --deployment-container-image-name "nginx" \
  --docker-registry-server-url "https://ghcr.io"

# App ServiceのDocker設定を有効化
az webapp config set \
  --name emergency-assistance-backend \
  --resource-group emergency-assistance-rg \
  --linux-fx-version "DOCKER|ghcr.io/YOUR_REPO/server:latest"
```

### 2. Service Principalの作成

GitHub ActionsからAzureにデプロイするための認証情報を作成します：

```bash
# サブスクリプションIDを取得
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RESOURCE_GROUP="emergency-assistance-rg"
APP_NAME="emergency-assistance-github"

# Service Principalを作成
az ad sp create-for-rbac \
  --name "$APP_NAME" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

出力されたJSONをGitHub Secretsの `AZURE_CREDENTIALS` に設定します。

### 3. GitHub Secretsの設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で以下のシークレットを設定します：

#### Azure認証情報

- `AZURE_CREDENTIALS`: Service PrincipalのJSON
- `AZURE_RESOURCE_GROUP`: `emergency-assistance-rg`
- `AZURE_APP_SERVICE_NAME`: `emergency-assistance-backend`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Static Web Appのデプロイトークン

#### バックエンド環境変数（必須）

- `DATABASE_URL`: PostgreSQL接続文字列
- `JWT_SECRET`: 32文字以上のランダム文字列
- `SESSION_SECRET`: 32文字以上のランダム文字列
- `FRONTEND_URL`: Static Web AppのURL（例: `https://emergency-assistance-frontend.azurestaticapps.net`）

#### バックエンド環境変数（オプション）

- `PORT`: `8080`（通常は設定不要）
- `PG_SSL`: `require`
- `CORS_ALLOW_ORIGINS`: `*`（本番環境では制限推奨）
- `OPENAI_API_KEY`: OpenAI APIキー（オプション）
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Blob Storage接続文字列（オプション）
- `AZURE_STORAGE_CONTAINER_NAME`: `knowledge`
- `STORAGE_BASE_PREFIX`: `knowledge-base`
- `OPENAI_MODEL`: `gpt-4o`

#### Docker Container Registry認証情報（オプション）

プライベートイメージを使用する場合：
- `GITHUB_REGISTRY_TOKEN`: GitHub Personal Access Token（PAT、`read:packages`スコープ）
- `GITHUB_REGISTRY_USERNAME`: GitHubユーザー名（デフォルト: リポジトリオーナー）

詳細は [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) を参照してください。

### 4. Static Web AppのAPIリライト設定

`client/staticwebapp.config.json` の `/api/*` ルールで、バックエンドのURLを設定します：

```json
{
  "route": "/api/*",
  "rewrite": "https://YOUR_APP_SERVICE_NAME.azurewebsites.net/api/*"
}
```

`YOUR_APP_SERVICE_NAME` を実際のApp Service名に置き換えてください。

### 5. PostgreSQLデータベースの設定（オプション）

Azure Database for PostgreSQLを使用する場合：

```bash
# PostgreSQLサーバーの作成
az postgres flexible-server create \
  --name emergency-assistance-db \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --admin-user adminuser \
  --admin-password "YourPassword123!" \
  --sku-name Standard_B1ms \
  --version 14

# データベースの作成
az postgres flexible-server db create \
  --resource-group emergency-assistance-rg \
  --server-name emergency-assistance-db \
  --database-name webappdb

# 接続文字列を取得
az postgres flexible-server show-connection-string \
  --server-name emergency-assistance-db \
  --database-name webappdb \
  --admin-user adminuser \
  --admin-password "YourPassword123!"
```

接続文字列を `DATABASE_URL` シークレットに設定します。

## デプロイフロー

### フロントエンドデプロイ

1. `client/` ディレクトリに変更があると自動的にトリガー
2. Node.js 20で依存関係をインストール
3. Viteでクライアントをビルド
4. Azure Static Web Appsにデプロイ

### バックエンドデプロイ

1. `server/`、`shared/`、`knowledge-base/`、`Dockerfile`に変更があると自動的にトリガー
2. Docker BuildxでDockerイメージをビルド
3. GitHub Container Registryにイメージをプッシュ
4. Azure App Serviceに環境変数を設定
5. Azure App ServiceのDocker設定を更新
6. Azure App Serviceを再起動して新しいイメージをデプロイ

## トラブルシューティング

### フロントエンドがバックエンドに接続できない

1. `staticwebapp.config.json` の `/api/*` ルールを確認
2. App ServiceのCORS設定を確認
3. `FRONTEND_URL` 環境変数が正しく設定されているか確認

### バックエンドの環境変数が設定されない

1. GitHub Secretsが正しく設定されているか確認
2. ワークフローのログを確認
3. Azure Portal > App Service > Configuration で環境変数を確認

### デプロイエラー

1. Azure CLIにログインしているか確認：`az login`
2. Service Principalの権限を確認
3. リソースグループ名とApp Service名が正しいか確認
4. ワークフローのログでエラー詳細を確認

### データベース接続エラー

1. `DATABASE_URL` が正しいフォーマットか確認
2. PostgreSQLサーバーのファイアウォール設定を確認
3. App ServiceのIPアドレスを許可リストに追加
4. SSL設定（`PG_SSL`）を確認

## 手動デプロイ

ワークフローを手動で実行する場合：

1. GitHubリポジトリの **Actions** タブを開く
2. 実行したいワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択して実行

## 参考リンク

- [Azure Static Web Apps ドキュメント](https://learn.microsoft.com/ja-jp/azure/static-web-apps/)
- [Azure App Service ドキュメント](https://learn.microsoft.com/ja-jp/azure/app-service/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

