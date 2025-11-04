# デプロイ準備完了 ✅

GitHub ActionsでAzure Static Web Apps（フロントエンド）とAzure App Service（バックエンド）にデプロイする準備が整いました。

## ✅ 実装済み機能

### ① フロントエンド・バックエンドのワークフロー

- **フロントエンド**: `.github/workflows/deploy-client-azure.yml`
  - クリーンビルド → ビルド → デプロイ
- **バックエンド**: `.github/workflows/deploy-server-azure.yml`
  - Docker化 → ビルド → プッシュ → デプロイ

### ② フロントエンド：クリーンビルド → デプロイ

✅ 実装済み
- 前回のビルド成果物（`dist/`, `node_modules/.vite`）を削除
- 依存関係をインストール
- 環境変数 `VITE_API_BASE_URL` をビルド時に埋め込み
- Azure Static Web Appsにデプロイ

### ③ バックエンド：Docker化 → デプロイ

✅ 実装済み
- Docker Buildxでイメージをビルド
- GitHub Container Registryにプッシュ
- Azure App ServiceにDockerコンテナとしてデプロイ

### ④ 環境変数の分離設定

✅ 実装済み

#### フロントエンド（Static Web Apps）
- **ビルド時に埋め込まれる**: `VITE_API_BASE_URL`
- GitHub Secretsから設定 → ビルド時にJavaScriptに埋め込まれる
- Azure Portalでの設定は不要

#### バックエンド（App Service）
- **実行時に設定される**: すべてのバックエンド環境変数
- GitHub Secretsから自動的にAzure App ServiceのConfigurationに設定
- ワークフローが自動的に設定

### ⑤ DBとBLOBの環境変数切り替え

✅ 環境変数で切り替わります

#### データベース（PostgreSQL）
- `DATABASE_URL` を設定 → PostgreSQLが使用される
- 設定しない → データベース機能は無効

#### Blob Storage（Azure Storage）
- `AZURE_STORAGE_CONNECTION_STRING` を設定 → Blob Storageが使用される
- 設定しない → ローカルファイルシステムを使用

#### 両方設定した場合
- 両方の機能が利用可能

## 🚀 デプロイ手順

### 1. GitHub Secretsの設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で設定：

**必須シークレット**:
```
AZURE_CREDENTIALS
AZURE_RESOURCE_GROUP
AZURE_APP_SERVICE_NAME (emergency-assistance-bfckhjejb3fbf9du)
AZURE_STATIC_WEB_APPS_API_TOKEN
DATABASE_URL
JWT_SECRET
SESSION_SECRET
FRONTEND_URL (https://witty-river-012f39e00.1.azurestaticapps.net)
```

**フロントエンド用**:
```
VITE_API_BASE_URL (/api または https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api)
```

**バックエンド用（オプション）**:
```
AZURE_STORAGE_CONNECTION_STRING (Blob Storageを使用する場合)
OPENAI_API_KEY (GPT機能を使用する場合)
```

詳細は [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) を参照。

### 2. ワークフローの実行

#### 自動実行
- `main` ブランチにプッシュすると自動実行
- フロントエンド: `client/` に変更があると実行
- バックエンド: `server/`, `shared/`, `knowledge-base/`, `Dockerfile` に変更があると実行

#### 手動実行
1. GitHubリポジトリの **Actions** タブ
2. 実行したいワークフローを選択
3. **Run workflow** をクリック

### 3. デプロイ確認

- **フロントエンド**: https://witty-river-012f39e00.1.azurestaticapps.net
- **バックエンド**: https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health

## 📚 ドキュメント

- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md) - 実行手順
- [GitHub Secrets設定ガイド](./GITHUB_SECRETS.md) - シークレット一覧
- [環境変数一覧](./ENVIRONMENT_VARIABLES.md) - 環境変数の詳細
- [クイックセットアップガイド](./QUICK_SETUP.md) - 既存リソース用

## 🔍 確認事項

### フロントエンド
- ✅ クリーンビルドが実行される
- ✅ ビルド時に環境変数が埋め込まれる
- ✅ Static Web Appsにデプロイされる

### バックエンド
- ✅ Dockerイメージがビルドされる
- ✅ GitHub Container Registryにプッシュされる
- ✅ 環境変数が自動設定される
- ✅ Dockerコンテナとしてデプロイされる

### 環境変数
- ✅ フロントエンドとバックエンドで分離されている
- ✅ DBとBLOBは環境変数で切り替わる

## 次のステップ

1. GitHub Secretsを設定
2. ワークフローを実行（手動または自動）
3. デプロイを確認
4. 動作確認

すべて準備完了です！🎉

