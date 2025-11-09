# デプロイ前チェックリスト

本番環境へのデプロイ前に、必ず以下の手順で動作確認を行ってください。

## ローカルでの起動検証

### 1. 依存関係のインストール

```bash
npm ci || npm install
```

**確認ポイント**:
- `package-lock.json` が存在する
- エラーなく完了する

### 2. クライアントのビルド

```bash
npm run build
```

**確認ポイント**:
- `client/dist` ディレクトリが生成される
- ビルドエラーがない

### 3. サーバーの起動

```bash
NODE_ENV=production PORT=8080 node server/azure-server.js
```

**確認ポイント**:
- 以下のメッセージが表示される：
  ```
  🔗 Frontend URL: ...
  🚀 Azure Server Starting - Version: ...
  ✅ Server listening on port 8080 (env: production)
  ```

## ヘルスエンドポイントの確認

すべてのヘルスエンドポイントが200で応答することを確認してください。

### 基本エンドポイント

```bash
# /live (liveness)
curl -i http://127.0.0.1:8080/live
# 期待: HTTP/1.1 200 OK

# /ready (readiness)
curl -i http://127.0.0.1:8080/ready
# 期待: HTTP/1.1 200 OK, {"status":"ok",...}

# /ping
curl -i http://127.0.0.1:8080/ping
# 期待: HTTP/1.1 200 OK, "ok"

# /api/ping
curl -i http://127.0.0.1:8080/api/ping
# 期待: HTTP/1.1 200 OK, "ok"

# /health
curl -i http://127.0.0.1:8080/health
# 期待: HTTP/1.1 200 OK, {"status":"ok"}

# /api/health
curl -i http://127.0.0.1:8080/api/health
# 期待: HTTP/1.1 200 OK, {"status":"ok"}
```

### HEALTH_TOKEN を使用した確認（設定している場合）

```bash
# 環境変数を設定
export HEALTH_TOKEN="myhealth123"

# /ready エンドポイント（認証付き）
curl -i -H "x-health-token: $HEALTH_TOKEN" http://127.0.0.1:8080/ready
# 期待: HTTP/1.1 200 OK

# 認証なし（失敗することを確認）
curl -i http://127.0.0.1:8080/ready
# 期待: HTTP/1.1 401 Unauthorized（HEALTH_TOKENが設定されている場合）
```

### 一括確認スクリプト

```bash
#!/bin/bash
APP_URL="http://127.0.0.1:8080"
HEALTH_TOKEN="${HEALTH_TOKEN:-}"

check() {
  url="$1"
  echo -n "Checking $url ... "
  if [ -n "${HEALTH_TOKEN}" ]; then
    if curl -fsSL -H "x-health-token: ${HEALTH_TOKEN}" "$url" > /dev/null 2>&1; then
      echo "✅ OK"
      return 0
    fi
  else
    if curl -fsSL "$url" > /dev/null 2>&1; then
      echo "✅ OK"
      return 0
    fi
  fi
  echo "❌ FAILED"
  return 1
}

for endpoint in /live /ready /ping /api/ping /health /api/health; do
  check "${APP_URL}${endpoint}"
done
```

## GitHub Actions ログでの確認

デプロイ後、GitHub Actions のログで以下を確認してください：

### Oryx Build ログ

```
Running oryx build...
npm install
npm run build
npm start
```

**確認ポイント**:
- `npm install` が成功する
- `npm run build` が成功する
- `npm start` が実行される

### Health Check ログ

```
⏰ Waiting 120 seconds for startup...
🔍 Checking https://.../live
✅ /live OK
```

**確認ポイント**:
- いずれかのエンドポイントが成功する
- `/live` または `/ready` が成功することが推奨

## Azure Log Stream での確認

Azure Portal > App Service > 「ログストリーム（Log stream）」で以下を確認：

### 起動メッセージ

```
🔗 Frontend URL: https://...
🚀 Azure Server Starting - Version: ...
✅ Server listening on port xxxx (env: production)
```

**確認ポイント**:
- `env: production` が表示される
- ポート番号が表示される（通常は環境変数 `PORT` の値）

### エラーメッセージ

エラーが表示されている場合：
- データベース接続エラー（`DATABASE_URL` 未設定の場合、警告のみで継続）
- BLOBストレージ接続エラー（`AZURE_STORAGE_CONNECTION_STRING` 未設定の場合、警告のみで継続）

**注意**: これらのエラーは警告として表示されますが、サーバーは起動を継続します。

## デプロイ後の動作確認

### 1. エンドポイントの確認

```bash
# 本番環境のURLに置き換える
APP_URL="https://your-app-name.azurewebsites.net"

# /live エンドポイント
curl -i "${APP_URL}/live"
# 期待: HTTP/1.1 200 OK

# /ready エンドポイント（HEALTH_TOKEN設定時）
curl -i -H "x-health-token: your-token" "${APP_URL}/ready"
# 期待: HTTP/1.1 200 OK
```

### 2. 静的ファイルの確認

ブラウザで以下にアクセス：
- `https://your-app-name.azurewebsites.net/`
- SPA のルーティングが機能することを確認

### 3. API エンドポイントの確認

```bash
# /api/health
curl -i "${APP_URL}/api/health"
# 期待: HTTP/1.1 200 OK, {"status":"ok"}
```

## チェックリスト

デプロイ前に以下を確認：

- [ ] ローカルで `npm ci` が成功する
- [ ] ローカルで `npm run build` が成功する
- [ ] ローカルでサーバーが起動する（`NODE_ENV=production PORT=8080`）
- [ ] すべてのヘルスエンドポイントが200で応答する
- [ ] `HEALTH_TOKEN` を設定している場合、認証が機能する
- [ ] Azure App Service の環境変数が正しく設定されている
- [ ] GitHub Secrets が正しく設定されている
- [ ] `.github/workflows/deploy-server-azure.yml` の `APP_URL` が正しい

## トラブルシューティング

### ローカルで起動しない場合

1. Node.js のバージョンを確認（`node --version`、20以上が必要）
2. `package-lock.json` が存在するか確認
3. `server/package.json` の `main` が `azure-server.js` になっているか確認

### ヘルスエンドポイントが応答しない場合

1. サーバーが起動しているか確認（ログを確認）
2. ポート番号が正しいか確認（デフォルトは3000、環境変数 `PORT` で変更可能）
3. ファイアウォールやセキュリティグループの設定を確認

### デプロイ後にエンドポイントが応答しない場合

1. Azure App Service のログストリームを確認
2. GitHub Actions のログでエラーがないか確認
3. App Service の環境変数が正しく設定されているか確認
4. `SCM_DO_BUILD_DURING_DEPLOYMENT` が `true` になっているか確認

