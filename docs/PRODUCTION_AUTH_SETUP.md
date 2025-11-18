# =====================================================
# Azure App Service - 認証関連環境変数チェックリスト
# =====================================================

## 必須の環境変数

### 1. データベース接続
```
DATABASE_URL=<PostgreSQL接続文字列>
PG_SSL=require
```

### 2. セッション管理
```
SESSION_SECRET=<ランダムな長い文字列（32文字以上推奨）>
```
**生成方法:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. CORS設定
```
CORS_ALLOW_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net,http://localhost:5173
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
STATIC_WEB_APP_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### 4. ノード環境
```
NODE_ENV=production
PORT=8080
WEBSITES_PORT=8080
```

### 5. Azure Storage（オプション）
```
AZURE_STORAGE_CONNECTION_STRING=<Azure Blob Storage接続文字列>
AZURE_STORAGE_CONTAINER_NAME=knowledge
```

### 6. OpenAI API（オプション）
```
OPENAI_API_KEY=<OpenAI APIキー>
```

### 7. その他
```
STORAGE_MODE=hybrid
LOCAL_EXPORT_DIR=/app/knowledge-base/exports
FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
WEBSITES_CONTAINER_START_TIME_LIMIT=600
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

---

## 現在の設定確認コマンド

### Azure CLIで確認
```powershell
az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[].{Name:name, Value:value}" `
  --output table
```

### 特定の環境変数のみ確認
```powershell
az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='SESSION_SECRET' || name=='DATABASE_URL' || name=='CORS_ALLOW_ORIGINS'].{Name:name, ValueSet:value != null}" `
  --output table
```

---

## SESSION_SECRET の設定方法

### 1. ランダムな秘密鍵を生成
```powershell
# PowerShell
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "生成されたSESSION_SECRET: $secret"
```

または

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Azure App Serviceに設定
```powershell
az webapp config appsettings set `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --settings SESSION_SECRET="<生成した秘密鍵>"
```

---

## 認証に関する重要な注意事項

### 🔴 **現在の問題**
- 本番DBに管理者ユーザーが存在しない
- ローカルとのパスワードハッシュが不一致

### ✅ **解決方法**
1. `scripts/seed-admin-user.sql` を実行してユーザーを作成
2. または GitHub Actions ワークフローで自動シード実行

---

## 本番DBへのシード実行方法

### 方法1: Azure Cloud Shellで実行
```bash
# DATABASE_URLを取得
DATABASE_URL=$(az webapp config appsettings list \
  --name Emergency-Assistance \
  --resource-group rg-Emergencyassistant-app \
  --query "[?name=='DATABASE_URL'].value" \
  --output tsv)

# シードスクリプトを実行
psql "$DATABASE_URL" -f scripts/seed-admin-user.sql
```

### 方法2: ローカルから実行
```powershell
# DATABASE_URLを取得
$DATABASE_URL = az webapp config appsettings list `
  --name Emergency-Assistance `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='DATABASE_URL'].value" `
  --output tsv

# psqlがインストールされている場合
psql $DATABASE_URL -f scripts/seed-admin-user.sql
```

### 方法3: GitHub Actionsで自動実行（推奨）
ワークフローに以下のステップを追加:
```yaml
- name: Run Database Migrations and Seeds
  run: |
    # PostgreSQL クライアントをインストール
    sudo apt-get update
    sudo apt-get install -y postgresql-client

    # シードスクリプトを実行
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/seed-admin-user.sql
```

---

## デバッグ用エンドポイント

### 1. データベース接続確認
```
GET https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health/full
```

### 2. セッション確認
```
GET https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/handshake
```

### 3. ログイン試行（デバッグログ付き）
```
POST https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

ログは Azure Portal → App Service → Log stream で確認できます。
