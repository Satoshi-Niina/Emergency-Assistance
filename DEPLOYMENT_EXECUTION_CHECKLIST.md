# Azure デプロイ実行チェックリスト

## 🎯 デプロイ準備完了確認

### ✅ 作成されたファイル

- [x] `.github/workflows/azure-static-web-apps-salmon-desert-065ec5000.yml` - フロントエンド用ワークフロー
- [x] `.github/workflows/azure-backend-deploy.yml` - サーバー用ワークフロー
- [x] `Dockerfile.backend` - サーバー用 Docker ファイル
- [x] `GITHUB_SECRETS_SETUP.md` - GitHub Secrets 設定ガイド

### 🔐 GitHub Secrets 設定

以下のシークレットを GitHub リポジトリに設定する必要があります：

#### 必須シークレット

- [ ] `AZURE_CREDENTIALS` - Azure Service Principal 認証情報
- [ ] `DATABASE_URL` - PostgreSQL 接続文字列
- [ ] `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage 接続文字列
- [ ] `OPENAI_API_KEY` - OpenAI API キー
- [ ] `SESSION_SECRET` - セッション暗号化キー
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` - SWA API トークン（設定済み）

### 🏗️ Azure リソース作成

#### 1. Azure Container Registry

```bash
az acr create \
  --resource-group emergency-assistance-rg \
  --name emergencyassistance \
  --sku Standard \
  --admin-enabled true
```

#### 2. Log Analytics Workspace

```bash
az monitor log-analytics workspace create \
  --resource-group emergency-assistance-rg \
  --workspace-name emergency-logs
```

#### 3. Container Apps Environment

```bash
az containerapp env create \
  --name emergency-assistance-env \
  --resource-group emergency-assistance-rg \
  --logs-workspace-id "$(az monitor log-analytics workspace show \
    --resource-group emergency-assistance-rg \
    --workspace-name emergency-logs \
    --query customerId -o tsv)" \
  --logs-workspace-key "$(az monitor log-analytics workspace get-shared-keys \
    --resource-group emergency-assistance-rg \
    --workspace-name emergency-logs \
    --query primarySharedKey -o tsv)"
```

#### 4. Container App

```bash
az containerapp create \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --environment emergency-assistance-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --registry-server emergencyassistance.azurecr.io
```

## 🚀 デプロイ実行手順

### 1. シークレット設定の完了確認

GitHub リポジトリの **Settings > Secrets and variables > Actions** で全てのシークレットが設定されていることを確認

### 2. コードのプッシュ

```bash
# 変更をコミット
git add .
git commit -m "Add Azure deployment workflows and configurations"

# mainブランチにプッシュ（フロントエンド・サーバー両方がトリガーされる）
git push origin main
```

### 3. デプロイ監視

1. **GitHub Actions タブ**でワークフローの実行状況を確認
2. 両方のワークフローが正常に完了することを確認

### 4. デプロイ後の確認

#### フロントエンド確認

```
URL: https://emergencyassistance-swa.azurestaticapps.net
確認項目:
- ページが正常に表示される
- APIとの通信が正常に動作する
```

#### サーバー確認

```bash
# Container App のURLを取得
az containerapp show \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv

# ヘルスチェック
curl https://[CONTAINER_APP_URL]/api/health
```

期待される応答:

```json
{
  "status": "ok",
  "timestamp": "2024-XX-XX...",
  "service": "Emergency Assistance API"
}
```

## 🔧 トラブルシューティング

### デプロイエラーの対処

#### 1. Docker ビルドエラー

- `Dockerfile.backend` の内容確認
- 依存関係の問題確認

#### 2. Azure 認証エラー

- `AZURE_CREDENTIALS` の形式確認
- Service Principal の権限確認

#### 3. Container Registry アクセスエラー

- ACR の管理者アクセスが有効になっているか確認
- レジストリ名の確認

#### 4. 環境変数エラー

- シークレット名の確認
- 接続文字列の形式確認

### ログの確認方法

```bash
# GitHub Actionsのログ確認
# リポジトリの Actions タブでワークフロー実行ログを確認

# Container Appのログ確認
az containerapp logs show \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --follow
```

## 📊 デプロイ完了後の設定

### 1. フロントエンドの API URL 更新

デプロイ後、サーバーの正確な URL を取得して、フロントエンドの環境変数を更新：

```bash
# Container AppのURLを取得
BACKEND_URL=$(az containerapp show \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "Backend URL: https://$BACKEND_URL"
```

Azure Static Web Apps の環境変数を更新：

```
VITE_API_BASE_URL=https://[CONTAINER_APP_URL]
```

### 2. CORS 設定の確認

サーバー側でフロントエンドドメインが CORS で許可されていることを確認

### 3. データベースマイグレーション

```bash
# Container App内でマイグレーション実行（必要に応じて）
az containerapp exec \
  --name emergency-backend-api \
  --resource-group emergency-assistance-rg \
  --command "npm run db:migrate"
```

## ✅ デプロイ成功の確認

- [ ] フロントエンドが正常に表示される
- [ ] サーバー API が応答する
- [ ] データベース接続が正常
- [ ] Azure Storage 接続が正常
- [ ] 認証機能が動作する
- [ ] ファイルアップロード機能が動作する

これで、フロントエンドとサーバーの両方の Azure デプロイ準備が完了です！
