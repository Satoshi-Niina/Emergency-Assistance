# Azure App Service 環境変数修正手順

## 🚨 **現在の問題**
1. データベース接続: タイムアウトエラー
2. OpenAI API: APIキーが設定されていない

## 🔧 **段階的修正手順**

### **ステップ1: セーフモードで起動**

Azure Portal → App Service → 設定 → アプリケーション設定で以下を追加：

```bash
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true
```

### **ステップ2: データベース接続の調整**

#### **A. SSL設定を一時的に無効化**
```bash
PG_SSL=disable
```

#### **B. 接続タイムアウトを延長**
```bash
DB_CONNECTION_TIMEOUT=60000
DB_QUERY_TIMEOUT=60000
```

### **ステップ3: OpenAI API設定**

#### **A. APIキーを設定**
```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

#### **B. デバッグ用設定**
```bash
OPENAI_DEBUG=true
```

### **ステップ4: データベース接続の段階的有効化**

#### **A. 接続文字列の確認**
```bash
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=disable
```

#### **B. 段階的にSSLを有効化**
```bash
# まず disable でテスト
PG_SSL=disable

# 動作確認後、prefer に変更
PG_SSL=prefer

# 最終的に require に設定
PG_SSL=require
```

## 📋 **修正後の環境変数一覧**

```bash
# 基本設定
NODE_ENV=production
PORT=8080

# セーフモード（一時的）
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true

# データベース設定（段階的）
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=disable
PG_SSL=disable
DB_CONNECTION_TIMEOUT=60000
DB_QUERY_TIMEOUT=60000

# OpenAI API設定
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_DEBUG=true

# 認証設定
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum

# フロントエンド設定
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

## 🔄 **修正手順**

1. **Azure Portal** で上記の環境変数を設定
2. **保存** をクリック
3. **再起動** を実行
4. **動作確認** を実行
5. 問題が解決したら段階的に設定を調整

## ✅ **動作確認方法**

### **基本ヘルスチェック**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
```

### **データベース接続確認**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/db-check
```

### **OpenAI API確認**
```bash
curl -X POST https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/gpt-check
```

## 🚨 **緊急時の対応**

問題が解決しない場合は、以下の最小限の設定で起動：

```bash
NODE_ENV=production
PORT=8080
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true
# 他の環境変数は一時的に削除
```
