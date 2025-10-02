# 本番環境データベース認証設定ガイド

## 🎯 **実装完了内容**

### **✅ データベース認証システム**
- ハードコードされた認証からデータベース認証に変更
- パスワードのハッシュ化（bcryptjs使用）
- フロントエンドから平文パスワード → サーバーでハッシュ化 → DBと照合

### **🔐 認証フロー**
1. **フロントエンド**: ユーザー名・平文パスワードを送信
2. **サーバー**: データベースからユーザー情報を取得
3. **サーバー**: bcryptjsでパスワードをハッシュ化して照合
4. **サーバー**: 認証成功時にユーザー情報を返却

## 📊 **利用可能なユーザー**

| ユーザー名 | 平文パスワード | ロール | 部署 | 説明 |
|-----------|---------------|--------|------|------|
| `admin` | `admin123` | `admin` | システム管理部 | システム管理者 |
| `niina` | `0077` | `employee` | システム管理部 | 一般ユーザー |
| `takabeni1` | `Takabeni&1` | `admin` | システム管理部 | 運用管理者 |
| `takabeni2` | `Takaben&2` | `employee` | 保守部 | 一般ユーザー |
| `employee` | `employee123` | `employee` | 保守部 | テスト用ユーザー |

## 🔧 **Azure App Service 設定**

### **1. 環境変数設定**
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
PG_SSL=require
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### **2. スタートアップコマンド**
```bash
node server/production-server.js
```

### **3. データベースマイグレーション**
- `migrations/0013_production_users_setup.sql` が自動実行される
- 本番環境用ユーザーデータが初期化される

## 🚀 **デプロイ手順**

### **ステップ1: Azure App Service設定**
1. Azure Portal → App Service → 設定 → アプリケーション設定
2. 上記の環境変数を設定
3. スタートアップコマンドを `node server/production-server.js` に変更

### **ステップ2: アプリケーション再起動**
1. Azure Portal → App Service → 概要 → 再起動
2. 再起動完了まで待機（約2-3分）

### **ステップ3: 動作確認**
```bash
# ヘルスチェック
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health

# ログインテスト
POST https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

## 🔍 **トラブルシューティング**

### **ログインが失敗する場合**
1. **データベース接続確認**:
   ```bash
   GET /api/db-check
   ```

2. **ユーザー一覧確認**:
   ```bash
   GET /api/users
   ```

3. **ログ確認**: Azure Portal → App Service → 監視 → ログストリーム

### **データベース接続エラー**
1. `DATABASE_URL` が正しく設定されているか確認
2. `PG_SSL=require` が設定されているか確認
3. Azure PostgreSQL のファイアウォール設定を確認

### **パスワード認証エラー**
1. マイグレーションが実行されているか確認
2. ユーザーデータが正しく挿入されているか確認
3. bcryptjsライブラリがインストールされているか確認

## 📝 **セキュリティ考慮事項**

### **✅ 実装済み**
- パスワードのハッシュ化（bcryptjs）
- SQLインジェクション対策（パラメータ化クエリ）
- 入力値検証
- エラーメッセージの統一

### **🔒 推奨事項**
- 定期的なパスワード変更
- 強力なパスワードポリシー
- ログイン試行回数制限
- セッションタイムアウト設定

## 🧪 **テスト方法**

### **ローカル環境でのテスト**
```bash
# ローカルサーバー起動
node server/local-server.js

# テストサーバー起動
node server/test-server.js
```

### **本番環境でのテスト**
1. Azure App Serviceにデプロイ
2. 上記のユーザーでログインテスト
3. 各APIエンドポイントの動作確認

## 📊 **ログ出力例**

### **正常なログイン**
```
[auth/login] Production login attempt: { username: 'admin', timestamp: '2025-10-02T00:00:00.000Z' }
[auth/login] ユーザー検索開始: { username: 'admin' }
[auth/login] ユーザー検索結果: { found: true, userCount: 1 }
[auth/login] ユーザー情報取得: { id: 'xxx', username: 'admin', role: 'admin' }
[auth/login] パスワード比較開始
[auth/login] パスワード比較結果: { isValid: true }
[auth/login] Login successful: { username: 'admin', role: 'admin' }
```

### **認証失敗**
```
[auth/login] Production login attempt: { username: 'invalid', timestamp: '2025-10-02T00:00:00.000Z' }
[auth/login] ユーザー検索開始: { username: 'invalid' }
[auth/login] ユーザー検索結果: { found: false, userCount: 0 }
[auth/login] ユーザーが見つかりません
```
