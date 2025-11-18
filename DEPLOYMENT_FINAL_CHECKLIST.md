# 🚀 デプロイ前最終確認ガイド

このガイドに従って、デプロイ前の最終確認を行ってください。

## ✅ ステップ1: ローカルでの動作確認

### 1.1 環境変数の検証

```powershell
# 環境変数検証スクリプトを実行
node scripts/validate-env.js
```

エラーがある場合は、環境変数を修正してから次に進んでください。

### 1.2 Dockerでの本番環境シミュレーション

```powershell
# Dockerで本番環境をシミュレート
.\start-docker.ps1
# メニューで「1」を選択（本番環境シミュレーション）
```

### 1.3 動作確認項目

ブラウザで `http://localhost:8080` を開き、以下を確認:

- [ ] ログインページが表示される
- [ ] ログインできる（ユーザー名: admin, パスワード: admin）
- [ ] ダッシュボードが表示される
- [ ] APIリクエストが成功する（開発者ツールのネットワークタブで確認）
- [ ] CORSエラーが発生しない
- [ ] 画像が正しく表示される

### 1.4 コンソールログの確認

ブラウザの開発者ツール（F12）を開き、コンソールタブで以下を確認:

```
🔧 API URL (relative): /auth/login -> /api/auth/login
✅ API Response: POST /api/auth/login
```

エラーやCORS警告がないことを確認してください。

## ✅ ステップ2: Azure環境変数の設定確認

### 2.1 Azure Portal で確認

1. [Azure Portal](https://portal.azure.com) にログイン
2. **App Service** → `Emergency-Assistance` を選択
3. 左メニュー → **環境変数** → **アプリケーション設定** タブ

以下の環境変数が設定されているか確認:

```
✅ FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
✅ STATIC_WEB_APP_URL = https://witty-river-012f39e00.1.azurestaticapps.net
✅ CORS_ALLOW_ORIGINS = (フロントエンドURL含む)
✅ NODE_ENV = production
✅ PORT = 8080
✅ WEBSITES_PORT = 8080
✅ SESSION_SECRET = (32文字以上)
✅ JWT_SECRET = (32文字以上)
✅ DATABASE_URL = (PostgreSQL接続文字列)
```

### 2.2 Azure CLI で確認

```bash
# 環境変数を確認
az webapp config appsettings list \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --query "[?name=='FRONTEND_URL' || name=='STATIC_WEB_APP_URL' || name=='NODE_ENV'].{name:name, value:value}" \
  --output table
```

### 2.3 環境変数が未設定の場合

```bash
# 環境変数を一括設定
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

# App Service を再起動
az webapp restart \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app
```

## ✅ ステップ3: コードの変更をコミット

```powershell
# 変更をステージング
git add .

# コミット（わかりやすいメッセージで）
git commit -m "fix: APIエンドポイントパス重複とCORS設定を改善

- buildApiUrl関数を簡素化し、/api/api/のような重複を防止
- CORS設定を簡素化し、corsミドルウェアに一本化
- 環境変数検証スクリプトを追加
- デプロイ前チェックリストを整備"

# リモートにプッシュ（自動デプロイ開始）
git push origin main
```

## ✅ ステップ4: デプロイの進行状況を監視

### 4.1 GitHub Actions で確認

1. [GitHub リポジトリ](https://github.com/Satoshi-Niina/Emergency-Assistance) を開く
2. **Actions** タブをクリック
3. 最新のワークフロー実行を選択
4. 各ステップの進行状況を確認

### 4.2 デプロイ完了まで待機

- **通常**: 5-10分
- **初回**: 10-15分

デプロイが完了するまで待ちます。

## ✅ ステップ5: デプロイ後の動作確認

### 5.1 ヘルスチェック

```bash
# サーバーのヘルスチェック
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/health

# 詳細なヘルスチェック
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health/detailed
```

期待される結果:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "environment": "production",
  "version": "1.0.6-..."
}
```

### 5.2 本番環境でのログイン確認

1. ブラウザで以下にアクセス:
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```

2. ログイン:
   - ユーザー名: `admin`
   - パスワード: `admin`（または設定したパスワード）

3. 開発者ツール（F12）を開き、以下を確認:

**ネットワークタブ:**
- [ ] OPTIONSリクエスト（preflight）が `204 No Content` で成功
- [ ] POSTリクエスト（/api/auth/login）が `200 OK` で成功
- [ ] レスポンスヘッダーに `Access-Control-Allow-Origin` が含まれている

**コンソールタブ:**
- [ ] CORSエラーが発生していない
- [ ] APIリクエストログが正常
- [ ] `/api/api/` のような重複パスがない

### 5.3 主要機能の確認

- [ ] ダッシュボードが表示される
- [ ] チャット機能が動作する
- [ ] 履歴が表示される
- [ ] 画像がアップロードできる
- [ ] 画像が正しく表示される

### 5.4 ログの確認

```bash
# リアルタイムログを表示
az webapp log tail \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app
```

以下のログが表示されることを確認:
```
✅ CORS Allowed Origins: [...]
✅ CORS middleware initialized
🔗 Frontend URL: https://witty-river-012f39e00.1.azurestaticapps.net
🌐 Static Web App URL: https://witty-river-012f39e00.1.azurestaticapps.net
```

## 🆘 トラブルシューティング

### CORSエラーが発生する場合

1. **環境変数を再確認:**
   ```bash
   az webapp config appsettings list \
     --name Emergency-Assistance \
     --resource-group rg-Emergencyassistant-app \
     --query "[?name=='FRONTEND_URL' || name=='STATIC_WEB_APP_URL'].{name:name, value:value}" \
     --output table
   ```

2. **App Service を再起動:**
   ```bash
   az webapp restart \
     --name Emergency-Assistance \
     --resource-group rg-Emergencyassistant-app
   ```

3. **Azure Portal でCORS設定を確認:**
   - App Service → CORS
   - `https://witty-river-012f39e00.1.azurestaticapps.net` が追加されているか
   - 「資格情報を許可する」がONになっているか

### APIエンドポイントが404になる場合

1. **URLパスを確認:**
   ブラウザの開発者ツールでリクエストURLを確認
   - `/api/api/auth/login` のような重複がないか確認

2. **サーバーログを確認:**
   ```bash
   az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

3. **再デプロイ:**
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin main
   ```

### 環境変数が反映されない場合

1. **App Service を再起動:**
   ```bash
   az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
   ```

2. **デプロイログを確認:**
   GitHub Actions のログで環境変数が正しくデプロイされているか確認

## 📊 最終チェックリスト

デプロイ完了後、以下を確認してください:

### ローカル環境
- [ ] Docker本番シミュレーションで動作確認済み
- [ ] CORSエラーなし
- [ ] APIエンドポイントパス重複なし

### Azure環境変数
- [ ] FRONTEND_URL が設定されている
- [ ] STATIC_WEB_APP_URL が設定されている
- [ ] CORS_ALLOW_ORIGINS が正しく設定されている
- [ ] NODE_ENV=production
- [ ] PORT=8080, WEBSITES_PORT=8080

### デプロイ
- [ ] GitHub Actions でデプロイ成功
- [ ] ヘルスチェックが成功
- [ ] サーバーログにエラーなし

### 本番環境動作確認
- [ ] ログインが成功する
- [ ] CORSエラーが発生しない
- [ ] APIリクエストが成功する
- [ ] 画像が正しく表示される
- [ ] 主要機能がすべて動作する

## 🎉 デプロイ完了！

すべてのチェックが完了したら、デプロイ成功です！

本番環境URL:
- フロントエンド: https://witty-river-012f39e00.1.azurestaticapps.net
- バックエンド: https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net

---

**作成日:** 2025年11月18日
**対象システム:** Emergency Assistance System
