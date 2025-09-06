# Azure環境疎通確認ドキュメント

## 現在のAzure環境構成

### フロントエンド（Static Web Apps）
- **名前**: `Emergencyassistance-swa`  
- **URL**: `https://witty-river-012f39e00.1.azurestaticapps.net`
- **場所**: East Asia
- **状態**: ✅ 正常稼働中

### バックエンド（App Service）
- **名前**: `Emergencyassistance-sv`
- **URL**: `https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net`
- **場所**: Japan West
- **状態**: ❌ 503エラー発生中

### PostgreSQL（Flexible Server）
- **名前**: `emergencyassistance-db`
- **FQDN**: `emergencyassistance-db.postgres.database.azure.com`
- **データベース**: `webappdb`
- **状態**: ✅ 正常稼働中（データ存在確認済み）

## 疎通確認手順

### 1. フロントエンド → バックエンドの確認

#### ブラウザ DevTools での確認
```javascript
// ブラウザのコンソールで実行
fetch('https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health', {
  credentials: 'include'
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
```

#### curl での確認
```bash
# ヘルスチェックエンドポイント
curl -v https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health

# 期待されるレスポンス
# HTTP/1.1 200 OK
# Content-Type: application/json
# {
#   "status": "ok",
#   "timestamp": "2025-09-06T...",
#   "service": "emergency-assistance-backend"
# }
```

### 2. バックエンド → PostgreSQLの確認

#### dbCheck 関数によるログ出力
バックエンドの起動時に以下のログが出力されることを確認：

```
✅ データベース接続成功: PostgreSQL接続が正常に動作しています
```

または

```
❌ データベース接続エラー: [エラーメッセージ]
```

#### 直接SQLクエリでの確認
```bash
# Azure CLIでPostgreSQLに接続
az postgres flexible-server connect --name emergencyassistance-db --admin-user satoshi_niina --database-name webappdb

# 接続後にクエリ実行
SELECT 1 as test;
```

### 3. 各エンドポイントの期待レスポンス

#### バックエンドヘルスチェック
**エンドポイント**: `GET /api/health`
```json
{
  "status": "ok",
  "timestamp": "2025-09-06T06:50:21.700Z",
  "service": "emergency-assistance-backend"
}
```

**エンドポイント**: `GET /healthz`
```
ok
```

#### 認証エンドポイント
**エンドポイント**: `POST /api/auth/login`
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "...",
    "role": "..."
  }
}
```

#### データベース接続確認
**エンドポイント**: `GET /api/db-check`
```json
{
  "status": "OK",
  "db_time": "2025-09-06T06:50:21.700Z"
}
```

## 現在の問題と対処方法

### 503エラーの解決

1. **App Serviceの再起動**
   ```bash
   az webapp restart --name Emergencyassistance-sv --resource-group rg-Emergencyassistant-app
   ```

2. **アプリケーション設定の確認**
   - `NODE_ENV=production`
   - `PORT=8080` または環境変数 `process.env.PORT` を使用
   - `DATABASE_URL` が正しく設定されていること

3. **CORSの設定確認**
   - フロントエンドのURL: `https://witty-river-012f39e00.1.azurestaticapps.net`
   - `credentials: 'include'` の設定

4. **デプロイメントの確認**
   - 最新のコードがデプロイされていること
   - GitHub Actionsのワークフローが成功していること

### PostgreSQL接続の確認

データベース接続文字列の確認：
```
postgresql://satoshi_niina:[password]@emergencyassistance-db.postgres.database.azure.com:5432/webappdb?sslmode=require
```

### 環境変数の設定

**バックエンド（App Service）で必要な環境変数**:
- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_URL=postgresql://...`
- `CORS_ORIGIN=https://witty-river-012f39e00.1.azurestaticapps.net`
- `FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net`

**フロントエンド（Static Web Apps）で必要な環境変数**:
- `VITE_API_BASE_URL=https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net`

## トラブルシューティング

### ログの確認方法

1. **App Serviceのログ**
   ```bash
   az webapp log download --name Emergencyassistance-sv --resource-group rg-Emergencyassistant-app
   ```

2. **Static Web Appsのログ**
   GitHub Actionsのワークフロー実行履歴を確認

3. **PostgreSQLのログ**
   Azure Portal → PostgreSQL Flexible Server → 監視 → ログ

### よくあるエラーと解決方法

1. **CORS エラー**
   - App ServiceのCORS設定を確認
   - `credentials: 'include'` が設定されていることを確認

2. **認証エラー**
   - セッション設定の確認
   - Cookie設定の確認（`secure: true`, `sameSite: 'none'`）

3. **データベース接続エラー**
   - PostgreSQL Flexible Serverのファイアウォール設定
   - 接続文字列の確認
   - SSL設定の確認

## 修正が必要なファイル

### バックエンド修正
1. `server/index.ts` または `server/app.ts`
   - `process.env.PORT || 8080` での listen
   - `0.0.0.0` での bind
   - `/healthz` エンドポイントの追加
   - `dbCheck` 関数の実装と起動時実行

### フロントエンド修正  
1. `.env.production`
   - `VITE_API_BASE_URL` の設定
   
2. API呼び出し箇所
   - `credentials: 'include'` の設定

### Static Web Apps設定
1. `staticwebapp.config.json`
   - navigationFallback の設定
   - responseOverrides の設定

最終更新: 2025年9月6日
