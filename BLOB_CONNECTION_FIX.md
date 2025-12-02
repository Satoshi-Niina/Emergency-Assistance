# BLOBストレージ接続問題の修正手順

## 問題の概要

デプロイ後、Azure Static Web AppsからAzure App Service (バックエンドAPI)への接続は成功していますが、以下の問題が発生していました:

1. **PLACEHOLDER_API_BASE_URLが置換されていない** - ビルド時に`runtime-config.js`のプレースホルダーが正しく置換されず、フロントエンドがバックエンドAPIに接続できない
2. **CORS設定の不足** - Azure Static Web Appsからの動的なオリジンが許可リストに含まれていない
3. **一部の画面でBLOB読み込みは成功するが書き込みが失敗** - APIエンドポイントは正しく実装されているが、フロントエンドからの接続に問題がある

## 修正内容

### 1. runtime-config.jsのフォールバック処理追加

**ファイル:** `client/public/runtime-config.js`

```javascript
// PLACEHOLDER が置換されていない場合のフォールバック
if (apiBaseUrl === "PLACEHOLDER_API_BASE_URL" || apiBaseUrl.includes("PLACEHOLDER")) {
  console.warn('⚠️ PLACEHOLDER_API_BASE_URL was not replaced during build');
  console.warn('⚠️ Attempting to use default Azure App Service URL...');
  
  // デフォルトのAzure App Service URL（実際のApp Service名に置き換える）
  apiBaseUrl = "https://emergency-assistance-backend.azurewebsites.net/api";
  
  console.log('🔄 Fallback API_BASE_URL:', apiBaseUrl);
}
```

**重要:** `emergency-assistance-backend.azurewebsites.net`を実際のAzure App Service名に置き換えてください。

### 2. ビルドスクリプトの修正

**ファイル:** `client/scripts/replace-env.cjs`

`runtime-config.js`ファイルのPLACEHOLDER置換処理を追加しました:

```javascript
// runtime-config.js ファイルを処理
const runtimeConfigPath = path.join(__dirname, '..', 'dist', 'runtime-config.js');

if (fs.existsSync(runtimeConfigPath)) {
  let runtimeConfigContent = fs.readFileSync(runtimeConfigPath, 'utf-8');

  // PLACEHOLDER_API_BASE_URL を置換
  runtimeConfigContent = runtimeConfigContent.replace(
    /PLACEHOLDER_API_BASE_URL/g,
    envVars.VITE_API_BASE_URL || ''
  );

  fs.writeFileSync(runtimeConfigPath, runtimeConfigContent, 'utf-8');
  console.log(' Environment variables replaced in dist/runtime-config.js');
}
```

### 3. CORS設定の強化

**ファイル:** `server/azure-server.mjs`

Azure Static Web Appsの動的なオリジンを許可するようにCORS設定を強化:

```javascript
// 本番環境でazurestaticapps.netからのリクエストは許可（デバッグ用）
if (process.env.NODE_ENV === 'production' && origin && origin.includes('azurestaticapps.net')) {
  console.warn('⚠️ Allowing azurestaticapps.net origin for debugging');
  callback(null, true);
}
```

## デプロイ手順

### 事前準備

1. **Azure App Service名の確認**
   ```bash
   az webapp list --resource-group <your-resource-group> --query "[].{name:name, defaultHostName:defaultHostName}" --output table
   ```

2. **環境変数の設定確認**
   
   Azure Portalで以下の環境変数が設定されていることを確認:
   
   **App Service (バックエンド):**
   - `AZURE_STORAGE_CONNECTION_STRING`: BLOBストレージの接続文字列
   - `AZURE_STORAGE_CONTAINER_NAME`: `knowledge` (デフォルト)
   - `FRONTEND_URL`: Static Web AppのURL
   - `STATIC_WEB_APP_URL`: Static Web AppのURL
   - `DATABASE_URL`: PostgreSQLの接続文字列
   - `SESSION_SECRET`: セッション用の秘密鍵
   
   **Static Web Apps (フロントエンド):**
   - `VITE_API_BASE_URL`: App ServiceのURL (例: `https://emergency-assistance-backend.azurewebsites.net/api`)

### デプロイ手順

#### 1. ローカルビルドとテスト

```bash
# クライアントのビルド（環境変数を設定してビルド）
cd client
export VITE_API_BASE_URL="https://your-app-service.azurewebsites.net/api"
npm run build

# ビルド結果を確認
cat dist/runtime-config.js | grep PLACEHOLDER
# → "PLACEHOLDER" が残っていないことを確認

# サーバーのビルド（必要に応じて）
cd ../server
npm run build
```

#### 2. Azure Static Web Appsへのデプロイ

```bash
# GitHub経由でデプロイする場合
git add .
git commit -m "fix: BLOB接続問題を修正 - runtime-config.jsのPLACEHOLDER置換を追加"
git push origin main

# または Azure CLIで直接デプロイ
cd client
az staticwebapp deploy \
  --name <your-static-web-app-name> \
  --resource-group <your-resource-group> \
  --app-location ./dist \
  --no-wait
```

#### 3. Azure App Serviceへのデプロイ

```bash
# サーバーコードをデプロイ
cd server
az webapp deploy \
  --resource-group <your-resource-group> \
  --name <your-app-service-name> \
  --src-path . \
  --type zip \
  --clean true
```

#### 4. デプロイ後の確認

```bash
# App Serviceの起動確認
curl https://<your-app-service>.azurewebsites.net/api/health

# BLOB診断エンドポイントで接続確認
curl https://<your-app-service>.azurewebsites.net/api/_diag/blob-test

# Static Web Appの動作確認
# ブラウザで https://<your-static-web-app>.azurestaticapps.net を開く
```

### デプロイ後のトラブルシューティング

#### ケース1: PLACEHOLDERが残っている

**症状:** ブラウザのコンソールに "PLACEHOLDER_API_BASE_URL was not replaced during build" と表示される

**確認方法:**
```bash
# デプロイされたruntime-config.jsを確認
curl https://<your-static-web-app>.azurestaticapps.net/runtime-config.js
```

**解決方法:**
1. `client/public/runtime-config.js`のフォールバック処理で正しいApp Service URLが設定されていることを確認
2. ビルド時に`VITE_API_BASE_URL`環境変数が設定されていることを確認
3. 再ビルド・再デプロイ

#### ケース2: CORSエラーが発生

**症状:** ブラウザのコンソールに "CORS blocked origin" と表示される

**確認方法:**
```bash
# App Serviceのログを確認
az webapp log tail --name <your-app-service> --resource-group <your-resource-group>
```

**解決方法:**
1. App Serviceの環境変数を確認:
   ```bash
   az webapp config appsettings list --name <your-app-service> --resource-group <your-resource-group>
   ```
2. `FRONTEND_URL`と`STATIC_WEB_APP_URL`が正しく設定されていることを確認
3. App Serviceを再起動:
   ```bash
   az webapp restart --name <your-app-service> --resource-group <your-resource-group>
   ```

#### ケース3: BLOB接続エラー

**症状:** 画像のアップロードや保存ができない

**確認方法:**
```bash
# BLOB診断エンドポイントで確認
curl https://<your-app-service>.azurewebsites.net/api/_diag/blob-test | jq
```

**解決方法:**
1. BLOBストレージの接続文字列を確認:
   ```bash
   az storage account show-connection-string \
     --name <your-storage-account> \
     --resource-group <your-resource-group>
   ```
2. App Serviceの環境変数に設定:
   ```bash
   az webapp config appsettings set \
     --name <your-app-service> \
     --resource-group <your-resource-group> \
     --settings AZURE_STORAGE_CONNECTION_STRING="<connection-string>"
   ```
3. App Serviceを再起動

#### ケース4: キャッシュが残っている

**症状:** 修正したはずのコードが反映されない

**解決方法:**

1. **ブラウザキャッシュのクリア:**
   - Chrome: Ctrl+Shift+Delete → すべてのキャッシュをクリア
   - ハードリフレッシュ: Ctrl+F5

2. **CDNキャッシュのクリア:**
   ```bash
   az cdn endpoint purge \
     --profile-name <your-cdn-profile> \
     --name <your-endpoint> \
     --resource-group <your-resource-group> \
     --content-paths "/*"
   ```

3. **App Serviceのアプリケーションキャッシュクリア:**
   ```bash
   # App Serviceを再起動
   az webapp restart --name <your-app-service> --resource-group <your-resource-group>
   
   # または、Kuduコンソールから手動でクリア
   # https://<your-app-service>.scm.azurewebsites.net/DebugConsole
   ```

## 検証チェックリスト

デプロイ後、以下の項目を確認してください:

- [ ] ブラウザでStatic Web Appにアクセスできる
- [ ] ログイン画面が表示される
- [ ] ログインが成功する
- [ ] 応急復旧データ管理画面でフロー一覧が表示される
- [ ] フローの詳細表示で画像が表示される
- [ ] フローの編集ができる
- [ ] 画像のアップロードができる
- [ ] 保存後に画像が正しく表示される
- [ ] ブラウザコンソールにエラーが表示されない
- [ ] App Serviceのログにエラーが表示されない

## 今後の改善

1. **環境変数の一元管理:** Azure Key Vaultを使用して機密情報を管理
2. **デプロイの自動化:** GitHub Actionsで完全自動化
3. **モニタリング:** Application Insightsで監視を強化
4. **エラーハンドリング:** より詳細なエラーメッセージとログ

## 参考資料

- [Azure Static Web Apps公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/static-web-apps/)
- [Azure App Service CORS設定](https://learn.microsoft.com/ja-jp/azure/app-service/app-service-web-tutorial-rest-api)
- [Azure Blob Storage公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/storage/blobs/)

---

**作成日:** 2025-12-02  
**最終更新:** 2025-12-02  
**バージョン:** 1.0.0
