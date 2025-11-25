# App Service 診断手順

## 問題の概要

フロントエンドから `emergency-backend-api.azurewebsites.net` への接続が失敗しています。
`ERR_NAME_NOT_RESOLVED` エラーが発生しているため、App Service側の起動またはURL設定に問題がある可能性があります。

## 診断手順

### 1. App Serviceの実際のURLを確認

GitHub Secretsの `APP_URL` と `WEBAPP_NAME` を確認してください。

```bash
# Azure Portalで確認
# App Service > 概要 > URL

# または Azure CLIで確認
az webapp show --name <WEBAPP_NAME> --resource-group <RESOURCE_GROUP> --query defaultHostName
```

**確認ポイント:**
- `APP_URL` が `emergency-backend-api.azurewebsites.net` になっている場合、このURLが正しいか確認
- 実際のApp Service名と一致しているか確認

### 2. App Serviceの起動状態を確認

```bash
# App Serviceの状態を確認
az webapp show --name <WEBAPP_NAME> --resource-group <RESOURCE_GROUP> --query state

# 実行中のインスタンス数を確認
az webapp show --name <WEBAPP_NAME> --resource-group <RESOURCE_GROUP> --query enabledHostNames
```

**期待される状態:**
- `state`: `Running`
- 少なくとも1つのインスタンスが起動している

### 3. App Serviceのログを確認

```bash
# リアルタイムログを確認
az webapp log tail --name <WEBAPP_NAME> --resource-group <RESOURCE_GROUP>

# または Azure Portalで確認
# App Service > 監視 > ログストリーム
```

**確認ポイント:**
- サーバーが正常に起動しているか
- エラーメッセージがないか
- ポート8080でリッスンしているか
- データベース接続エラーがないか

### 4. ヘルスチェックエンドポイントを確認

```bash
# 基本的なヘルスチェック
curl https://<APP_SERVICE_URL>/health

# 詳細なヘルスチェック
curl https://<APP_SERVICE_URL>/api/health

# 詳細情報付きヘルスチェック
curl https://<APP_SERVICE_URL>/api/health/detailed
```

**期待される応答:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

### 5. App Serviceの環境変数を確認

```bash
# 環境変数の一覧を確認
az webapp config appsettings list \
  --name <WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --query "[].{name:name, value:value}" \
  --output table

# 特定の環境変数を確認
az webapp config appsettings list \
  --name <WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --query "[?name=='DATABASE_URL'].value" \
  --output tsv
```

**確認すべき環境変数:**
- `PORT`: `8080`
- `WEBSITES_PORT`: `8080`
- `NODE_ENV`: `production`
- `DATABASE_URL`: 正しく設定されているか
- `CORS_ALLOW_ORIGINS`: フロントエンドのURLが含まれているか
- `STATIC_WEB_APP_URL`: 正しく設定されているか

### 6. Dockerコンテナの状態を確認

```bash
# コンテナの状態を確認
az webapp config container show \
  --name <WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP>

# コンテナログを確認
az webapp log download \
  --name <WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --log-file app-service-logs.zip
```

**確認ポイント:**
- Dockerイメージが正しくデプロイされているか
- コンテナが起動しているか
- コンテナ内でエラーが発生していないか

### 7. App Serviceの再起動

```bash
# App Serviceを再起動
az webapp restart \
  --name <WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP>

# 再起動後、60秒待ってからヘルスチェック
sleep 60
curl https://<APP_SERVICE_URL>/health
```

### 8. ネットワーク接続の確認

```bash
# DNS解決を確認
nslookup emergency-backend-api.azurewebsites.net

# または
dig emergency-backend-api.azurewebsites.net

# 接続テスト
curl -v https://emergency-backend-api.azurewebsites.net/health
```

**確認ポイント:**
- DNS解決が成功しているか
- SSL証明書が有効か
- 接続タイムアウトが発生していないか

## よくある問題と解決方法

### 問題1: App Serviceが起動していない

**症状:**
- `ERR_NAME_NOT_RESOLVED` エラー
- ヘルスチェックがタイムアウト

**解決方法:**
1. App Serviceの状態を確認
2. 必要に応じて再起動
3. スケーリング設定を確認（最小インスタンス数が1以上）

### 問題2: ポート設定が間違っている

**症状:**
- 接続はできるが、応答がない
- 503エラー

**解決方法:**
1. `WEBSITES_PORT` が `8080` に設定されているか確認
2. `PORT` 環境変数が `8080` に設定されているか確認
3. App Serviceの設定でポートが正しく設定されているか確認

### 問題3: CORS設定の問題

**症状:**
- 接続はできるが、CORSエラーが発生

**解決方法:**
1. `CORS_ALLOW_ORIGINS` にフロントエンドのURLが含まれているか確認
2. `STATIC_WEB_APP_URL` が正しく設定されているか確認

### 問題4: データベース接続エラー

**症状:**
- サーバーは起動しているが、APIが動作しない

**解決方法:**
1. `DATABASE_URL` が正しく設定されているか確認
2. データベースのファイアウォール設定を確認
3. App Serviceのログでデータベース接続エラーを確認

## 緊急時の対処方法

### セーフモードで起動

App Serviceの環境変数に以下を追加して、データベース接続をバイパス:

```
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true
```

これにより、データベース接続なしでサーバーが起動し、基本的なAPIが動作します。

## 次のステップ

1. 上記の診断手順を実行
2. ログとエラーメッセージを確認
3. 問題が特定できたら、適切な修正を実施
4. 修正後、再度デプロイとテストを実行

