# Azure Portal 手動修正手順書

本番環境での接続問題を解決するための手動修正手順です。

## 🔧 手順1: Azure PostgreSQL ファイアウォール設定

1. **Azure Portal** にログインします
   - https://portal.azure.com

2. **PostgreSQL サーバー** を検索・選択します
   - リソース: `emergencyassistance-db`

3. **接続セキュリティ** を開きます

4. **ファイアウォール規則** を追加します：
   ```
   規則名: CurrentClientIP
   開始IP: 153.171.234.141
   終了IP: 153.171.234.141
   ```

5. **保存** をクリックします

## 🔧 手順2: Azure Cloud Shell でniinaユーザー修正

1. **Azure Portal** の上部にある Cloud Shell アイコンをクリック

2. **Bash** を選択します

3. 以下のコマンドを実行します：

```bash
# PostgreSQLに接続
psql "postgresql://emergencyassistance-admin@emergencyassistance-db.postgres.database.azure.com:5432/emergencyassistance?sslmode=require"
```

パスワードを入力後、以下のSQLを実行：

```sql
-- niinaユーザーの確認
SELECT username, role, display_name FROM users WHERE username = 'niina';

-- niinaユーザーを作成または更新
INSERT INTO users (
  id, username, password, role, display_name, department, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'niina',
  '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS',
  'system_admin',
  'Niina Administrator',
  'システム管理',
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  role = 'system_admin',
  display_name = 'Niina Administrator',
  department = 'システム管理',
  updated_at = NOW();

-- 確認
SELECT username, role, display_name FROM users WHERE username = 'niina';

-- 接続終了
\q
```

## 🔧 手順3: Azure App Service 環境変数確認

1. **App Service** を検索・選択します
   - リソース: `emergency-assistance-backend`

2. **構成** を開きます

3. **アプリケーション設定** で以下を確認：
   - `DATABASE_URL`: 正しく設定されているか
   - `AZURE_STORAGE_CONNECTION_STRING`: 正しく設定されているか
   - `AZURE_STORAGE_ACCOUNT_NAME`: 正しく設定されているか
   - `AZURE_STORAGE_ACCOUNT_KEY`: 正しく設定されているか

4. 問題がある場合は修正して **保存** をクリック

## 🔧 手順4: App Service 再起動

1. **概要** タブに戻ります

2. **再起動** ボタンをクリックします

3. 確認ダイアログで **はい** をクリック

## 🔧 手順5: 包括的修正スクリプト実行（Kudu Console）

1. **App Service** の **高度なツール** を開きます

2. **移動** をクリックして Kudu に移動します

3. **Debug console** > **CMD** を選択

4. `site/wwwroot` に移動します

5. 以下のコマンドを実行します：
   ```bash
   node scripts/azure-comprehensive-fix.js
   ```

## 🔧 手順6: フロントエンド確認

1. フロントエンドアプリにアクセス
   - https://your-frontend-url.azurestaticapps.net

2. **ログアウト** します

3. **niinaユーザー** でログイン：
   - ユーザー名: `niina`
   - パスワード: `G&896845`

4. **ハードリロード** を実行（Ctrl+Shift+R）

5. **設定ページ** でシステム管理メニューが表示されるか確認

## 📊 トラブルシューティング

### データベース接続エラーの場合
- ファイアウォール規則が正しく設定されているか確認
- SSL設定が有効になっているか確認
- 接続文字列の形式が正しいか確認

### Blob Storage接続エラーの場合
- ストレージアカウントのアクセスキーが正しいか確認
- 接続文字列の形式が正しいか確認
- ストレージアカウントが存在するか確認

### niinaユーザーログイン問題の場合
- パスワードが正しいか確認（`G&896845`）
- ユーザーのロールが `system_admin` になっているか確認
- ブラウザキャッシュをクリアして再試行

## ✅ 成功確認項目

- [ ] niinaユーザーでログイン成功
- [ ] 設定ページでシステム管理メニューが表示
- [ ] 機種管理で機種一覧が表示（"接続中"ではなく）
- [ ] ユーザー管理でユーザー一覧が表示
- [ ] 通知機能が正常動作

## 📞 追加サポート

上記手順で問題が解決しない場合は、以下の情報を収集してください：
1. Azure App Service のログ
2. ブラウザの開発者ツールのエラーメッセージ
3. データベース接続テストの結果
4. 環境変数の設定状況
