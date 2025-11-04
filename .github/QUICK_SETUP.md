# クイックセットアップガイド（既存リソース用）

既存のAzureリソースに環境変数を設定するための手順です。

## 既存のAzureリソース情報

- **Static Web App**: https://witty-river-012f39e00.1.azurestaticapps.net
- **App Service**: emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
  - App Service名: `emergency-assistance-bfckhjejb3fbf9du`

## ① GitHub Secretsの設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で以下のシークレットを設定してください。

### Azure認証情報（必須）

```
AZURE_CREDENTIALS
AZURE_RESOURCE_GROUP           # App Serviceが所属するリソースグループ名
AZURE_APP_SERVICE_NAME         # emergency-assistance-bfckhjejb3fbf9du
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Appのデプロイトークン
```

### バックエンド環境変数（必須）

```
DATABASE_URL                   # PostgreSQL接続文字列
JWT_SECRET                     # 32文字以上のランダム文字列
SESSION_SECRET                 # 32文字以上のランダム文字列
FRONTEND_URL                   # https://witty-river-012f39e00.1.azurestaticapps.net
```

### フロントエンド環境変数（推奨）

```
VITE_API_BASE_URL              # /api または https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api
```

### オプション環境変数

必要に応じて設定：

```
OPENAI_API_KEY                 # OpenAI APIキー（GPT機能を使用する場合）
AZURE_STORAGE_CONNECTION_STRING # Azure Blob Storage接続文字列（使用する場合）
PG_SSL                         # require（デフォルト）
CORS_ALLOW_ORIGINS             # *（デフォルト、本番環境では制限推奨）
```

## ② Azure Portalでリソースグループ名を確認

1. Azure Portal（https://portal.azure.com）にログイン
2. **App Services** を検索
3. `emergency-assistance-bfckhjejb3fbf9du` を開く
4. **概要** タブの **リソースグループ** を確認
5. そのリソースグループ名を `AZURE_RESOURCE_GROUP` シークレットに設定

## ③ Static Web Appのデプロイトークンを取得

1. Azure Portal > **Static Web Apps** を開く
2. Static Web Appリソースを選択
3. **Manage deployment token** をクリック
4. 表示されたトークンをコピー
5. `AZURE_STATIC_WEB_APPS_API_TOKEN` シークレットに設定

## ④ Service Principalの作成（GitHub Actions用）

```bash
az login

# サブスクリプションIDを取得
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# App Serviceが所属するリソースグループ名を確認（Portalで確認した値）
RESOURCE_GROUP="your-resource-group-name"
APP_NAME="emergency-assistance-github"

# Service Principalを作成
az ad sp create-for-rbac \
  --name "$APP_NAME" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

出力されたJSONをそのまま `AZURE_CREDENTIALS` シークレットに設定します。

## ⑤ 環境変数の設定方法

### 方法A: GitHub Actions経由（推奨）

1. 上記のGitHub Secretsをすべて設定
2. ワークフローを実行（`main`ブランチにプッシュ、または手動実行）
3. 環境変数が自動的にAzure App Serviceに設定されます

### 方法B: Azure Portalで直接設定

1. Azure Portal > App Service (`emergency-assistance-bfckhjejb3fbf9du`)
2. **Configuration** > **Application settings**
3. **+ New application setting** で環境変数を追加
4. **Save** をクリック（App Serviceが再起動します）

必須環境変数の例：

```
NODE_ENV = production
DATABASE_URL = postgresql://user:password@host:5432/dbname
JWT_SECRET = your-32-character-secret-key
SESSION_SECRET = your-32-character-session-secret
FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
FRONTEND_ORIGIN = https://witty-river-012f39e00.1.azurestaticapps.net
PG_SSL = require
```

### 方法C: Azure CLIで直接設定

```bash
az login

# 必須環境変数を設定
az webapp config appsettings set \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group YOUR_RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgresql://user:password@host:5432/dbname" \
    JWT_SECRET="your-32-character-secret-key" \
    SESSION_SECRET="your-32-character-session-secret" \
    FRONTEND_URL="https://witty-river-012f39e00.1.azurestaticapps.net" \
    FRONTEND_ORIGIN="https://witty-river-012f39e00.1.azurestaticapps.net" \
    PG_SSL="require"
```

## ⑥ 設定確認

### App Serviceの環境変数を確認

```bash
az webapp config appsettings list \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group YOUR_RESOURCE_GROUP \
  --output table
```

または、Azure Portal > App Service > Configuration > Application settings で確認。

### 動作確認

1. **バックエンド**: https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health
2. **フロントエンド**: https://witty-river-012f39e00.1.azurestaticapps.net

## トラブルシューティング

### App Service名が違う

- App Service名は `emergency-assistance-bfckhjejb3fbf9du` です
- `AZURE_APP_SERVICE_NAME` シークレットに正しい値を設定してください

### リソースグループ名がわからない

1. Azure Portal > App Service (`emergency-assistance-bfckhjejb3fbf9du`)
2. **概要** タブの **リソースグループ** を確認

### 環境変数が設定されない

1. GitHub Secretsが正しく設定されているか確認
2. ワークフローのログを確認
3. Azure Portal > App Service > Configuration で確認

詳細は [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) を参照してください。

