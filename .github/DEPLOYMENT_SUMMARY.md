# Azure デプロイ まとめ

このドキュメントは、GitHub Actionsを使用してAzure Static Web Apps（フロントエンド）とAzure App Service（バックエンド）にデプロイするためのクイックリファレンスです。

## 作成されたファイル

### ワークフローファイル

1. **`.github/workflows/deploy-client-azure.yml`**
   - フロントエンド（React/Vite）をAzure Static Web Appsにデプロイ
   - `client/` ディレクトリへの変更で自動トリガー

2. **`.github/workflows/deploy-server-azure.yml`**
   - バックエンド（Node.js/Express）をDockerコンテナ化してAzure App Serviceにデプロイ
   - DockerイメージをGitHub Container Registryにビルド＆プッシュ
   - 環境変数を自動的にAzure App Serviceに設定
   - `server/`、`shared/`、`knowledge-base/`、`Dockerfile`への変更で自動トリガー

### 設定ファイル

3. **`client/staticwebapp.config.json`**
   - Azure Static Web Apps用のルーティング設定
   - SPAルーティングとAPIプロキシ設定

### ドキュメント

4. **`.github/GITHUB_SECRETS.md`**
   - GitHub Secretsの一覧と設定方法
   - 環境変数の説明

5. **`.github/AZURE_DEPLOYMENT_SETUP.md`**
   - Azureリソースの作成手順
   - デプロイセットアップの完全ガイド

## クイックスタート

### 1. GitHub Secretsの設定（必須）

以下をGitHubリポジトリの **Settings > Secrets and variables > Actions** に設定：

#### 必須シークレット

```
AZURE_CREDENTIALS                # Service PrincipalのJSON
AZURE_RESOURCE_GROUP            # 例: emergency-assistance-rg
AZURE_APP_SERVICE_NAME          # 例: emergency-assistance-backend
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Appのデプロイトークン
DATABASE_URL                    # PostgreSQL接続文字列
JWT_SECRET                      # 32文字以上のシークレット
SESSION_SECRET                  # 32文字以上のシークレット
FRONTEND_URL                    # Static Web AppのURL
```

#### オプションシークレット

```
VITE_API_BASE_URL              # デフォルト: /api
OPENAI_API_KEY                 # OpenAI APIキー（オプション）
AZURE_STORAGE_CONNECTION_STRING # Blob Storage（オプション）
PG_SSL                         # デフォルト: require
CORS_ALLOW_ORIGINS             # デフォルト: *
GITHUB_REGISTRY_TOKEN          # GitHub PAT（プライベートイメージの場合のみ）
GITHUB_REGISTRY_USERNAME       # GitHubユーザー名（デフォルト: リポジトリオーナー）
```

詳細は [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) を参照。

**既存のAzureリソースをお使いの場合**: [QUICK_SETUP.md](./QUICK_SETUP.md) を参照してください。

### 2. Azureリソースの作成

Azure CLIで実行：

```bash
# リソースグループの作成
az group create --name emergency-assistance-rg --location japaneast

# Static Web Appの作成
az staticwebapp create \
  --name emergency-assistance-frontend \
  --resource-group emergency-assistance-rg \
  --location japaneast \
  --sku Free

# App ServiceプランとApp Serviceの作成
az appservice plan create \
  --name emergency-assistance-plan \
  --resource-group emergency-assistance-rg \
  --sku B1 \
  --is-linux

az webapp create \
  --name emergency-assistance-backend \
  --resource-group emergency-assistance-rg \
  --plan emergency-assistance-plan \
  --runtime "NODE|20-lts"
```

詳細は [AZURE_DEPLOYMENT_SETUP.md](./AZURE_DEPLOYMENT_SETUP.md) を参照。

### 3. Service Principalの作成

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac \
  --name emergency-assistance-github \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/emergency-assistance-rg \
  --sdk-auth
```

出力を `AZURE_CREDENTIALS` シークレットに設定。

### 4. staticwebapp.config.jsonの更新

`client/staticwebapp.config.json` の `/api/*` ルールでバックエンドURLを設定：

```json
{
  "route": "/api/*",
  "rewrite": "https://YOUR_APP_SERVICE_NAME.azurewebsites.net/api/*"
}
```

## デプロイフロー

### 自動デプロイ

- `main` ブランチにプッシュすると自動的にデプロイが開始されます
- フロントエンド: `client/` への変更でトリガー
- バックエンド: `server/`、`shared/`、`knowledge-base/` への変更でトリガー

### 手動デプロイ

GitHub Actionsの **Actions** タブからワークフローを手動実行できます。

## 環境変数の設定

### バックエンド環境変数

ワークフローが自動的に以下の環境変数をAzure App Serviceに設定します：

- 必須: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`
- オプション: `OPENAI_API_KEY`, `AZURE_STORAGE_CONNECTION_STRING`, など

すべての環境変数はGitHub Secretsから読み込まれます。

### フロントエンド環境変数

- `VITE_API_BASE_URL`: ビルド時に埋め込まれます（デフォルト: `/api`）

## チェックリスト

デプロイ前に確認：

- [ ] Azureリソースが作成されている
- [ ] Service Principalが作成されている
- [ ] GitHub Secretsがすべて設定されている
- [ ] `staticwebapp.config.json` のAPIルールが更新されている
- [ ] PostgreSQLデータベースが設定されている（使用する場合）
- [ ] `FRONTEND_URL` が正しく設定されている

## トラブルシューティング

### デプロイが失敗する

1. GitHub Actionsのログを確認
2. GitHub Secretsが正しく設定されているか確認
3. Azureリソースが存在するか確認
4. Service Principalの権限を確認

### フロントエンドがバックエンドに接続できない

1. `staticwebapp.config.json` の `/api/*` ルールを確認
2. App ServiceのCORS設定を確認
3. `FRONTEND_URL` 環境変数を確認

### 環境変数が設定されない

1. Azure Portal > App Service > Configuration で確認
2. ワークフローのログで環境変数設定ステップを確認

## 参考リンク

- [GitHub Secrets設定ガイド](./GITHUB_SECRETS.md)
- [Azure デプロイセットアップガイド](./AZURE_DEPLOYMENT_SETUP.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 一般的なデプロイメントガイド

