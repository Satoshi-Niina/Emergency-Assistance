# デプロイ前環境変数チェックリスト

## 🎯 必須環境変数

### Azure App Service (バックエンド)

以下の環境変数をAzure Portalの「環境変数」設定で設定してください:

```bash
# フロントエンドURL（重要）
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# CORS許可オリジン（カンマ区切り）
CORS_ALLOW_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net,http://localhost:5173,http://localhost:8080

# Node.js環境
NODE_ENV=production

# ポート設定（Azure App Serviceでは必須）
PORT=8080
WEBSITES_PORT=8080

# セッションとJWT秘密鍵（32文字以上のランダム文字列）
SESSION_SECRET=<32文字以上のランダム文字列>
JWT_SECRET=<32文字以上のランダム文字列>

# PostgreSQLデータベース（Azure Database for PostgreSQL）
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
POSTGRES_URL=postgresql://username:password@hostname:5432/database?sslmode=require
PG_SSL=require

# Azure Blob Storage（ナレッジベース用）
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=knowledge

# OpenAI API（オプション - GPT機能用）
OPENAI_API_KEY=sk-...

# Application Insights（オプション - テレメトリ用）
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=xxx
```

### Azure Static Web Apps (フロントエンド)

GitHub Secretsまたは環境変数設定で以下を設定:

```bash
# バックエンドAPIのURL
VITE_API_BASE_URL=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
```

## 🔍 環境変数検証

### Azure Portal での確認方法

1. **Azure Portal** にログイン
2. **App Service** → `Emergency-Assistance` を選択
3. 左メニュー → **環境変数** をクリック
4. **アプリケーション設定** タブで上記の変数が設定されているか確認

### Azure CLI での確認

```bash
# すべての環境変数を表示
az webapp config appsettings list \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --output table

# 特定の環境変数を確認
az webapp config appsettings list \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --query "[?name=='FRONTEND_URL' || name=='STATIC_WEB_APP_URL' || name=='NODE_ENV'].{name:name, value:value}" \
  --output table
```

### 環境変数を一括設定

```bash
az webapp config appsettings set \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --settings \
    FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
    STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
    CORS_ALLOW_ORIGINS="https://witty-river-012f39e00.1.azurestaticapps.net,http://localhost:5173,http://localhost:8080" \
    NODE_ENV=production \
    PORT=8080 \
    WEBSITES_PORT=8080
```

## 🛠️ トラブルシューティング

### 環境変数が反映されない場合

```bash
# App Service を再起動
az webapp restart \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app
```

### 環境変数の値を確認

```bash
# アプリケーション内で環境変数を確認（デバッグエンドポイント）
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/_diag/env
```

### ログで環境変数を確認

```bash
# リアルタイムログを表示
az webapp log tail \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app

# 起動時のログで環境変数が表示される:
# 🌍 Environment: production
# 🔌 Port: 8080
# 🔗 Frontend URL: https://witty-river-012f39e00.1.azurestaticapps.net
```

## ✅ デプロイ前チェックリスト

- [ ] `FRONTEND_URL` が設定されている
- [ ] `STATIC_WEB_APP_URL` が設定されている
- [ ] `CORS_ALLOW_ORIGINS` が正しく設定されている
- [ ] `NODE_ENV=production` が設定されている
- [ ] `PORT=8080` と `WEBSITES_PORT=8080` が設定されている
- [ ] `SESSION_SECRET` が32文字以上のランダム文字列
- [ ] `JWT_SECRET` が32文字以上のランダム文字列
- [ ] `DATABASE_URL` が正しいPostgreSQL接続文字列
- [ ] `AZURE_STORAGE_CONNECTION_STRING` が正しい（オプション）
- [ ] `OPENAI_API_KEY` が設定されている（オプション）

## 🔐 セキュリティ注意事項

- 環境変数の値は **絶対にGitにコミットしない**
- `SESSION_SECRET` と `JWT_SECRET` は **強力なランダム文字列** を使用
- データベース接続文字列には **強力なパスワード** を使用
- Azure Portal で環境変数を設定する場合、**スロット設定** にチェックを入れない（本番環境のみで使用）

## 📚 関連ドキュメント

- [ENVIRONMENT_VARIABLES_LIST.md](./ENVIRONMENT_VARIABLES_LIST.md) - 環境変数の完全なリスト
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - GitHub Secrets の設定方法
- [CORS_FIX_SUMMARY.md](./CORS_FIX_SUMMARY.md) - CORS問題の修正履歴
