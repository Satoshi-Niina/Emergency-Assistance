# 緊急対応支援システム Azure セットアップガイド

このガイドでは、緊急対応支援システムのデプロイに必要なAzureリソースの設定方法を説明します。

## システム概要

以下のAzureサービスを使用します：
- **Azure Static Web Apps** - フロントエンドホスティング
- **Azure App Service** - バックエンドAPI（コンテナ化）
- **Azure Database for PostgreSQL** - データストレージ
- **Azure Blob Storage** - ファイルストレージ
- **GitHub Container Registry (GHCR)** - コンテナイメージ

## 前提条件

開始前に以下を確認してください：
- 十分な権限を持つAzureサブスクリプション
- リポジトリアクセス権のあるGitHubアカウント
- Azure CLI（オプション、手動操作用）

## ステップ1: Azure リソース作成

### 1.1 リソースグループ
すべてのリソースを格納するリソースグループを作成：

```bash
az group create --name emergency-assistance-rg --location "Japan West"
```

### 1.2 Azure Database for PostgreSQL
PostgreSQLデータベースを作成：

```bash
az postgres flexible-server create \
  --resource-group emergency-assistance-rg \
  --name emergencyassistance-db \
  --admin-user satoshi_niina \
  --admin-password "SecurePass2025ABC" \
  --sku-name Standard_B1ms \
  --version 14 \
  --location "Japan West" \
  --public-access 0.0.0.0
```

### 1.3 Azure Blob Storage
ファイルアップロード用ストレージアカウントを作成：

```bash
az storage account create \
  --name emergencyassistancestorage \
  --resource-group emergency-assistance-rg \
  --location "Japan West" \
  --sku Standard_LRS
```

### 1.4 Azure App Service (バックエンド)
バックエンドAPI用のApp Serviceを作成：

```bash
az appservice plan create \
  --name emergencyassistance-plan \
  --resource-group emergency-assistance-rg \
  --location "Japan West" \
  --is-linux \
  --sku B1

az webapp create \
  --name emergencyassistance-sv-fbanemhrbshuf9bd \
  --resource-group emergency-assistance-rg \
  --plan emergencyassistance-plan \
  --deployment-container-image-name nginx
```

### 1.5 Azure Static Web Apps (フロントエンド)
フロントエンド用のStatic Web Appを作成：

```bash
az staticwebapp create \
  --name emergencyassistance-frontend \
  --resource-group emergency-assistance-rg \
  --location "East Asia" \
  --source https://github.com/Satoshi-Niina/Emergency-Assistance \
  --branch main \
  --app-location "/client" \
  --output-location "dist"
```

## ステップ2: GitHub Secrets設定

GitHubリポジトリに以下のSecretsを追加してください：

### 2.1 Azure Static Web Apps トークン
デプロイメントトークンを取得：

```bash
az staticwebapp secrets list --name emergencyassistance-frontend --resource-group emergency-assistance-rg
```

これを `AZURE_STATIC_WEB_APPS_API_TOKEN_WITTY_RIVER_012F39E00` としてGitHub Secretsに追加。

### 2.2 Azure App Service パブリッシュプロファイル（推奨）
パブリッシュプロファイルを取得：

```bash
az webapp deployment list-publishing-profiles \
  --name emergencyassistance-sv-fbanemhrbshuf9bd \
  --resource-group emergency-assistance-rg \
  --xml
```

これを `AZURE_WEBAPP_PUBLISH_PROFILE` としてGitHub Secretsに追加。

### 2.3 Azure CLI認証（代替方法）
Service Principalを作成してAzure CLI認証を使用する場合：

```bash
# Subscription IDを取得
az account show --query id -o tsv

# Service Principalを作成
az ad sp create-for-rbac --name "emergency-assistance-github" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/emergency-assistance-rg \
  --sdk-auth
```

**出力例（GitHub Secret値）:**
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

これを `AZURE_CREDENTIALS` としてGitHub Secretsに追加。

## ステップ3: App Service環境変数設定

Azure App Serviceに以下の環境変数を設定：

```bash
az webapp config appsettings set \
  --name emergencyassistance-sv-fbanemhrbshuf9bd \
  --resource-group emergency-assistance-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require" \
    JWT_SECRET="32文字以上のJWTシークレット" \
    SESSION_SECRET="32文字以上のセッションシークレット" \
    FRONTEND_URL="https://witty-river-012f39e00.1.azurestaticapps.net" \
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=emergencyassistancestorage;AccountKey=...;EndpointSuffix=core.windows.net" \
    AZURE_STORAGE_CONTAINER_NAME="knowledge" \
    OPENAI_API_KEY="sk-your-openai-api-key-here" \
    PG_SSL="require" \
    BYPASS_DB_FOR_LOGIN="false"
```

## ステップ4: コンテナデプロイ設定

App ServiceをGitHub Container Registryのコンテナを使用するよう設定：

```bash
az webapp config container set \
  --name emergencyassistance-sv-fbanemhrbshuf9bd \
  --resource-group emergency-assistance-rg \
  --container-image-name ghcr.io/satoshi-niina/emergency-assistance-backend:latest \
  --container-registry-url https://ghcr.io \
  --container-registry-user satoshi-niina \
  --container-registry-password "GitHubトークン"
```

## ステップ5: Static Web App設定

`client/staticwebapp.config.json` でStatic Web Appの設定を更新：

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"],
      "rewrite": "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/{*path}",
      "forwardHeaders": true
    }
  ]
}
```

## ステップ6: 自動デプロイメント設定

### GitHub Actions ワークフロー
- **フロントエンド**: `.github/workflows/frontend.yml` - Azure Static Web Appsへのデプロイ
- **バックエンド**: `.github/workflows/backend.yml` - Docker化されたApp Serviceへのデプロイ

### 現在のシークレット状況

| シークレット名 | 状況 | 用途 |
|-------------|--------|---------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | ✅ 設定済み | バックエンドデプロイ |
| `GITHUB_TOKEN` | ✅ 自動提供 | コンテナレジストリアクセス |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | ✅ 設定済み | フロントエンドデプロイ |

## ステップ7: デプロイメントテスト

1. mainブランチにコードをプッシュ
2. GitHub Actionsでデプロイメント状況を確認
3. フロントエンドをテスト: https://witty-river-012f39e00.1.azurestaticapps.net
4. バックエンドをテスト: https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health

## トラブルシューティング

### よくある問題

1. **コンテナが起動しない**: App Serviceログと環境変数を確認
2. **データベース接続失敗**: 接続文字列とファイアウォールルールを確認
3. **Static Web Appビルド失敗**: ビルド設定と依存関係を確認
4. **CORSエラー**: バックエンドのCORS設定でフロントエンドURLを確認
5. **Azure認証エラー**: パブリッシュプロファイルの有効期限を確認

### 便利なコマンド

デプロイメント監視：
```bash
# App Serviceログを確認
az webapp log tail --name emergencyassistance-sv-fbanemhrbshuf9bd --resource-group emergency-assistance-rg

# Static Web Appデプロイメントを確認
az staticwebapp show --name emergencyassistance-frontend --resource-group emergency-assistance-rg

# コンテナ設定確認
az webapp config container show \
  --name emergencyassistance-sv-fbanemhrbshuf9bd \
  --resource-group emergency-assistance-rg
```

## セキュリティ考慮事項

1. 本番環境では機密情報にAzure Key Vaultを使用
2. PostgreSQL用の適切なファイアウォールルールを設定
3. 可能な場合はマネージドIDを使用
4. アクセスキーとシークレットを定期的にローテーション
5. アクセスログを監視してアラートを設定

## コスト最適化

1. ワークロードに適切なサービス階層を使用
2. 需要に基づくオートスケーリングを設定
3. リソース使用量を監視して必要に応じて調整
4. 予測可能なワークロードにはReserved Instancesを検討

## チーム開発における注意点

1. **プッシュのみでデプロイ**: チームメンバーはmainブランチにプッシュするだけで自動デプロイ
2. **クリーンデプロイ**: 古いデータが残らないよう、毎回クリーンビルドを実行
3. **環境変数管理**: 本番環境の環境変数はAzure Portal/CLIで管理
4. **ログ監視**: デプロイメント後はApp Serviceログを確認

---

詳細情報については、公式Azureドキュメントを参照してください：
- [Azure Static Web Apps ドキュメント](https://docs.microsoft.com/ja-jp/azure/static-web-apps/)
- [Azure App Service ドキュメント](https://docs.microsoft.com/ja-jp/azure/app-service/)
- [Azure Database for PostgreSQL ドキュメント](https://docs.microsoft.com/ja-jp/azure/postgresql/)
