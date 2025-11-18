# デプロイ後ログイン不可の問題診断

## 📋 現状確認

### 1. 発生している問題
- **CORSエラー**: `No 'Access-Control-Allow-Origin' header is present`
- **サーバーステータス**: App Serviceは`Running`だが503エラー
- **エラータイプ**: `Failed to fetch` (ネットワークエラー)

### 2. 確認済みの情報

#### ✅ デプロイされているコード
- **コミットハッシュ**: `7bacc89e` (最新のCORS修正を含む)
- **Dockerイメージ**: `emergencyassistance.azurecr.io/emergency-assistance:7bacc89e...`
- **確認方法**: `az webapp config show --query "linuxFxVersion"`

#### ✅ 環境変数
```
CORS_ALLOW_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net,https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
FRONTEND_ORIGIN=https://witty-river-012f39e00.1.azurestaticapps.net
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

#### ❌ サーバーの動作状態
- **App Service状態**: Running
- **実際のレスポンス**: 503 Service Unavailable
- **ヘルスチェック**: 失敗

## 🔍 問題の原因

### 主な原因: **Dockerコンテナが起動に失敗している**

CORSエラーが表示されていますが、実際の問題は**サーバーが起動していない**ことです:

1. **503エラー** = Azure App Serviceはコンテナに接続できない
2. **CORS修正は既にデプロイ済み** = コードの問題ではない
3. **再起動後も503** = コンテナの起動プロセスに問題がある

### 考えられる原因

1. **環境変数の不足**
   - `DATABASE_URL`が設定されていない可能性
   - その他の必須環境変数が不足

2. **Dockerfileの問題**
   - 起動コマンドが正しくない
   - 必要なファイルがコピーされていない

3. **ポート設定の不一致**
   - `WEBSITES_PORT=8080`
   - `PORT=8080`
   - 実際のアプリケーションが別のポートで起動している

4. **データベース接続エラー**
   - PostgreSQLへの接続が失敗してアプリケーションが起動できない

## 🔧 診断手順

### ステップ1: App Serviceのログを確認

```powershell
# ログストリームを確認（リアルタイム）
az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

エラーログから以下を確認:
- ✅ Dockerコンテナが起動しているか
- ✅ Node.jsアプリケーションがエラーを出していないか
- ✅ データベース接続エラーがないか
- ✅ ポート設定が正しいか

### ステップ2: コンテナのログを直接確認

```powershell
# Azure Portalで確認
# 1. App Service > ログストリーム
# 2. コンテナログを確認
```

### ステップ3: 環境変数の完全確認

```powershell
# すべての環境変数を確認
az webapp config appsettings list --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --output table
```

確認すべき必須環境変数:
- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_URL` (PostgreSQL接続文字列)
- `SESSION_SECRET`
- `JWT_SECRET`
- `FRONTEND_URL`
- `STATIC_WEB_APP_URL`
- `CORS_ALLOW_ORIGINS`

### ステップ4: 手動でDockerイメージをテスト

ローカルでDockerイメージをテストして問題を特定:

```powershell
# イメージをプル
docker pull emergencyassistance.azurecr.io/emergency-assistance:7bacc89e3fe96036fad85cfb6557bfee5b37b0b3

# ローカルで実行してログを確認
docker run -p 8080:8080 `
  -e NODE_ENV=production `
  -e PORT=8080 `
  -e DATABASE_URL="postgresql://..." `
  emergencyassistance.azurecr.io/emergency-assistance:7bacc89e3fe96036fad85cfb6557bfee5b37b0b3
```

## 🚀 修正アクション

### アクション1: ログを確認して根本原因を特定

```powershell
# ログストリームを開始（別のウィンドウで）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app"

# または、ブラウザでAzure Portalにアクセス
# https://portal.azure.com → App Service → ログストリーム
```

### アクション2: 必須環境変数を再設定

```powershell
az webapp config appsettings set `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --settings `
    NODE_ENV=production `
    PORT=8080 `
    WEBSITES_PORT=8080 `
    DATABASE_URL="<PostgreSQL接続文字列>" `
    SESSION_SECRET="<セッションシークレット>" `
    JWT_SECRET="<JWTシークレット>" `
    FRONTEND_URL="https://witty-river-012f39e00.1.azurestaticapps.net" `
    STATIC_WEB_APP_URL="https://witty-river-012f39e00.1.azurestaticapps.net" `
    CORS_ALLOW_ORIGINS="https://witty-river-012f39e00.1.azurestaticapps.net"

# App Serviceを再起動
az webapp restart --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

### アクション3: Dockerfileの起動コマンドを確認

現在のDockerfile最終行:
```dockerfile
CMD ["node", "server/azure-server.mjs"]
```

確認事項:
- ✅ `server/azure-server.mjs`ファイルが存在するか
- ✅ ファイルパスが正しいか
- ✅ Node.jsがESモジュールを正しく処理できるか

代替案（もし失敗する場合）:
```dockerfile
CMD ["node", "--experimental-modules", "server/azure-server.mjs"]
```

または、app.jsを経由する:
```dockerfile
CMD ["node", "server/app.js"]
```

### アクション4: DATABASE_URLの確認

データベース接続が問題の場合:

```powershell
# DATABASE_URLを確認
az webapp config appsettings list --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --query "[?name=='DATABASE_URL'].value" --output tsv

# もしDATABASE_URLが設定されていない場合は設定
az webapp config appsettings set `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --settings DATABASE_URL="<正しい接続文字列>"
```

## 📊 次のステップ

### 優先度高

1. **ログを確認** → 根本原因を特定
2. **環境変数を確認** → DATABASE_URLなど必須項目が設定されているか
3. **コンテナを再起動** → 最新の設定を反映

### ログ確認後に実施

ログから判明した問題に応じて対応:
- **データベース接続エラー** → DATABASE_URLを修正
- **ポートエラー** → PORT設定を確認
- **モジュールエラー** → Dockerfileの起動コマンドを修正
- **環境変数エラー** → 不足している変数を追加

## 📝 メモ

- CORSの修正は正しく実装されている
- 問題はCORSではなく、**サーバーが起動していないこと**
- 503エラーはコンテナの起動失敗を示している
- ログを確認することが最優先

---

**作成日**: 2025-11-17
**ステータス**: 診断中
