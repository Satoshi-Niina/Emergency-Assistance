# デプロイメントガイド（実行手順）

このガイドでは、GitHub Actionsを使用してAzure Static Web Apps（フロントエンド）とAzure App Service（バックエンド）にデプロイする手順を説明します。

## デプロイフロー概要

### フロントエンド（Static Web Apps）
1. クリーンビルド（前回のビルド成果物を削除）
2. 依存関係のインストール
3. ビルド（環境変数 `VITE_API_BASE_URL` を埋め込み）
4. Azure Static Web Appsにデプロイ

### バックエンド（App Service）
1. Dockerイメージのビルド
2. GitHub Container Registryにプッシュ
3. 環境変数をAzure App Serviceに設定
4. Dockerコンテナとしてデプロイ

## ① GitHub Secretsの設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で設定します。

### Azure認証情報（必須）

```
AZURE_CREDENTIALS                # Service PrincipalのJSON
AZURE_RESOURCE_GROUP            # リソースグループ名
AZURE_APP_SERVICE_NAME          # emergency-assistance-bfckhjejb3fbf9du
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Appのデプロイトークン
```

### フロントエンド用環境変数（ビルド時に埋め込まれる）

```
VITE_API_BASE_URL                # /api または https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api
```

**注意**: 
- Static Web Appsでは、環境変数はビルド時に埋め込まれるため、Azure Portalでの設定は不要です
- GitHub Secretsは1つの場所にありますが、フロントエンドワークフローは `VITE_API_BASE_URL` のみを使用します
- 詳細は [環境変数の分離](./ENV_SEPARATION.md) を参照してください

### バックエンド用環境変数（Azure App Serviceに設定される）

**注意**:
- GitHub Secretsは1つの場所にありますが、バックエンドワークフローはバックエンド用の環境変数のみを使用します
- すべてのバックエンド環境変数がAzure App ServiceのConfigurationに自動設定されます
- 詳細は [環境変数の分離](./ENV_SEPARATION.md) を参照してください

#### 必須環境変数

```
DATABASE_URL                     # PostgreSQL接続文字列
JWT_SECRET                       # 32文字以上のランダム文字列
SESSION_SECRET                   # 32文字以上のランダム文字列
FRONTEND_URL                     # https://witty-river-012f39e00.1.azurestaticapps.net
```

#### DBとBLOBストレージの設定

**データベース（PostgreSQL）**
- `DATABASE_URL` を設定すると、PostgreSQLデータベースが使用されます
- 設定しない場合、データベース機能は無効になります

**Blob Storage（Azure Storage）**
- `AZURE_STORAGE_CONNECTION_STRING` を設定すると、Azure Blob Storageが使用されます
- 設定しない場合、Blob Storage機能は無効になります（ローカルファイルシステムを使用）

**両方設定した場合**
- データベース: PostgreSQLが使用されます
- ストレージ: Blob Storageが使用されます
- 両方の機能が利用可能になります

**どちらも設定しない場合**
- データベース機能は無効（一部機能が動作しない可能性）
- Blob Storage機能は無効（ローカルファイルシステムを使用）

#### オプション環境変数

```
OPENAI_API_KEY                   # OpenAI APIキー（GPT機能を使用する場合）
AZURE_STORAGE_CONNECTION_STRING  # Azure Blob Storage接続文字列（Blob Storageを使用する場合）
AZURE_STORAGE_CONTAINER_NAME     # Blob Storageコンテナ名（デフォルト: knowledge）
STORAGE_BASE_PREFIX             # ストレージベースプレフィックス（デフォルト: knowledge-base）
PG_SSL                          # PostgreSQL SSL設定（デフォルト: require）
CORS_ALLOW_ORIGINS              # CORS許可オリジン（デフォルト: *）
```

## ② ワークフローの実行

### 自動実行

`main` ブランチにプッシュすると自動的に実行されます：

- **フロントエンド**: `client/` ディレクトリに変更があると実行
- **バックエンド**: `server/`, `shared/`, `knowledge-base/`, `Dockerfile` に変更があると実行

### 手動実行

1. GitHubリポジトリの **Actions** タブを開く
2. 実行したいワークフローを選択
3. **Run workflow** をクリック
4. ブランチを選択して実行

## ③ デプロイの確認

### フロントエンド

- URL: https://witty-river-012f39e00.1.azurestaticapps.net
- デプロイ状態: Azure Portal > Static Web Apps で確認

### バックエンド

- URL: https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
- ヘルスチェック: https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health
- デプロイ状態: Azure Portal > App Service > Deployment Center で確認

### 環境変数の確認

#### フロントエンド（Static Web Apps）

フロントエンドの環境変数はビルド時に埋め込まれるため、Azure Portalでは設定できません。
GitHub Actionsのビルドログで確認できます。

#### バックエンド（App Service）

Azure Portalで確認：
1. Azure Portal > App Service (`emergency-assistance-bfckhjejb3fbf9du`)
2. **Configuration** > **Application settings**
3. すべての環境変数が表示されます

または、Azure CLIで確認：
```bash
az webapp config appsettings list \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group YOUR_RESOURCE_GROUP \
  --output table
```

## ④ トラブルシューティング

### デプロイが失敗する

1. GitHub Actionsのログを確認
2. GitHub Secretsが正しく設定されているか確認
3. Azureリソースが存在するか確認
4. Service Principalの権限を確認

### フロントエンドがバックエンドに接続できない

1. `staticwebapp.config.json` の `/api/*` ルールを確認
2. `VITE_API_BASE_URL` が正しく設定されているか確認
3. App ServiceのCORS設定を確認
4. `FRONTEND_URL` 環境変数が正しく設定されているか確認

### 環境変数が設定されない

1. GitHub Secretsが正しく設定されているか確認
2. ワークフローのログで環境変数設定ステップを確認
3. Azure Portal > App Service > Configuration で確認

### データベースに接続できない

1. `DATABASE_URL` が正しいフォーマットか確認
2. PostgreSQLサーバーのファイアウォール設定を確認
3. App ServiceのIPアドレスを許可リストに追加
4. `PG_SSL` 設定を確認

### Blob Storageに接続できない

1. `AZURE_STORAGE_CONNECTION_STRING` が正しく設定されているか確認
2. Blob Storageアカウントが存在するか確認
3. コンテナ名が正しいか確認（`AZURE_STORAGE_CONTAINER_NAME`）

## 参考リンク

- [GitHub Secrets設定ガイド](./GITHUB_SECRETS.md)
- [環境変数一覧](./ENVIRONMENT_VARIABLES.md)
- [クイックセットアップガイド](./QUICK_SETUP.md)

