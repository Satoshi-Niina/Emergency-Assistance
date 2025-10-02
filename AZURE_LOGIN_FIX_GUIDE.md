# Azure App Service 環境変数修正手順（緊急対応版）

## 🚨 **現在の問題**
- ログインエンドポイントで500エラーが発生
- サーバーは起動しているが認証が失敗

## 🔧 **緊急修正手順**

### **ステップ1: Azure Portal での環境変数設定**

Azure Portal → App Service → 設定 → アプリケーション設定で以下を設定：

```bash
# 基本設定
NODE_ENV=production
PORT=8080

# データベース設定（一時的に無効化）
# DATABASE_URL=postgresql://username:password@host:port/database?sslmode=disable
PG_SSL=disable

# 認証設定
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum

# フロントエンド設定
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# セーフモード設定（一時的）
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true

# Azure Storage設定（オプション）
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=knowledge
```

### **ステップ2: スタートアップコマンドの変更**

Azure Portal → App Service → 設定 → 一般設定 → スタートアップコマンド：

```bash
node azure-server.js
```

### **ステップ3: アプリケーションの再起動**

1. Azure Portal → App Service → 概要 → 再起動
2. 再起動完了まで待機（約2-3分）

## ✅ **動作確認方法**

### **1. ヘルスチェック**
```bash
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
```

### **2. ログイン確認**
```bash
POST https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### **3. 利用可能なユーザー**
- `admin` / `admin123` (管理者)
- `niina` / `0077` (管理者)
- `takabeni1` / `takabeni1` (管理者)
- `takabeni2` / `takabeni2` (従業員)
- `employee` / `employee` (従業員)

## 🔍 **トラブルシューティング**

### **ログインが失敗する場合**
1. 環境変数が正しく設定されているか確認
2. スタートアップコマンドが `node server/production-server.js` になっているか確認
3. アプリケーションが再起動されているか確認

### **データベース接続エラーが発生する場合**
1. `DATABASE_URL` を一時的に削除またはコメントアウト
2. `BYPASS_DB_FOR_LOGIN=true` を設定
3. アプリケーションを再起動

### **CORSエラーが発生する場合**
1. `FRONTEND_URL` が正しく設定されているか確認
2. フロントエンドのURLが許可されているか確認

## 📊 **ログ確認方法**

Azure Portal → App Service → 監視 → ログストリームで以下を確認：

```
🚀 Production Server running on 0.0.0.0:8080
📊 Health check: /api/health
🌍 Environment: production
✅ Production startup sequence completed
```

## 🔄 **段階的復旧手順**

### **フェーズ1: 基本機能の復旧**
- データベース接続を無効化
- 認証機能のみ有効化
- ログイン機能の確認

### **フェーズ2: データベース機能の復旧**
- `DATABASE_URL` を設定
- `PG_SSL=disable` でテスト
- データベース接続の確認

### **フェーズ3: 完全機能の復旧**
- `PG_SSL=require` に変更
- 全機能の動作確認

## 📝 **注意事項**

- 本番環境とローカル環境は完全に分離されています
- ローカル開発時は `node server/local-server.js` を使用
- 本番環境では `node server/production-server.js` を使用
- 環境変数は各環境で適切に設定してください
