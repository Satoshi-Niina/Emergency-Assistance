# デプロイメントガイド

このプロジェクトは、GitHub Actionsを使用してCI/CDパイプラインで本番環境にデプロイできます。

## 概要

- **Client**: GitHub Actionsでビルドし、静的ホスティングにデプロイ
- **Server**: Dockerコンテナ化し、コンテナホスティングサービスにデプロイ
- **環境変数**: GitHub Secretsで管理し、CI/CDパイプラインで設定

## 前提条件

1. GitHubリポジトリへのアクセス権限
2. デプロイ先のホスティングサービスアカウント
3. Dockerレジストリへのアクセス権限（サーバー用）

## セットアップ手順

### 1. GitHub Secretsの設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください。

#### 必須環境変数（Server）

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | JWT署名用シークレット（32文字以上） | `your-super-secret-jwt-key-min-32-chars` |
| `SESSION_SECRET` | セッション管理用シークレット（32文字以上） | `your-super-secret-session-key-min-32-chars` |
| `OPENAI_API_KEY` | OpenAI APIキー（オプション） | `sk-...` |

#### オプション環境変数（Server）

| Secret名 | 説明 | デフォルト値 |
|---------|------|------------|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | サーバーポート | `8080` |
| `CORS_ALLOW_ORIGINS` | CORS許可オリジン（カンマ区切り） | `*` |
| `PG_SSL` | PostgreSQL SSL設定 | `require` |
| `FRONTEND_URL` | フロントエンドURL | `http://localhost:5173` |

#### Client用環境変数

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `VITE_API_BASE_URL` | APIベースURL | `/api` または `https://api.example.com` |

#### デプロイ先サービス用の認証情報

デプロイ先に応じて追加のシークレットが必要です：

**AWS**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME` (Client用)
- `CLOUDFRONT_DISTRIBUTION_ID` (Client用)
- `ECS_CLUSTER_NAME` (Server用)
- `ECS_SERVICE_NAME` (Server用)

**Azure**
- `AZURE_CREDENTIALS`
- `AZURE_RESOURCE_GROUP`

**Google Cloud**
- `GCP_SA_KEY`
- `GCP_REGION`

**Docker Registry**
- `DOCKER_USERNAME` (Docker Hub用)
- `DOCKER_PASSWORD` (Docker Hub用)

### 2. ワークフローの設定

#### Clientデプロイ

`.github/workflows/deploy-client.yml` ファイル内のデプロイステップを、使用するホスティングサービスに応じて有効化・設定してください。

例：GitHub Pagesを使用する場合

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./client/dist
```

#### Serverデプロイ

`.github/workflows/deploy-server.yml` ファイル内のデプロイステップを、使用するコンテナホスティングサービスに応じて有効化・設定してください。

例：AWS ECSを使用する場合

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}

- name: Deploy to ECS
  run: |
    aws ecs update-service \
      --cluster ${{ secrets.ECS_CLUSTER_NAME }} \
      --service ${{ secrets.ECS_SERVICE_NAME }} \
      --force-new-deployment \
      --region ${{ secrets.AWS_REGION }}
```

### 3. 環境変数の設定方法

デプロイ先のサービスで環境変数を設定する必要があります。設定方法はサービスによって異なります：

**AWS ECS**
- ECSタスク定義で環境変数を設定
- または、`aws ecs update-service` コマンドで設定

**Azure Container Instances**
- `az container create` コマンドの `--environment-variables` オプションで設定
- または、Azure Portalから設定

**Google Cloud Run**
- `gcloud run deploy` コマンドの `--set-env-vars` オプションで設定
- または、`--set-secrets` でSecret Managerから読み込み

**Docker Compose**
```yaml
environment:
  - DATABASE_URL=${DATABASE_URL}
  - JWT_SECRET=${JWT_SECRET}
  - SESSION_SECRET=${SESSION_SECRET}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

## デプロイメントフロー

### Clientデプロイ

1. `client/` ディレクトリに変更があると自動的にトリガー
2. Node.js 20で依存関係をインストール
3. Viteでクライアントをビルド（`npm run build`）
4. ビルド成果物をアップロード
5. 設定されたデプロイステップでホスティングサービスにデプロイ

### Serverデプロイ

1. `server/`、`shared/`、`knowledge-base/` に変更があると自動的にトリガー
2. Docker Buildxでマルチプラットフォームイメージをビルド
3. GitHub Container Registry（または設定したレジストリ）にプッシュ
4. 設定されたデプロイステップでコンテナホスティングサービスにデプロイ
5. 環境変数はシークレットから自動的に設定

## ローカルテスト

### Dockerイメージのビルドとテスト

```bash
# イメージをビルド
docker build -t emergency-assistance-server -f server/Dockerfile .

# 環境変数を設定して実行
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret-key" \
  -e SESSION_SECRET="your-session-secret" \
  -e OPENAI_API_KEY="sk-..." \
  emergency-assistance-server
```

### Clientビルドのテスト

```bash
cd client
npm ci
npm run build
```

ビルド成果物は `client/dist` または `server/public` に生成されます。

## トラブルシューティング

### ビルドエラー

- Node.jsのバージョンが20以上であることを確認
- 依存関係が正しくインストールされているか確認
- GitHub Actionsのログを確認

### デプロイエラー

- GitHub Secretsが正しく設定されているか確認
- デプロイ先サービスの認証情報が正しいか確認
- ネットワーク設定（ファイアウォール、セキュリティグループなど）を確認

### 環境変数エラー

- 必須環境変数がすべて設定されているか確認
- 環境変数の値が正しいフォーマットか確認（特に `DATABASE_URL`）
- シークレットの値に改行や特殊文字が含まれていないか確認

## セキュリティベストプラクティス

1. **シークレット管理**
   - 本番環境のシークレットは強力なパスワードを使用
   - 定期的にローテーション
   - GitHub Secretsに直接コミットしない

2. **Dockerイメージ**
   - 非rootユーザーで実行（既に実装済み）
   - 最新のセキュリティパッチを適用
   - 不要なパッケージを含めない

3. **ネットワーク**
   - HTTPSを使用
   - CORS設定を適切に制限
   - ファイアウォールルールを適切に設定

## 参考リンク

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Docker ベストプラクティス](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js 本番環境ガイド](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

