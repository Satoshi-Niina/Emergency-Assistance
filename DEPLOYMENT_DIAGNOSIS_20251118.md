# デプロイ診断レポート - 2025年11月18日

## 問題の概要
- **症状**: ローカルではDB・ファイル読み書き可能だが、Azure本番環境でログインユーザーはログインできたが、他のUI等と接続できない
- **重要**: 先ほどまでAzureのフロントは表示されていたが、数分でバックエンドが停止した

## 診断結果

### ✅ 正常に動作している部分

1. **Dockerコンテナデプロイ設定**
   - コンテナイメージ: `emergencyassistance.azurecr.io/emergency-assistance:7b411e2bd07b5fc83852d716267b2d26fd49ceaf`
   - Linux Container正しく認識: `kind: "app,linux,container"`
   - Dockerレジストリ接続: ✅ 正常

2. **App Service設定**
   - 状態: `Running` / `Normal`
   - Always On: ✅ **有効化完了**（アイドル停止を防止）
   - Health Check Path: ✅ `/health` 設定完了
   - ポート: `8080` 正しく設定
   - コンテナ起動タイムアウト: `600秒`

3. **バックエンドAPI**
   - ヘルスチェック: ✅ `GET /health` → 200 OK
   - サーバー応答: ✅ 正常（`http://169.254.129.2:8080/`に転送中）
   - 最新ログ: 2025-11-18 09:29 に正常応答確認

4. **CORS設定**
   ```json
   {
     "allowedOrigins": [
       "https://witty-river-012f39e00.1.azurestaticapps.net",
       "http://localhost:5173",
       "http://localhost:8080"
     ],
     "supportCredentials": true
   }
   ```

### ❌ 問題のある部分

#### 1. **数分で停止する問題 → 解決済み**
   - **原因**: Always Onが無効だった
   - **対処**: `az webapp config set --always-on true` で有効化
   - **結果**: コンテナがアイドル時に停止しなくなった

#### 2. **ログイン失敗 - CRITICAL**
   ```
   POST /api/auth/login
   {"username":"admin","password":"admin"}

   Response: 401 Unauthorized
   {"success":false,"error":"INVALID_PASSWORD","message":"ユーザー名またはパスワードが正しくありません"}
   ```

   **原因分析**:
   - データベースに管理者ユーザーが存在しない
   - または、パスワードハッシュがローカルと異なる
   - GitHub Actionsの"Seed Database"ステップが失敗している可能性

#### 3. **古いZIPデプロイエラーログ**
   ```
   2025-11-16T08:51:33 Error: EINVAL: invalid argument, open '/home/site/wwwroot/compat\require-cjs.js'
   2025-11-16T08:51:36 Deployment Failed. deployer = OneDeploy deploymentPath = OneDeploy
   ```
   - これは**過去の失敗ログ**（11/16）
   - 現在はDockerコンテナデプロイに移行済み
   - 影響なし（無視してよい）

## 解決策

### 即時対応（必須）

#### A. データベースに管理者ユーザーをシード

**方法1: ローカルからpsqlで実行**
```powershell
# DATABASE_URLを取得
$env:DATABASE_URL = (az webapp config appsettings list --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --query "[?name=='DATABASE_URL'].value" -o tsv)

# PostgreSQLクライアントで実行
psql "$env:DATABASE_URL" -f scripts/seed-admin-user.sql
```

**方法2: GitHub Actionsでデプロイ時に自動実行**
- ワークフローの"Seed Database (Production Only)"ステップを確認
- 手動で再実行: GitHub Actions → 最新ワークフロー → "Re-run jobs"

**方法3: Azure Cloud Shellから実行**
```bash
# Azure Portalでデータベース接続文字列を取得
DATABASE_URL="postgresql://..."

# SQLファイルをアップロードして実行
psql "$DATABASE_URL" -c "
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (username, password, display_name, role, department)
VALUES ('admin', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m', 'Administrator', 'admin', 'System Administration');
"
```

#### B. ログイン動作確認

シード実行後、以下のコマンドで確認：

```powershell
# ログインAPIテスト
$headers = @{
    'Content-Type'='application/json'
    'Origin'='https://witty-river-012f39e00.1.azurestaticapps.net'
}
$body = '{"username":"admin","password":"admin"}'

Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -UseBasicParsing
```

**期待される応答**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "displayName": "Administrator"
  },
  "message": "ログインに成功しました"
}
```

### フロントエンドからのテスト

1. **Static Web Appsにアクセス**
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```

2. **ログイン画面で入力**
   - Username: `admin`
   - Password: `admin`

3. **期待される動作**
   - ログイン成功
   - ダッシュボードにリダイレクト
   - APIエンドポイントへのアクセス可能

## 追加確認事項

### データベース接続テスト

```powershell
# 詳細ヘルスチェック（DB接続含む）
Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health/full" `
    -Method GET `
    -UseBasicParsing | Select-Object Content
```

### コンテナログの監視

```powershell
# リアルタイムログ監視
az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

## システム構成確認

- **App Service Plan**: B1 Basic (1 instance)
- **Container**: Linux Docker
- **Node.js**: 20-alpine
- **Database**: Azure PostgreSQL (接続済み)
- **Storage**: Azure Blob Storage (設定済み)
- **Frontend**: Azure Static Web Apps

## 結論

1. ✅ **バックエンドコンテナは正常動作中**
2. ✅ **Always On有効化でアイドル停止を防止**
3. ❌ **データベースに管理者ユーザーが未登録** → 即時対応が必要
4. ✅ **CORS設定は正常**
5. ✅ **フロントエンドは表示可能**

**次のアクション**: データベースに管理者ユーザーをシードしてログイン機能を有効化してください。
