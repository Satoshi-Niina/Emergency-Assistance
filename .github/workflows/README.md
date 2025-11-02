# GitHub Actions ワークフロー

このディレクトリには、本番環境へのデプロイ用のGitHub Actionsワークフローが含まれています。

## ワークフローファイル

### deploy-client.yml
クライアント（フロントエンド）のビルドとデプロイを行います。

**トリガー:**
- `client/` ディレクトリへの変更

**処理内容:**
1. Node.js 20で依存関係をインストール
2. Viteでクライアントをビルド
3. ビルド成果物をアップロード
4. 設定されたデプロイステップでホスティングサービスにデプロイ

**デプロイ先の設定:**
ワークフローファイル内のコメントアウトされたデプロイステップを有効化・設定してください：
- GitHub Pages
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps
- その他の静的ホスティングサービス

### deploy-server.yml
サーバー（バックエンド）のDockerイメージビルドとデプロイを行います。

**トリガー:**
- `server/`、`shared/`、`knowledge-base/` ディレクトリへの変更

**処理内容:**
1. Docker Buildxでマルチプラットフォームイメージをビルド
2. GitHub Container Registry（または設定したレジストリ）にプッシュ
3. 設定されたデプロイステップでコンテナホスティングサービスにデプロイ

**デプロイ先の設定:**
ワークフローファイル内のコメントアウトされたデプロイステップを有効化・設定してください：
- AWS ECS
- Azure Container Instances
- Google Cloud Run
- その他のコンテナホスティングサービス

### 既存のワークフロー

`furontend.yml` は既存のAzure Static Web Apps用ワークフローです。新しいデプロイ構成を使用する場合は、このファイルは無効化するか削除してください。

## 使用方法

1. **GitHub Secretsを設定**
   - リポジトリの Settings > Secrets and variables > Actions で必要なシークレットを設定
   - 詳細は `DEPLOYMENT.md` を参照

2. **ワークフローファイルをカスタマイズ**
   - デプロイ先に応じて、コメントアウトされたデプロイステップを有効化
   - 必要なパラメータを設定

3. **デプロイの実行**
   - `main` ブランチへのpushで自動的にトリガー
   - または、GitHub Actions画面から手動実行（workflow_dispatch）

## 環境変数

環境変数はGitHub Secretsで管理され、CI/CDパイプラインを通じてデプロイ先に設定されます。

詳細は `../DEPLOYMENT.md` を参照してください。

