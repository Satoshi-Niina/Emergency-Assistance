# GitHub Secrets 設定ガイド

このドキュメントでは、GitHub ActionsからAzureへのCI/CDデプロイに必要なGitHub Secretsの設定方法を説明します。

## 設定場所

GitHubリポジトリの **Settings > Secrets and variables > Actions** で設定します。

## 必須シークレット一覧

### Azure認証情報

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `AZURE_CREDENTIALS` | Azureへの認証情報（JSON形式） | Service Principalを作成して取得 |
| `AZURE_RESOURCE_GROUP` | Azureリソースグループ名 | Azure Portalで確認 |
| `AZURE_APP_SERVICE_NAME` | Azure App Service名（バックエンド） | Azure Portalで確認 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure Static Web Apps デプロイトークン | Azure Portal > Static Web App > Manage deployment token |

### バックエンド（Azure App Service）必須環境変数

| Secret名 | 説明 | 例 | 備考 |
|---------|------|-----|------|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql://user:password@host:5432/dbname` | **必須** |
| `JWT_SECRET` | JWT署名用シークレット | `your-super-secret-jwt-key-min-32-chars` | **必須** 32文字以上 |
| `SESSION_SECRET` | セッション管理用シークレット | `your-super-secret-session-key-min-32-chars` | **必須** 32文字以上 |
| `FRONTEND_URL` | フロントエンドURL | `https://your-static-web-app.azurestaticapps.net` | **必須** |

### バックエンド（Azure App Service）オプション環境変数

| Secret名 | 説明 | デフォルト値 | 備考 |
|---------|------|------------|------|
| `PORT` | サーバーポート | `8080` | Azure App Serviceでは通常自動設定 |
| `PG_SSL` | PostgreSQL SSL設定 | `require` | `require`, `prefer`, `disable` |
| `CORS_ALLOW_ORIGINS` | CORS許可オリジン（カンマ区切り） | `*` | 本番環境では制限推奨 |
| `OPENAI_API_KEY` | OpenAI APIキー | - | オプション（GPT機能を使用する場合） |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage接続文字列 | - | オプション（Blob Storageを使用する場合） |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure Blob Storageコンテナ名 | `knowledge` | オプション |
| `STORAGE_BASE_PREFIX` | ストレージベースプレフィックス | `knowledge-base` | オプション |
| `ALLOW_DUMMY` | ダミーデータ許可フラグ | `false` | ⚠️ 本番環境では通常不要（デフォルト`false`で問題なし） |
| `BYPASS_DB_FOR_LOGIN` | DBバイパスログインフラグ | `false` | `true`/`false` |
| `BACKUP_ENABLED` | バックアップ有効化 | `true` | `true`/`false` |
| `BACKUP_MAX_FILES` | バックアップ最大ファイル数 | `3` | 数値 |
| `BACKUP_FOLDER_NAME` | バックアップフォルダ名 | `backups` | 文字列 |
| `OPENAI_MODEL` | OpenAIモデル名 | `gpt-4o` | オプション |

### フロントエンド（Azure Static Web Apps）環境変数

| Secret名 | 説明 | 例 | 備考 |
|---------|------|-----|------|
| `VITE_API_BASE_URL` | APIベースURL | `/api` または `https://your-app.azurewebsites.net/api` | ビルド時に埋め込まれる |

### Docker Container Registry認証情報（オプション）

| Secret名 | 説明 | 備考 |
|---------|------|------|
| `GITHUB_REGISTRY_TOKEN` | GitHub Personal Access Token（PAT） | プライベートイメージを使用する場合のみ必要 |
| `GITHUB_REGISTRY_USERNAME` | GitHubユーザー名 | デフォルト: リポジトリオーナー名 |

**注意:** パブリックイメージを使用する場合は、これらのシークレットは不要です。

## Azure認証情報の取得方法

### 1. Service Principalの作成

Azure CLIを使用してService Principalを作成します：

```bash
az login

# サブスクリプションIDを取得
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RESOURCE_GROUP="your-resource-group-name"
APP_NAME="emergency-assistance-github"

# Service Principalを作成
az ad sp create-for-rbac \
  --name "$APP_NAME" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

上記コマンドの出力をそのまま `AZURE_CREDENTIALS` シークレットに設定します。

**出力例:**
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### 2. Azure Static Web Apps デプロイトークンの取得

1. Azure Portalにログイン
2. Static Web Appリソースを開く
3. **Manage deployment token** をクリック
4. 表示されたトークンをコピーして `AZURE_STATIC_WEB_APPS_API_TOKEN` に設定

### 3. GitHub Container Registry認証トークンの取得（オプション）

プライベートイメージを使用する場合のみ必要です：

1. GitHubにログイン
2. **Settings > Developer settings > Personal access tokens > Tokens (classic)** に移動
3. **Generate new token (classic)** をクリック
4. スコープで `read:packages` を選択
5. トークンを生成してコピー
6. `GITHUB_REGISTRY_TOKEN` シークレットに設定

**注意:** イメージをパブリックに公開する場合は、このステップは不要です。

## 環境変数の設定フロー

1. **GitHub Secretsに設定**
   - 上記のシークレットをGitHubリポジトリに設定

2. **GitHub Actions実行時**
   - ワークフローがシークレットから環境変数を読み込み
   - Azure App Serviceに環境変数を設定（`azure/appservice-settings@v2` アクションを使用）
   - デプロイを実行

3. **Azure App Serviceでの環境変数**
   - 設定された環境変数がランタイムで利用可能

## セキュリティベストプラクティス

1. **シークレットの保護**
   - 本番環境のシークレットは強力な値を使用
   - 定期的にローテーション
   - ログに出力しない（GitHub Actionsでは自動的にマスクされます）

2. **最小権限の原則**
   - Service Principalには必要最小限の権限のみを付与
   - リソースグループレベルで権限を制限

3. **環境変数の検証**
   - 必須環境変数が設定されているか確認
   - 環境変数の値が正しいフォーマットか確認（特に `DATABASE_URL`）

## トラブルシューティング

### 環境変数が設定されない

- GitHub Secretsが正しく設定されているか確認
- ワークフローのログを確認（シークレットの値は表示されません）
- Azure Portal > App Service > Configuration で環境変数を確認

詳細は [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) を参照してください。

### 認証エラー

- `AZURE_CREDENTIALS` のJSON形式が正しいか確認
- Service Principalの権限が十分か確認
- サブスクリプションIDが正しいか確認

### デプロイエラー

- リソースグループ名とApp Service名が正しいか確認
- App Serviceが存在するか確認
- ビルドログを確認してエラーを特定

## 参考リンク

- [GitHub Secrets ドキュメント](https://docs.github.com/ja/actions/security-guides/encrypted-secrets)
- [Azure Service Principal ドキュメント](https://learn.microsoft.com/ja-jp/azure/active-directory/develop/app-objects-and-service-principals)
- [Azure App Service 環境変数](https://learn.microsoft.com/ja-jp/azure/app-service/configure-common)

