# Azure App Service 環境設定ガイド

本番環境向けのAzure App Service設定手順です。

## 設定手順

1. Azure Portal にログイン
2. App Service リソースを選択
3. 左メニューから「構成（Configuration）」を選択
4. 「アプリケーション設定（Application settings）」タブを開く

## 必須設定項目

以下の環境変数を設定してください：

| 設定名 | 値 | 備考 |
|--------|----|------|
| `NODE_ENV` | `production` | 本番モード指定（必須） |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Oryx自動ビルド有効化（必須） |
| `WEBSITE_NODE_DEFAULT_VERSION` | `20-lts` | Node.jsバージョン統一（推奨） |
| `HEALTH_TOKEN` | 任意文字列（例: `myhealth123`） | readiness 認証用（任意・推奨） |

## 削除すべき設定

以下の設定が存在する場合は**削除**してください：

| 設定名 | 理由 |
|--------|------|
| `WEBSITE_RUN_FROM_PACKAGE` | ZIPデプロイ無効化のため削除 |

## Startup コマンド

**Startup コマンドは空欄のまま**にしてください。

### 理由

- Oryx Build が自動的に `npm start` を実行します
- ルート `package.json` の `start` スクリプトが `npm --prefix server run start` を実行
- `server/package.json` の `start` スクリプトが `node azure-server.js` を実行
- 手動でStartupコマンドを設定すると、Oryx Buildの自動検出と競合する可能性があります

## 設定後の確認

1. 設定を保存（「保存」ボタンをクリック）
2. App Service を再起動（必要に応じて）
3. ログストリームで以下が出力されることを確認：
   ```
   ✅ Server listening on port xxxx (env: production)
   ```

## ログ確認手順

1. Azure Portal > App Service > 「ログストリーム（Log stream）」を選択
2. 以下のメッセージが表示されることを確認：
   - `🔗 Frontend URL: ...`
   - `🚀 Azure Server Starting - Version: ...`
   - `✅ Server listening on port xxxx (env: production)`

## 再デプロイ時のチェックリスト

- [ ] `NODE_ENV=production` が設定されている
- [ ] `SCM_DO_BUILD_DURING_DEPLOYMENT=true` が設定されている
- [ ] `WEBSITE_RUN_FROM_PACKAGE` が削除されている
- [ ] Startup コマンドが空欄である
- [ ] `HEALTH_TOKEN` が設定されている場合、GitHub Secrets と一致している
- [ ] ログストリームで起動メッセージが確認できる
- [ ] `/live` エンドポイントが200で応答する

## セキュリティ設定（推奨）

### HEALTH_TOKEN の設定

`HEALTH_TOKEN` を設定することで、`/ready` エンドポイントへのアクセスを保護できます。

1. App Service の「構成」で `HEALTH_TOKEN` を設定（例: `myhealth123`）
2. GitHub Secrets にも同じ値を設定（後述の「GitHub Secrets 設定」を参照）
3. ヘルスチェック時に認証が有効になります

### その他の推奨設定

- `FRONTEND_URL`: フロントエンドのURL（CORS設定用）
- `STATIC_WEB_APP_URL`: Static Web Apps のURL（CORS設定用）
- `DATABASE_URL`: PostgreSQL接続文字列（データベース使用時）
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Storage接続文字列（ストレージ使用時）

## トラブルシューティング

### デプロイが失敗する場合

1. `SCM_DO_BUILD_DURING_DEPLOYMENT` が `true` になっているか確認
2. `WEBSITE_NODE_DEFAULT_VERSION` が `20-lts` になっているか確認
3. ログストリームでエラーメッセージを確認

### ヘルスチェックが失敗する場合

1. `/live` エンドポイントが応答するか確認
2. `HEALTH_TOKEN` を設定している場合、GitHub Secrets と一致しているか確認
3. App Service のログストリームで起動メッセージを確認

