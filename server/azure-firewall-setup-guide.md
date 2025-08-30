# Azure PostgreSQL ファイアウォール設定ガイド

## 🚨 現在の状況
- **接続エンドポイント**: emergencyassistance-db.postgres.database.azure.com
- **クライアントIP**: 153.171.234.141
- **問題**: ファイアウォールでクライアントIPが許可されていない
- **症状**: TCP接続タイムアウト、ETIMEDOUT エラー

## 🔧 Azure Portalでの設定手順

### ステップ1: Azure Portalにアクセス
1. [Azure Portal](https://portal.azure.com) にログイン
2. 左側の検索バーで「PostgreSQL サーバー」を検索
3. 「PostgreSQL サーバー」をクリック

### ステップ2: 対象サーバーを選択
1. サーバー一覧から **emergencyassistance-db** をクリック
2. サーバーの概要ページが表示される

### ステップ3: 接続セキュリティに移動
1. 左側のメニューから「**接続セキュリティ**」をクリック
2. 「ファイアウォール規則」セクションが表示される

### ステップ4: ファイアウォール規則を追加
1. 「**+ クライアントIPの追加**」ボタンをクリック
2. 以下の情報を入力：
   - **規則名**: `EmergencyAssistance-Client`
   - **開始IP**: `153.171.234.141`
   - **終了IP**: `153.171.234.141`
   - **説明**: `Emergency Assistance アプリケーション用クライアントIP`

### ステップ5: 設定を保存
1. 「**保存**」ボタンをクリック
2. 設定の保存が完了するまで待機

## ⚠️ 重要な注意事項

### セキュリティ上の考慮事項
- 現在のIPアドレス `153.171.234.141` は動的IPの可能性があります
- 本番環境では、より制限的なファイアウォール設定を検討してください
- 定期的にIPアドレスの変更を確認し、必要に応じて更新してください

### 設定反映のタイミング
- ファイアウォール設定の変更は通常数分で反映されます
- 最大で5分程度かかる場合があります
- 設定後、すぐに接続テストを実行せず、数分待ってからテストしてください

## 🧪 設定後の接続テスト

### 1. 基本的な接続テスト
```bash
# PowerShellでの接続テスト
Test-NetConnection -ComputerName emergencyassistance-db.postgres.database.azure.com -Port 5432
```

### 2. 詳細診断の実行
```bash
# 詳細診断スクリプトの実行
node azure-connection-diagnostics.js
```

### 3. データベース接続テスト
```bash
# 実際のパスワードを設定後
node test-azure-connection.js
```

## 🔍 トラブルシューティング

### 接続がまだ失敗する場合
1. **ファイアウォール設定の確認**
   - 正しいIPアドレスが設定されているか確認
   - 規則が有効になっているか確認

2. **ネットワーク設定の確認**
   - クライアントのネットワーク設定を確認
   - VPNやプロキシの設定を確認

3. **Azure PostgreSQL サーバーの状態確認**
   - サーバーが起動しているか確認
   - メンテナンス中でないか確認

### よくあるエラーと対処法
- **ETIMEDOUT**: ファイアウォール設定の問題
- **ECONNREFUSED**: サーバーが起動していない、またはポートが閉じている
- **ENOTFOUND**: DNS解決の問題
- **authentication failed**: 認証情報の問題（接続自体は成功）

## 📞 サポートが必要な場合

### Azure サポート
- Azure Portal > ヘルプとサポート > サポートリクエスト
- 技術的な問題の場合は、Azure サポートチームに問い合わせ

### コミュニティリソース
- [Azure PostgreSQL ドキュメント](https://docs.microsoft.com/azure/postgresql/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/azure-postgresql)
- [Azure フォーラム](https://feedback.azure.com/forums/597976-azure-database-for-postgresql)

## 📋 設定完了チェックリスト

- [ ] Azure Portalでファイアウォール規則を追加
- [ ] 設定を保存
- [ ] 数分待機（設定反映のため）
- [ ] 基本的な接続テスト実行
- [ ] 詳細診断スクリプト実行
- [ ] データベース接続テスト実行
- [ ] 接続成功を確認

設定完了後、Emergency Assistance アプリケーションからAzure PostgreSQLデータベースに正常に接続できるようになります。
