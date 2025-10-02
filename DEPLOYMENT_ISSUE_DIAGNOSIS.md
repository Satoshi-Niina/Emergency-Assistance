# デプロイ後問題診断と解決ガイド

## 🔍 **現在の状況**

### ✅ **正常に動作している部分**
- サーバー起動: `200 OK`
- ヘルスチェック: `200 OK` 
- 認証ハンドシェイク: `200 OK`
- 環境変数: 正しく設定済み

### ❌ **問題が発生している部分**
- データベース接続: `/api/db-check` でタイムアウト
- データベース依存機能: 動作しない可能性

## 🚨 **考えられる原因と解決策**

### **1. データベース接続の問題**

#### **A. Azure PostgreSQL接続設定の確認**

**Azure Portal での確認手順:**
1. Azure Portal → PostgreSQL サーバー
2. **接続セキュリティ** を確認
3. **ファイアウォール規則** で以下を確認：
   - `Allow access to Azure services` が有効
   - App Service の IP アドレスが許可されている

#### **B. 環境変数の再確認**

**Azure App Service の環境変数:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
PG_SSL=require
NODE_ENV=production
PORT=8080
```

**確認ポイント:**
- `DATABASE_URL` の接続文字列が正しいか
- `PG_SSL=require` が設定されているか
- パスワードに特殊文字が含まれていないか

#### **C. SSL証明書の問題**

**解決策:**
```bash
# 環境変数を一時的に変更
PG_SSL=disable
```

### **2. ネットワーク接続の問題**

#### **A. Azure App Service のネットワーク設定**

**確認手順:**
1. Azure Portal → App Service
2. **ネットワーク** → **アウトバウンド** を確認
3. **VNet統合** が設定されている場合は一時的に無効化

#### **B. 接続タイムアウトの調整**

**環境変数に追加:**
```bash
DB_CONNECTION_TIMEOUT=60000
DB_QUERY_TIMEOUT=60000
```

### **3. マイグレーションの問題**

#### **A. マイグレーション実行の確認**

**ログで確認すべき内容:**
```
🚀 Starting application startup sequence...
🔄 Starting database migrations...
✅ All migrations completed successfully
```

**問題がある場合:**
- マイグレーションファイルが正しくコピーされているか
- データベースの権限が適切か

### **4. 段階的復旧手順**

#### **ステップ1: セーフモードで起動**
```bash
# Azure App Service の環境変数に追加
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true
```

#### **ステップ2: データベース接続を無効化**
```bash
# DATABASE_URL を一時的に削除または無効化
# DATABASE_URL=postgresql://...
```

#### **ステップ3: 段階的に機能を有効化**
1. セーフモードで基本機能を確認
2. データベース接続を有効化
3. マイグレーションを実行
4. 認証機能を有効化

### **5. ログの確認方法**

#### **A. Azure Portal でのログ確認**
1. Azure Portal → App Service
2. **監視** → **ログストリーム**
3. エラーメッセージを確認

#### **B. GitHub Actions でのログ確認**
1. GitHub → Actions
2. 最新のワークフロー実行
3. デプロイログを確認

### **6. 緊急時の対応**

#### **A. ロールバック**
```bash
# 前のバージョンに戻す
# Azure Portal → App Service → デプロイ → デプロイ履歴
```

#### **B. 最小限の設定で起動**
```bash
# 環境変数を最小限に設定
NODE_ENV=production
PORT=8080
BYPASS_DB_FOR_LOGIN=true
SAFE_MODE=true
```

## 🔧 **具体的な修正手順**

### **手順1: データベース接続の診断**

1. **Azure Portal** → **App Service** → **設定** → **アプリケーション設定**
2. 以下の環境変数を追加：
   ```bash
   DB_DEBUG=true
   DB_CONNECTION_TIMEOUT=60000
   ```
3. **保存** → **再起動**

### **手順2: SSL設定の調整**

1. 環境変数 `PG_SSL` を `disable` に変更
2. 再起動して動作確認
3. 動作する場合は `require` に戻して再テスト

### **手順3: マイグレーションの手動実行**

1. Azure Portal → App Service → **開発ツール** → **SSH**
2. 以下のコマンドを実行：
   ```bash
   node startup-migration.js
   ```

### **手順4: ログの詳細確認**

1. **ログストリーム** で以下を確認：
   - データベース接続エラー
   - マイグレーション実行ログ
   - SSL証明書エラー

## 📋 **チェックリスト**

- [ ] Azure PostgreSQL のファイアウォール設定
- [ ] DATABASE_URL の接続文字列
- [ ] PG_SSL 設定
- [ ] マイグレーションファイルの存在
- [ ] データベースの権限設定
- [ ] ネットワーク接続
- [ ] SSL証明書の有効性

## 🆘 **それでも解決しない場合**

1. **新しい App Service** を作成
2. **新しい PostgreSQL** を作成
3. **段階的に設定** を移行
4. **Azure サポート** に問い合わせ

この手順に従って、段階的に問題を特定し、解決していきましょう。
