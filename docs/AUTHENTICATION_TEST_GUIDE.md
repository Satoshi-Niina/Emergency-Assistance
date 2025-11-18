# =====================================================
# 認証機能テスト手順書
# =====================================================

## 前提条件

- ローカル環境: Node.js 20+ インストール済み
- 本番環境: Azure App Service デプロイ済み
- psql クライアントインストール済み（DB直接確認用）

---

## 📋 **Phase 1: 本番DBのシード実行**

### 1-1. DATABASE_URLを取得

```powershell
$DATABASE_URL = az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='DATABASE_URL'].value" `
  --output tsv

Write-Host "DATABASE_URL: $DATABASE_URL"
```

### 1-2. シードスクリプトを実行

```powershell
# psqlコマンドで実行
psql $DATABASE_URL -f scripts/seed-admin-user.sql
```

**期待される出力:**
```
シード完了 | 2 | 1 | 1
id | username | display_name | role | ...
1  | admin    | 管理者       | admin | ...
```

### 1-3. ユーザーが作成されたか確認

```powershell
psql $DATABASE_URL -c "SELECT id, username, role FROM users WHERE username='admin';"
```

**期待される出力:**
```
 id | username | role
----+----------+-------
  1 | admin    | admin
```

---

## 📋 **Phase 2: ローカル環境でのテスト**

### 2-1. ローカルサーバー起動

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

**期待される出力:**
```
✅ SQLite database initialized successfully
✅ Default admin user created (username: admin, password: admin)
🚀 Emergency Assistance Server Started
🔌 Port: 8080
```

### 2-2. ログインAPIテスト（ローカル）

```powershell
# PowerShell
$body = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response | ConvertTo-Json
```

**期待される出力:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "displayName": "管理者",
    "department": "システム管理"
  },
  "message": "ログインに成功しました"
}
```

### 2-3. セッション確認（ローカル）

```powershell
# 同じセッションでユーザー情報取得
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginResponse = Invoke-WebRequest `
    -Uri "http://localhost:8080/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -WebSession $session

# セッション情報を使って/api/auth/meを呼び出し
$meResponse = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/auth/me" `
    -Method GET `
    -WebSession $session

$meResponse | ConvertTo-Json
```

**期待される出力:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    ...
  }
}
```

---

## 📋 **Phase 3: 本番環境でのテスト**

### 3-1. 本番環境のログを有効化

```powershell
az webapp log config `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --docker-container-logging filesystem `
  --level verbose
```

### 3-2. ログストリームを開始（別ターミナル）

```powershell
az webapp log tail `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app
```

### 3-3. ログインAPIテスト（本番）

```powershell
$body = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Origin" = "https://witty-river-012f39e00.1.azurestaticapps.net"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host "✅ ログイン成功!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ ログイン失敗" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"

    # エラー詳細を取得
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error Body: $errorBody"
}
```

**期待される出力（成功時）:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "displayName": "管理者",
    "department": "システム管理"
  },
  "message": "ログインに成功しました"
}
```

**期待されるログ（ログストリーム）:**
```
🔐 Login request from origin: https://witty-river-012f39e00.1.azurestaticapps.net
[auth/login] Login attempt: { username: 'admin', ... }
[auth/login] ユーザー検索結果: { found: true, userCount: 1 }
[auth/login] パスワード比較開始
[auth/login] パスワード比較結果: { isValid: true }
[auth/login] Login successful: { username: 'admin', role: 'admin' }
```

### 3-4. CORS確認（本番）

```powershell
$corsHeaders = @{
    "Origin" = "https://witty-river-012f39e00.1.azurestaticapps.net"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "Content-Type"
}

$corsResponse = Invoke-WebRequest `
    -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" `
    -Method OPTIONS `
    -Headers $corsHeaders `
    -UseBasicParsing

Write-Host "CORS Status: $($corsResponse.StatusCode)"
$corsResponse.Headers.GetEnumerator() | Where-Object { $_.Key -like "Access-Control-*" } | Format-Table
```

**期待される出力:**
```
CORS Status: 200
Key                              Value
---                              -----
Access-Control-Allow-Origin      https://witty-river-012f39e00.1.azurestaticapps.net
Access-Control-Allow-Credentials true
Access-Control-Allow-Methods     GET, POST, PUT, DELETE, OPTIONS, PATCH
```

---

## 📋 **Phase 4: フロントエンドからのテスト**

### 4-1. ブラウザで Azure Static Web Apps を開く

```
https://witty-river-012f39e00.1.azurestaticapps.net
```

### 4-2. ログイン画面で認証情報を入力

- ユーザー名: `admin`
- パスワード: `admin`

### 4-3. ブラウザの開発者ツールでネットワークタブを確認

**期待される動作:**
1. `POST /api/auth/login` リクエストが送信される
2. ステータス: `200 OK`
3. レスポンス: `{"success": true, "user": {...}}`
4. `Set-Cookie` ヘッダーにセッションIDが含まれる
5. ログイン後、ダッシュボードにリダイレクト

### 4-4. エラーが発生した場合

ブラウザのコンソールで以下を実行:

```javascript
fetch('https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin'
  }),
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 🔍 **トラブルシューティング**

### エラー: USER_NOT_FOUND (401)

**原因:** データベースにユーザーが存在しない

**解決方法:**
```powershell
# シードスクリプトを再実行
psql $DATABASE_URL -f scripts/seed-admin-user.sql
```

### エラー: INVALID_PASSWORD (401)

**原因:** パスワードが一致しない

**解決方法:**
1. 正しいパスワードを確認: `admin`
2. パスワードハッシュを再生成:
```bash
node scripts/generate-password-hash.js admin
```
3. 生成されたハッシュで SQLを更新

### エラー: database_unavailable (500)

**原因:** DATABASE_URLが設定されていないか、接続失敗

**解決方法:**
```powershell
# 環境変数を確認
az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='DATABASE_URL'].{Name:name, ValueSet:value != null}"
```

### エラー: CORS policy blocks request

**原因:** CORS設定が正しくない

**解決方法:**
```powershell
# CORS_ALLOW_ORIGINS を確認
az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='CORS_ALLOW_ORIGINS'].{Name:name, Value:value}"

# 正しく設定
az webapp config appsettings set `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --settings CORS_ALLOW_ORIGINS="https://witty-river-012f39e00.1.azurestaticapps.net,http://localhost:5173"
```

---

## ✅ **完了確認チェックリスト**

- [ ] Phase 1: 本番DBにadminユーザーが作成されている
- [ ] Phase 2: ローカルで admin/admin でログイン成功
- [ ] Phase 3-3: 本番APIで admin/admin でログイン成功（200 OK）
- [ ] Phase 3-4: CORS preflightが成功（200 OK）
- [ ] Phase 4-2: フロントエンドからログイン成功
- [ ] Phase 4-3: セッションが正しく保持されている

すべてチェックが入れば、認証機能は正常に動作しています！🎉
