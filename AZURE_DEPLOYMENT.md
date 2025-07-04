# Azure App Service デプロイメント

## 概要

このプロジェクトは、Dockerを使わずにGitHub ActionsからAzure App Serviceに直接デプロイするように設定されています。

## アーキテクチャ

- **フロントエンド**: Azure Static Web Apps
- **バックエンド**: Azure App Service (Node.js)
- **データベース**: Azure Database for PostgreSQL
- **ストレージ**: Azure Blob Storage

## デプロイメントフロー

1. **GitHub Actions** がmainブランチのプッシュを検知
2. **Node.js環境** でアプリケーションをビルド
3. **デプロイメントパッケージ** を作成
4. **Azure App Service** に直接デプロイ

## 必要な設定

### 1. Azure App Service

- 名前: `emergency-backend`
- ランタイム: Node.js 20 LTS
- プラン: Basic 以上

### 2. GitHub Secrets

以下のシークレットをGitHubリポジトリに設定：

```
AZURE_CREDENTIALS=<Azure Service Principal JSON>
AZURE_WEBAPP_NAME=emergency-backend
OPENAI_API_KEY=<your-openai-api-key>
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
FRONTEND_URL=<your-frontend-url>
DATABASE_URL=<your-database-url>
SESSION_SECRET=<your-session-secret>
STORAGE_CONTAINER_NAME=<your-container-name>
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
```

### 3. Azure App Service 環境変数

Azure Portalで以下の環境変数を設定：

```
NODE_ENV=production
PORT=8080
DATABASE_URL=<your-database-url>
SESSION_SECRET=<your-session-secret>
OPENAI_API_KEY=<your-openai-api-key>
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
FRONTEND_URL=<your-frontend-url>
STORAGE_CONTAINER_NAME=<your-container-name>
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
```

## ファイル構成

### デプロイメント関連ファイル

- `azure-deploy.yml`: GitHub Actions ワークフロー
- `web.config`: Azure App Service 設定
- `startup.js`: アプリケーション起動スクリプト
- `package.json`: Node.js 依存関係とスクリプト

### ビルド出力

```
deployment/
├── dist/                    # サーバーサイドビルド
├── shared/dist/            # 共有ライブラリ
├── client/dist/            # フロントエンドビルド
├── public/                 # 静的ファイル
├── knowledge-base/         # ナレッジベース
├── node_modules/           # 依存関係
├── package.json
├── web.config
└── startup.js
```

## デプロイメント手順

1. **Azure App Service を作成**
   ```bash
   az webapp create --name emergency-backend --resource-group <resource-group> --plan <app-service-plan> --runtime "NODE|20-lts"
   ```

2. **Azure Service Principal を作成**
   ```bash
   az ad sp create-for-rbac --name "emergency-backend-deploy" --role contributor \
       --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Web/sites/emergency-backend \
       --sdk-auth
   ```

3. **GitHub Secrets を設定**
   - 上記で出力されたJSONを`AZURE_CREDENTIALS`に設定
   - その他の環境変数シークレットを設定

4. **mainブランチにプッシュ**
   ```bash
   git add .
   git commit -m "Setup Azure App Service deployment"
   git push origin main
   ```

## トラブルシューティング

### よくある問題

1. **環境変数が設定されていない**
   - Azure Portalでアプリケーション設定を確認
   - GitHub Secretsが正しく設定されているか確認

2. **ビルドエラー**
   - GitHub Actionsのログを確認
   - 依存関係のインストールエラーがないか確認

3. **起動エラー**
   - Azure App Serviceのログストリームを確認
   - `startup.js`のパス設定を確認

4. **APIエンドポイントが応答しない**
   - `web.config`のルーティング設定を確認
   - CORS設定を確認

### ログ確認方法

1. **GitHub Actions ログ**
   - リポジトリ → Actions → 最新の実行

2. **Azure App Service ログ**
   - Azure Portal → App Service → ログストリーム

3. **アプリケーションログ**
   - `/api/health` エンドポイントで確認

## パフォーマンス最適化

1. **キャッシュ設定**
   - 静的ファイルのキャッシュヘッダーを設定
   - CDNの利用を検討

2. **スケーリング**
   - 必要に応じてApp Service Planをアップグレード
   - 自動スケーリングの設定

3. **モニタリング**
   - Application Insightsの設定
   - メトリクスの監視

## セキュリティ

1. **HTTPS強制**
   - Azure App ServiceでHTTPSを有効化
   - カスタムドメインのSSL証明書設定

2. **環境変数の保護**
   - 機密情報はGitHub Secretsで管理
   - Azure Key Vaultの利用を検討

3. **CORS設定**
   - 許可するオリジンを最小限に制限
   - 本番環境での適切なCORS設定 