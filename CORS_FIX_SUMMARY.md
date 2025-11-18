# CORS エラー修正サマリー

## 🐛 問題の概要

Azure Static Web Apps (`https://witty-river-012f39e00.1.azurestaticapps.net`) から Azure App Service (`https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net`) にログインリクエストを送信した際、CORS エラーが発生してログインできませんでした。

**エラーメッセージ:**
```
Access to fetch at 'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login' from origin 'https://witty-river-012f39e00.1.azurestaticapps.net' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 原因

1. **Azure App Service の環境変数が未設定**
   - `FRONTEND_URL` が設定されていなかった
   - `STATIC_WEB_APP_URL` が設定されていなかった
   - デフォルト値として `https://example-static.azurestaticapps.net` が使用されていた

2. **CORS ミドルウェアの設定不足**
   - OPTIONS プリフライトリクエストの処理が不十分
   - CORS ヘッダーが正しく設定されていなかった

## ✅ 修正内容

### 1. Azure App Service 環境変数の設定

以下の環境変数を Azure App Service に設定しました:

```bash
az webapp config appsettings set \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --settings \
    FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
    STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net \
    CORS_ALLOW_ORIGINS="http://localhost:5173,http://localhost:8080,https://witty-river-012f39e00.1.azurestaticapps.net"
```

### 2. サーバーコードの修正 (`server/azure-server.mjs`)

#### (a) デフォルト URL の追加

```javascript
// Azure Static Web Apps のデフォルトURL
const DEFAULT_STATIC_WEB_APP_URL = 'https://witty-river-012f39e00.1.azurestaticapps.net';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.STATIC_WEB_APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_STATIC_WEB_APP_URL
    : 'http://localhost:8080');
```

#### (b) CORS ミドルウェアの強化

- OPTIONS プリフライトリクエストの処理を改善
- CORS ヘッダーを確実に設定するように修正
- `setHeader` を使用してヘッダーを設定
- Azure Static Web Apps ドメイン (`*.azurestaticapps.net`) を自動的に許可

**主な変更点:**
```javascript
// CORS ヘッダーを常に設定
if (origin) {
  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Cookie');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
  }
}

// OPTIONSリクエストの処理（preflightリクエスト）
if (req.method === 'OPTIONS') {
  console.log('🔍 OPTIONS (preflight) request from:', origin || 'no-origin');
  if (originAllowed || !origin) {
    console.log('✅ OPTIONS request approved for origin:', origin || 'no-origin');
    return res.status(204).end();
  }
}
```

### 3. App Service の再起動

```bash
az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

### 4. 変更のデプロイ

```bash
git add server/azure-server.mjs
git commit -m "fix: Enhance CORS configuration for Azure Static Web Apps login"
git push origin main
```

## 🎯 修正後の動作確認

### 1. GitHub Actions でのデプロイ完了を確認

https://github.com/Satoshi-Niina/Emergency-Assistance/actions にアクセスして、デプロイが完了していることを確認してください。

### 2. ログインテスト

1. **フロントエンドにアクセス:**
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```

2. **ログイン情報を入力:**
   - ユーザー名: `admin`
   - パスワード: `admin`（または設定したパスワード）

3. **期待される結果:**
   - ✅ CORS エラーが発生しない
   - ✅ ログインに成功する
   - ✅ ダッシュボードにリダイレクトされる

### 3. デバッグ情報の確認

ブラウザの開発者ツール (F12) → ネットワークタブで以下を確認:

- **OPTIONS リクエスト (preflight):**
  - ステータスコード: `204 No Content`
  - レスポンスヘッダーに以下が含まれる:
    ```
    Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net
    Access-Control-Allow-Credentials: true
    Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
    Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Cookie
    ```

- **POST リクエスト (`/api/auth/login`):**
  - ステータスコード: `200 OK`（成功時）
  - レスポンスヘッダーに `Access-Control-Allow-Origin` が含まれる

## 📋 設定内容の詳細

### Azure App Service 環境変数

| 変数名 | 値 | 用途 |
|--------|-----|------|
| `FRONTEND_URL` | `https://witty-river-012f39e00.1.azurestaticapps.net` | フロントエンドの URL |
| `STATIC_WEB_APP_URL` | `https://witty-river-012f39e00.1.azurestaticapps.net` | Azure Static Web App の URL |
| `CORS_ALLOW_ORIGINS` | `http://localhost:5173,http://localhost:8080,https://witty-river-012f39e00.1.azurestaticapps.net` | CORS で許可するオリジンのリスト |

### 許可されるオリジン

サーバーは以下のオリジンからのリクエストを許可します:

1. **環境変数で設定されたオリジン:**
   - `FRONTEND_URL`
   - `STATIC_WEB_APP_URL`
   - `CORS_ALLOW_ORIGINS` に含まれるすべてのオリジン

2. **自動的に許可されるオリジン:**
   - `*.azurestaticapps.net` (すべての Azure Static Web Apps)
   - `localhost:*` (すべてのローカルホスト)
   - `127.0.0.1:*` (すべてのローカルホスト)

3. **明示的に設定されたオリジン:**
   - `https://witty-river-012f39e00.1.azurestaticapps.net`
   - `http://localhost:5173` (開発用)
   - `http://localhost:8080` (開発用)

## 🔧 今後の環境変数追加方法

新しい環境変数を追加する場合:

```bash
# Azure CLI を使用
az webapp config appsettings set \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --settings NEW_VARIABLE_NAME=value

# App Service を再起動
az webapp restart \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app
```

または Azure Portal で:
1. App Service (`Emergency-Assistance`) を開く
2. 左メニュー → 「設定」→「環境変数」
3. 「アプリケーション設定」タブで「+ 新規追加」
4. 設定後、「保存」→「続行」→ App Service が自動的に再起動

## 📚 関連ドキュメント

- [ENVIRONMENT_VARIABLES_LIST.md](./ENVIRONMENT_VARIABLES_LIST.md) - 環境変数の完全なリスト
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - GitHub Secrets の設定方法
- [DEPLOYMENT.md](./DEPLOYMENT.md) - デプロイ手順の詳細

## 🆘 トラブルシューティング

### まだ CORS エラーが発生する場合

1. **デプロイが完了しているか確認:**
   ```bash
   az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

2. **環境変数が正しく設定されているか確認:**
   ```bash
   az webapp config appsettings list --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --query "[?name=='FRONTEND_URL' || name=='STATIC_WEB_APP_URL'].{name:name, value:value}" --output table
   ```

3. **App Service を再起動:**
   ```bash
   az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

4. **ブラウザのキャッシュをクリア:**
   - Ctrl + Shift + Delete → すべてのキャッシュをクリア
   - または、シークレットモードで開く

### ログの確認方法

```bash
# リアルタイムログ
az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app

# 最新のログをダウンロード
az webapp log download --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --log-file app-logs.zip
```

---

## 🚀 今後の修正・デプロイフロー

### 標準的なデプロイフロー（自動化済み）

```bash
# 1. コードを修正
# (エディタで server/azure-server.mjs などを編集)

# 2. 変更をコミット
git add .
git commit -m "fix: 修正内容の説明"

# 3. GitHub にプッシュ
git push origin main

# ↓ ここから GitHub Actions が自動実行 ↓
```

### GitHub Actions の自動処理フロー

プッシュすると、以下のステップが自動的に実行されます:

1. **📋 コードのチェックアウト**
   - 最新のコードを取得

2. **🔍 環境変数の設定**
   - `NODE_ENV=production`
   - `FRONTEND_URL` / `STATIC_WEB_APP_URL`
   - その他の環境変数

3. **🐳 Docker イメージのビルド**
   - `Dockerfile` に基づいてイメージをビルド
   - タグ: `latest` と `{commit-sha}`

4. **📦 Azure Container Registry (ACR) にプッシュ**
   - ビルドしたイメージを ACR にプッシュ
   - レジストリ: `emergencyassistanceacr.azurecr.io`

5. **🔧 Azure App Service の設定**
   - Docker コンテナの設定
   - 環境変数の設定（自動）

6. **🚀 Azure App Service にデプロイ**
   - 新しい Docker イメージをデプロイ
   - コンテナの起動待機（最大10分）

7. **🏥 ヘルスチェック**
   - `/health` エンドポイントで動作確認
   - 最大15回リトライ（20秒間隔）

### デプロイ対象のファイル

以下のファイルが変更されると自動デプロイが実行されます:

- `server/**` - サーバーコード
- `shared/**` - 共有コード
- `Dockerfile` - Docker イメージ定義
- `docker-compose.yml` - Docker Compose 設定
- `.dockerignore` - Docker ビルドから除外するファイル
- `.github/workflows/server-azure-docker.yml` - ワークフロー定義

### デプロイの進行状況確認方法

```bash
# 方法1: GitHub CLI（要認証）
gh run list --limit 5

# 方法2: ブラウザで確認
# https://github.com/Satoshi-Niina/Emergency-Assistance/actions
```

### 手動デプロイ（緊急時）

GitHub Actions を経由せずに直接デプロイする場合:

```bash
# 1. Docker イメージをビルド
docker build -t emergencyassistanceacr.azurecr.io/emergency-assistance:manual .

# 2. ACR にログイン
az acr login --name emergencyassistanceacr

# 3. イメージをプッシュ
docker push emergencyassistanceacr.azurecr.io/emergency-assistance:manual

# 4. Azure App Service を更新
az webapp config container set \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --docker-custom-image-name emergencyassistanceacr.azurecr.io/emergency-assistance:manual

# 5. App Service を再起動
az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

### デプロイ完了までの時間

- **通常**: 5-10分
  - ビルド: 2-3分
  - プッシュ: 1-2分
  - デプロイ: 2-5分

- **初回デプロイ**: 10-15分
  - コンテナイメージのダウンロード時間が追加

### トラブルシューティング

#### デプロイが失敗した場合

1. **GitHub Actions のログを確認:**
   ```
   https://github.com/Satoshi-Niina/Emergency-Assistance/actions
   ```

2. **Azure App Service のログを確認:**
   ```bash
   az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

3. **手動で再起動:**
   ```bash
   az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

#### ビルドが失敗した場合

- **Docker ビルドエラー:** `Dockerfile` の構文を確認
- **依存関係エラー:** `package.json` の依存関係を確認
- **メモリ不足:** Docker Buildx のメモリ設定を増やす

---

**修正日時:** 2025年11月17日
**コミットハッシュ:** 7bacc89e
**修正者:** GitHub Copilot
