# Azure App Service 環境設定ガイド

本番環境向けのAzure App Service設定手順です。

## 設定手順（詳細）

### ステップ1: Azure Portal にアクセス

1. [Azure Portal](https://portal.azure.com) にログイン
2. 上部の検索バーで「App Services」と入力
3. 「App Services」をクリック

### ステップ2: App Service リソースを選択

1. リストから対象の App Service をクリック
   - 例: `emergency-assistance-bfckhjejb3fbf9du`

### ステップ3: 構成（Configuration）を開く

1. 左側のメニュー（サイドバー）をスクロール
2. **「設定（Settings）」** セクションを探す
3. **「構成（Configuration）」** をクリック
   - アイコン: 歯車（⚙️）のマーク

### ステップ4: アプリケーション設定（Application settings）を確認

1. 「構成」ページが開く
2. 上部にタブが表示される：
   - **アプリケーション設定（Application settings）** ← ここをクリック
   - 接続文字列（Connection strings）
   - 全般設定（General settings）
   - パス マッピング（Path mappings）
3. 「アプリケーション設定」タブが選択されていることを確認

### ステップ5: 設定の確認・編集

「アプリケーション設定」タブには、環境変数の一覧が表示されます：

- **名前（Name）**: 環境変数名
- **値（Value）**: 環境変数の値
- **デプロイ スロット設定（Deployment slot setting）**: チェックボックス

#### 設定を追加する場合

1. 「+ 新規アプリケーション設定（+ New application setting）」をクリック
2. **名前** と **値** を入力
3. 「OK」をクリック
4. 上部の「保存（Save）」をクリック

#### 設定を削除する場合

1. 削除したい設定の行を見つける
2. 行の右端にある「...」（3つの点）をクリック
3. 「削除（Delete）」をクリック
4. 上部の「保存（Save）」をクリック

#### 設定を編集する場合

1. 編集したい設定の行をクリック
2. 値を変更
3. 「OK」をクリック
4. 上部の「保存（Save）」をクリック

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

| 設定名 | 理由 | 確認方法 |
|--------|------|---------|
| `WEBSITE_RUN_FROM_PACKAGE` | ZIPデプロイ無効化のため削除 | 「アプリケーション設定」タブで検索（Ctrl+F または Cmd+F） |

### WEBSITE_RUN_FROM_PACKAGE の確認方法

1. 「アプリケーション設定」タブを開く（上記手順参照）
2. ブラウザの検索機能（Ctrl+F または Cmd+F）を使用
3. `WEBSITE_RUN_FROM_PACKAGE` と入力して検索
4. 見つかった場合：
   - 行の右端の「...」をクリック
   - 「削除」をクリック
   - 上部の「保存」をクリック
5. 見つからない場合：
   - 設定されていないので問題なし

**注意**: `WEBSITE_RUN_FROM_PACKAGE` は環境変数（アプリケーション設定）です。設定されていない場合は、何もする必要はありません。

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

