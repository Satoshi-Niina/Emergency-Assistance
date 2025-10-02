# Azure PostgreSQL 接続問題の緊急対応手順

## 🚨 **現在の問題**
- データベース接続タイムアウト: `Connection terminated due to connection timeout`
- 接続の予期しない終了: `Connection terminated unexpectedly`

## 🔧 **緊急対応手順**

### **ステップ1: セーフモードで起動**

Azure Portal → App Service → 設定 → アプリケーション設定で以下を設定：

```bash
# セーフモード設定
SAFE_MODE = true
BYPASS_DB_FOR_LOGIN = true

# データベース接続を一時的に無効化
# DATABASE_URL を削除またはコメントアウト
```

### **ステップ2: Azure PostgreSQL のファイアウォール設定**

1. **Azure Portal** → **PostgreSQL サーバー**
2. **接続セキュリティ**
3. 以下の設定を確認・修正：

```
✅ Allow access to Azure services: ON
✅ Add current client IP address: ON

# または一時的に全IPを許可
✅ Add IP address range: 0.0.0.0 - 255.255.255.255
```

### **ステップ3: 接続文字列の確認**

```bash
# 正しい接続文字列の形式
DATABASE_URL = postgresql://username:password@hostname:5432/database?sslmode=disable

# 例
DATABASE_URL = postgresql://myuser:mypassword@myserver.postgres.database.azure.com:5432/mydatabase?sslmode=disable
```

### **ステップ4: 接続タイムアウトの調整**

```bash
DB_CONNECTION_TIMEOUT = 120000
DB_QUERY_TIMEOUT = 120000
DB_IDLE_TIMEOUT = 60000
```

## 🔄 **段階的復旧手順**

### **フェーズ1: セーフモードで基本機能確認**
```bash
SAFE_MODE = true
BYPASS_DB_FOR_LOGIN = true
# DATABASE_URL を無効化
```

### **フェーズ2: データベース接続テスト**
```bash
SAFE_MODE = false
BYPASS_DB_FOR_LOGIN = true
DATABASE_URL = postgresql://username:password@hostname:5432/database?sslmode=disable
PG_SSL = disable
```

### **フェーズ3: 完全復旧**
```bash
SAFE_MODE = false
BYPASS_DB_FOR_LOGIN = false
DATABASE_URL = postgresql://username:password@hostname:5432/database?sslmode=require
PG_SSL = require
```

## ✅ **動作確認方法**

### **セーフモードでの確認**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/handshake
```

### **データベース接続の確認**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/db-check
```

## 🚨 **緊急時の対応**

問題が解決しない場合は、以下の最小限の設定で起動：

```bash
NODE_ENV = production
PORT = 8080
SAFE_MODE = true
BYPASS_DB_FOR_LOGIN = true
JWT_SECRET = your-production-jwt-secret-32-characters-minimum
SESSION_SECRET = your-production-session-secret-32-characters-minimum
FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
TRUST_PROXY = 1
OPENAI_API_KEY = sk-proj-TP8fCh3xQCaUgXaCKuq_h8ckh8VAhfuDi-0LnU8HNAW5G9QgjIf5HRaDAoH9XryCQ7wxBvhE...
```

## 📋 **チェックリスト**

- [ ] Azure PostgreSQL のファイアウォール設定を確認
- [ ] 接続文字列の形式を確認
- [ ] セーフモードで基本機能をテスト
- [ ] データベース接続を段階的に有効化
- [ ] ログストリームでエラーを監視
