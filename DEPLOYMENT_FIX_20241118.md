# デプロイ修正レポート - 2025年11月18日

## 🐛 問題の概要

デプロイ後にログインできない問題が発生。

### エラーメッセージ
```
Access to fetch at 'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login'
from origin 'https://witty-river-012f39e00.1.azurestaticapps.net'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 診断結果

### 1. CORSエラーではなく、コンテナ起動失敗が原因

Azure App Serviceのログを確認した結果、**Dockerコンテナが起動に失敗**していました：

```
Error: Cannot find module '/app/azure-server.mjs'
Site container: emergency-assistance terminated during site startup.
Site startup probe failed after 2.4 seconds.
```

### 2. 根本原因

Dockerfileのビルドプロセスで、`server/`ディレクトリのファイルが正しく最終イメージにコピーされていませんでした。

**問題のあった箇所：**
- `COPY --from=builder /app/server ./server` という単一コマンドでは、すべてのファイルが確実にコピーされない可能性
- `.dockerignore`の設定が不明確

## ✅ 修正内容

### 1. Dockerfile の修正

#### (a) Builder ステージの検証強化

```dockerfile
# Debug: List what we have (Enhanced verification)
RUN echo "=== Builder Stage: Checking copied files ===" && \
    ls -la /app/ && \
    echo "=== Builder Stage: Server directory ===" && \
    ls -la /app/server/ && \
    echo "=== Builder Stage: Server .mjs files ===" && \
    find /app/server -name "*.mjs" -type f && \
    echo "=== Builder Stage: Verifying azure-server.mjs ===" && \
    test -f /app/server/azure-server.mjs && echo "✅ azure-server.mjs found in builder!" || (echo "❌ azure-server.mjs NOT found in builder!" && exit 1) && \
    echo "=== Builder Stage: Verifying app.js ===" && \
    test -f /app/server/app.js && echo "✅ app.js found in builder!" || (echo "❌ app.js NOT found in builder!" && exit 1)
```

#### (b) Production イメージのファイルコピーを個別化

変更前：
```dockerfile
COPY --from=builder /app/server ./server
```

変更後：
```dockerfile
# Copy server files - CRITICAL: server source files must be copied
COPY --from=builder /app/server/*.mjs ./server/
COPY --from=builder /app/server/*.js ./server/
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/routes ./server/routes
COPY --from=builder /app/server/middleware ./server/middleware
COPY --from=builder /app/server/utils ./server/utils
COPY --from=builder /app/server/services ./server/services
COPY --from=builder /app/server/scripts ./server/scripts
```

**理由：**
- 個別にコピーすることで、各ファイル・ディレクトリが確実にコピーされることを保証
- ビルド時のログで何がコピーされたか明確に確認可能

#### (c) Production イメージの検証強化

```dockerfile
# Verify server files are copied - enhanced check
RUN echo "=== Verifying production image ===" && \
    ls -la /app/ && \
    echo "=== Server directory ===" && \
    ls -la /app/server/ && \
    echo "=== Checking critical files ===" && \
    test -f /app/server/azure-server.mjs && echo "✅ azure-server.mjs found" || (echo "❌ azure-server.mjs NOT found!" && exit 1) && \
    test -f /app/server/app.js && echo "✅ app.js found" || (echo "❌ app.js NOT found!" && exit 1)
```

### 2. .dockerignore の修正

server/ フォルダが確実に含まれるように明示的に指定：

```ignore
# IMPORTANT: Ensure server files are NOT excluded
# server/ folder must be included in Docker build context
!server/
!server/**/*.js
!server/**/*.mjs
!server/**/*.json
!server/**/*.ts
```

### 3. CORS設定の強化

プリフライトリクエストを確実に処理するため、明示的なOPTIONSハンドラを追加：

```javascript
// 追加のCORS対応 - Preflightリクエストを確実に処理
app.options('*', cors(corsOptions));
```

## 🚀 デプロイ手順

### コミットとプッシュ

```bash
# Dockerfileと.dockerignoreの修正
git add Dockerfile .dockerignore
git commit -m "fix: Ensure server files are copied correctly in Docker build"
git push origin main

# CORS設定の強化
git add server/azure-server.mjs
git commit -m "fix: Add explicit OPTIONS handler for CORS preflight requests"
git push origin main
```

### GitHub Actions による自動デプロイ

プッシュ後、以下のワークフローが自動実行されます：
- `.github/workflows/server-azure-docker.yml`

デプロイには約5-10分かかります。

## 📋 デプロイ後の確認手順

### 1. GitHub Actions の確認

https://github.com/Satoshi-Niina/Emergency-Assistance/actions

以下を確認：
- ✅ ビルドが成功したか
- ✅ "Verifying production image" ステップでファイルが確認されたか
- ✅ デプロイが完了したか

### 2. Azure App Service ログの確認

```bash
# リアルタイムログを確認
az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

以下のログを確認：
- ✅ `🚀 Azure Server Starting (ES Module)...`
- ✅ `✅ CORS Allowed Origins: [...]`
- ✅ `🔗 Frontend URL: https://witty-river-012f39e00.1.azurestaticapps.net`
- ✅ サーバーが起動して待機状態になっているか

**エラーがないこと：**
- ❌ `Error: Cannot find module '/app/azure-server.mjs'` が表示されない

### 3. ヘルスチェック

```bash
# ヘルスエンドポイントを確認
curl -i https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/health
```

期待される結果：
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "timestamp": "2025-11-18T...",
  "version": "1.0.6-..."
}
```

### 4. CORS プリフライトテスト

```bash
# OPTIONSリクエストを送信
curl -i -X OPTIONS https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login \
  -H "Origin: https://witty-river-012f39e00.1.azurestaticapps.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

期待されるレスポンスヘッダー：
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control
Access-Control-Allow-Credentials: true
```

### 5. ログインテスト（ブラウザ）

1. フロントエンドにアクセス：
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```

2. ログイン情報を入力：
   - ユーザー名: `admin`
   - パスワード: （設定したパスワード）

3. ブラウザの開発者ツール (F12) → ネットワークタブで確認：

   **OPTIONS リクエスト (preflight):**
   - ✅ ステータスコード: `204 No Content`
   - ✅ `Access-Control-Allow-Origin` ヘッダーが存在
   - ✅ `Access-Control-Allow-Credentials: true`

   **POST リクエスト (`/api/auth/login`):**
   - ✅ ステータスコード: `200 OK`（成功時）
   - ✅ `Access-Control-Allow-Origin` ヘッダーが存在
   - ✅ レスポンスにトークンまたはセッション情報が含まれる

4. ログイン後の動作確認：
   - ✅ ダッシュボードにリダイレクトされる
   - ✅ エラーメッセージが表示されない
   - ✅ ユーザー情報が表示される

## 🔧 トラブルシューティング

### まだコンテナが起動しない場合

1. **ログを確認：**
   ```bash
   az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

2. **コンテナ設定を確認：**
   ```bash
   az webapp config container show --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

3. **手動で再起動：**
   ```bash
   az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

### まだ CORS エラーが発生する場合

1. **環境変数を確認：**
   ```bash
   az webapp config appsettings list \
     --name Emergency-Assistance \
     --resource-group rg-Emergencyassistant-app \
     --query "[?name=='FRONTEND_URL' || name=='STATIC_WEB_APP_URL' || name=='CORS_ALLOW_ORIGINS'].{name:name, value:value}" \
     --output table
   ```

2. **環境変数を再設定（必要な場合）：**
   ```bash
   az webapp config appsettings set \
     --name Emergency-Assistance \
     --resource-group rg-Emergencyassistant-app \
     --settings \
       FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
       STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
       CORS_ALLOW_ORIGINS="https://witty-river-012f39e00.1.azurestaticapps.net,https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net"
   ```

3. **App Service を再起動：**
   ```bash
   az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

## 📚 関連ドキュメント

- [Dockerfile](./Dockerfile) - 修正されたDockerfile
- [.dockerignore](./.dockerignore) - 修正された.dockerignore
- [CORS_FIX_SUMMARY.md](./CORS_FIX_SUMMARY.md) - 以前のCORS修正の詳細
- [DEPLOYMENT.md](./DEPLOYMENT.md) - デプロイ手順の詳細

## 🎯 今後の改善点

1. **ビルド時の検証を強化**
   - すべての重要なファイルの存在を確認
   - ビルドログを詳細に出力

2. **ローカルでのDockerテスト**
   - デプロイ前にローカルでDockerイメージをビルド・テスト
   - 起動確認とヘルスチェック

3. **CI/CDの改善**
   - デプロイ前の自動テスト
   - ヘルスチェックの自動化

---

**修正日時:** 2025年11月18日
**コミットハッシュ:** ae8d3035, 5f92f4e9
**ステータス:** デプロイ中（5-10分待機）
