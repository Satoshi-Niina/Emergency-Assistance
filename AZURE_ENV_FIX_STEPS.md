# Azure App Service 環境変数修正手順

## 🚨 **現在の問題**
1. データベース接続: タイムアウトエラー
2. OpenAI API: APIキーが設定されていない

## 🔧 **Azure Portal での修正手順**

### **ステップ1: Azure Portal にアクセス**
1. https://portal.azure.com にログイン
2. **App Service** `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. **設定** → **アプリケーション設定** をクリック

### **ステップ2: 環境変数の追加・修正**

#### **A. セーフモード設定（一時的）**
```
SAFE_MODE = true
BYPASS_DB_FOR_LOGIN = true
```

#### **B. データベース接続の調整**
```
PG_SSL = disable
DB_CONNECTION_TIMEOUT = 60000
DB_QUERY_TIMEOUT = 60000
```

#### **C. OpenAI API設定**
```
OPENAI_API_KEY = sk-your-actual-openai-api-key-here
OPENAI_DEBUG = true
```

#### **D. デバッグ設定**
```
DEBUG = true
LOG_LEVEL = debug
```

### **ステップ3: 既存の環境変数の確認**

以下の環境変数が正しく設定されているか確認：

```
NODE_ENV = production
PORT = 8080
JWT_SECRET = your-production-jwt-secret-32-characters-minimum
SESSION_SECRET = your-production-session-secret-32-characters-minimum
FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
TRUST_PROXY = 1
```

### **ステップ4: DATABASE_URL の修正**

#### **A. SSL無効でテスト**
```
DATABASE_URL = postgresql://username:password@host:port/database?sslmode=disable
```

#### **B. 動作確認後、SSL有効に変更**
```
DATABASE_URL = postgresql://username:password@host:port/database?sslmode=require
PG_SSL = require
```

## 🔄 **修正手順**

1. **環境変数を設定**
2. **保存** をクリック
3. **概要** ページで **再起動** をクリック
4. 再起動完了まで待機（約2-3分）
5. **動作確認** を実行

## ✅ **動作確認方法**

### **基本ヘルスチェック**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
```

### **環境情報確認**
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/_diag/env
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

```
NODE_ENV = production
PORT = 8080
SAFE_MODE = true
BYPASS_DB_FOR_LOGIN = true
```

## 📋 **チェックリスト**

- [ ] SAFE_MODE = true を設定
- [ ] BYPASS_DB_FOR_LOGIN = true を設定
- [ ] PG_SSL = disable を設定
- [ ] OPENAI_API_KEY を設定
- [ ] DEBUG = true を設定
- [ ] 環境変数を保存
- [ ] App Service を再起動
- [ ] 動作確認を実行

## 🔍 **ログの確認方法**

1. **Azure Portal** → **App Service** → **監視** → **ログストリーム**
2. エラーメッセージを確認
3. データベース接続ログを確認
4. マイグレーション実行ログを確認
