# デプロイメントチェックリスト

## GitHub Secretsの設定

### 必須: Client (Static Web Apps)

GitHub リポジトリ → Settings → Secrets and variables → Actions で以下を設定:

#### `VITE_BACKEND_SERVICE_URL`
- **値**: `https://your-app-service-name.azurewebsites.net`
- **説明**: Azure App ServiceのURL（バックエンドAPI）
- **確認方法**: Azure Portal → App Services → 概要ページの「URL」
- **重要**: `/api`は含めない（スクリプトで自動追加）

#### `AZURE_STATIC_WEB_APPS_API_TOKEN`
- **説明**: Azure Static Web Appsのデプロイトークン
- **確認方法**: Azure Portal → Static Web App → Manage deployment token

### 必須: Server (App Service)

Azure Portal → App Services → 構成 → アプリケーション設定で以下を設定:

#### `AZURE_STORAGE_CONNECTION_STRING`
- **説明**: Azure Blob Storageの接続文字列
- **フォーマット**: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net`
- **確認方法**: Azure Portal → Storage Accounts → アクセスキー → 接続文字列

#### `AZURE_STORAGE_CONTAINER_NAME`
- **デフォルト値**: `knowledge`
- **説明**: Blob Storageのコンテナ名

#### `BLOB_PREFIX`
- **デフォルト値**: `knowledge-base/`
- **説明**: Blob内のパスプレフィックス

#### `DATABASE_URL`
- **説明**: PostgreSQL接続文字列
- **フォーマット**: `postgresql://username:password@host:port/database`

#### `SESSION_SECRET`
- **説明**: セッション暗号化用のシークレットキー
- **生成方法**: ランダムな文字列（32文字以上推奨）

## デプロイ前の確認

### 1. Azure Blob Storageの確認
- [ ] Storage Accountが存在する
- [ ] `knowledge`コンテナが存在する
- [ ] `knowledge-base/images/`ディレクトリ構造が正しい
- [ ] コンテナのアクセスレベルが「Blob（BLOBの匿名読み取りアクセスのみ）」または「Private」

### 2. ローカルビルドテスト
```powershell
cd client
$env:VITE_BACKEND_SERVICE_URL = "https://your-app-service-name.azurewebsites.net"
npm run build

# プレースホルダーが置換されているか確認
Select-String -Path "dist/index.html" -Pattern "%%%VITE_BACKEND_SERVICE_URL%%%"
# → 何も表示されなければOK

# 置換後の値を確認
Select-String -Path "dist/index.html" -Pattern "BACKEND_SERVICE_URL"
```

### 3. GitHub Actionsでの確認
- [ ] `.github/workflows/deploy-cliente-azure.yml`が更新されている
- [ ] `client/scripts/replace-env.cjs`が更新されている
- [ ] GitHub Secretsに`VITE_BACKEND_SERVICE_URL`が設定されている

## デプロイ手順

### 1. コミット & プッシュ
```powershell
git add .
git commit -m "fix: Update runtime config replacement for Azure deployment"
git push origin main
```

### 2. GitHub Actionsの監視
- GitHub → Actions タブで`Deploy Client (Azure Static Web Apps)`ワークフローを確認
- "Build client"ステップのログで以下を確認:
  ```
  🔧 Building with environment:
     VITE_BACKEND_SERVICE_URL: https://emergency-assistance-xxxxx.azurewebsites.net
  ```
- "Verify build output"ステップで:
  ```
  ✅ No placeholders found - replacement successful
  ```

### 3. デプロイ後の動作確認

#### ブラウザDev Toolsで確認
1. Azure Static Web Appsのページを開く
2. F12でDev Toolsを開く
3. Consoleで以下を実行:
   ```javascript
   console.log('Runtime Config:', window.runtimeConfig);
   ```
   期待値:
   ```javascript
   {
     API_BASE_URL: "https://emergency-assistance-xxxxx.azurewebsites.net/api",
     CORS_ALLOW_ORIGINS: "https://your-static-web-app.azurestaticapps.net",
     ENVIRONMENT: "production"
   }
   ```

#### Network タブで確認
1. Network タブを開く
2. ログイン実行
3. `/api/emergency-flow/list`などのリクエストURLを確認
   - 正しいドメインにリクエストされているか
   - `ERR_NAME_NOT_RESOLVED`エラーが解消されているか

#### Blob Storage画像の確認
1. Consoleで画像URLエラーがないか確認
2. 画像が正しく表示されているか
3. `404 (The specified resource does not exist.)`エラーがないか

## トラブルシューティング

### ❌ プレースホルダーが置換されていない
**原因**: GitHub Secretsに`VITE_BACKEND_SERVICE_URL`が未設定
**対処**: GitHub Secrets設定を確認

### ❌ APIリクエストが404エラー
**原因**: App Serviceが起動していないか、ルーティングエラー
**対処**: 
1. Azure Portal → App Service → 概要で「実行中」を確認
2. ログストリームでエラーを確認

### ❌ Blob Storage画像が404エラー
**原因**: 環境変数未設定またはコンテナ/ファイル不在
**対処**:
1. App Serviceの環境変数確認
2. Storage Account → Containers → `knowledge`コンテナ確認
3. ファイルパス確認（`knowledge-base/images/...`）

### ❌ CORS エラー
**原因**: App ServiceのCORS設定不足
**対処**: App Service → CORS設定でStatic Web AppsのURLを追加
