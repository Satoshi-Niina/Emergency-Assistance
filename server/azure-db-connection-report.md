# Azure PostgreSQL データベース接続診断レポート

## 🔍 接続テスト結果

### エンドポイント情報
- **ホスト**: emergencyassistance-db.postgres.database.azure.com
- **IPアドレス**: 20.89.194.109
- **ポート**: 5432
- **データベース**: postgres
- **ユーザー**: postgres

### ネットワーク接続テスト結果
- **TCP接続**: ❌ 失敗
- **Ping**: ❌ タイムアウト
- **DNS解決**: ✅ 成功 (20.89.194.109)

### クライアント情報
- **ローカルIP**: 192.168.2.102
- **パブリックIP**: 153.171.234.141
- **ネットワーク**: Wi-Fi

## ❌ 問題の特定

### 主要な問題
1. **ファイアウォール設定**: クライアントIPがAzure PostgreSQLサーバーのファイアウォールで許可されていない
2. **SSL接続**: Azure PostgreSQLではSSL接続が必須
3. **認証情報**: パスワードが設定されていない

## 🔧 解決手順

### 1. Azure Portalでのファイアウォール設定
1. Azure Portalにログイン
2. PostgreSQL サーバー "emergencyassistance-db" を選択
3. 左メニューから「接続セキュリティ」を選択
4. 「ファイアウォール規則」セクションで以下を追加：
   - **規則名**: EmergencyAssistance-Client
   - **開始IP**: 153.171.234.141
   - **終了IP**: 153.171.234.141
   - **説明**: Emergency Assistance アプリケーション用

### 2. SSL接続設定の確認
- SSL接続が有効になっていることを確認
- `sslmode=require` パラメータを使用

### 3. 認証情報の設定
- 実際のパスワードを確認
- 環境変数 `DATABASE_URL` に正しい接続文字列を設定

## 📝 推奨される接続文字列

```bash
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@emergencyassistance-db.postgres.database.azure.com:5432/postgres?sslmode=require"
```

## 🧪 接続テスト手順

1. ファイアウォール設定を更新
2. パスワードを確認
3. `test-azure-connection.js` のパスワードを更新
4. `node test-azure-connection.js` を実行

## ⚠️ 注意事項

- ファイアウォール設定の変更は数分かかる場合があります
- パブリックIPが変更された場合は、ファイアウォール規則も更新が必要です
- 本番環境では、より制限的なファイアウォール設定を検討してください

## 📚 参考リンク

- [Azure PostgreSQL ファイアウォール規則の設定](https://docs.microsoft.com/azure/postgresql/flexible-server/how-to-manage-firewall-portal)
- [Azure PostgreSQL SSL接続の設定](https://docs.microsoft.com/azure/postgresql/flexible-server/how-to-connect-tls-ssl)
- [接続文字列の形式](https://docs.microsoft.com/azure/postgresql/flexible-server/connect-python#get-connection-information)
