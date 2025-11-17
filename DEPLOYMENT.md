# Emergency Assistance - デプロイガイド

## 🎯 デプロイアーキテクチャ

### 完全分離デプロイ構成

```
┌─────────────────────────────────────────────────────┐
│             GitHub Repository (main)                 │
│  - Client (React/Vite)                              │
│  - Server (Node.js/Express)                         │
│  - Docker Configuration                              │
└──────────────┬──────────────────────────────────────┘
               │ git push
               ├─────────────────┬─────────────────────┐
               ▼                 ▼                     ▼
┌──────────────────────┐  ┌──────────────┐  ┌────────────────┐
│ GitHub Actions       │  │ GitHub       │  │ GitHub         │
│ (Client Deploy)      │  │ Actions      │  │ Actions        │
│ - Build React        │  │ (Docker)     │  │ (Server)       │
│ - Deploy to SWA      │  │ - Build img  │  │ - Deploy ACR   │
└──────────┬───────────┘  └──────┬───────┘  └────────┬───────┘
           │                     │                   │
           ▼                     ▼                   ▼
┌──────────────────────┐  ┌──────────────┐  ┌────────────────┐
│ Azure Static Web Apps│  │ Azure        │  │ Azure App      │
│ - React Frontend     │  │ Container    │  │ Service        │
│ - CDN配信            │  │ Registry     │  │ (Docker)       │
│ witty-river-*.net    │  │ - Image保存  │  │ - Container実行│
└──────────┬───────────┘  └──────────────┘  └────────┬───────┘
           │                                          │
           └────────── API calls ────────────────────┘
              https://.../api/*
```

## 📋 デプロイ方法

### 1. クライアント（Frontend）のデプロイ

**自動デプロイ**: `client/**` の変更をpushすると自動的にデプロイ

```bash
# クライアントの変更をコミット
git add client/
git commit -m "feat: update client feature"
git push origin main

# GitHub Actions が自動実行
# → Azure Static Web Apps にデプロイ
```

**手動デプロイ**:
```bash
# GitHub Actions の Manual trigger
# Repository → Actions → "Deploy Client" → Run workflow
```

**ワークフロー**: `.github/workflows/cliente-azure.yml`

**デプロイ先**:
- Production: `https://witty-river-012f39e00.1.azurestaticapps.net`
- Staging: `https://staging.witty-river-012f39e00.1.azurestaticapps.net`

### 2. サーバー（Backend）のデプロイ - Docker版

**自動デプロイ**: `server/**` または `Dockerfile` の変更をpushすると自動的にデプロイ

```bash
# サーバーの変更をコミット
git add server/ Dockerfile
git commit -m "feat: update server API"
git push origin main

# GitHub Actions が自動実行
# → Docker イメージをビルド
# → Azure Container Registry にプッシュ
# → Azure App Service にデプロイ
```

**手動デプロイ**:
```bash
# GitHub Actions の Manual trigger
# Repository → Actions → "Deploy Server (Docker)" → Run workflow
```

**ワークフロー**: `.github/workflows/azure-docker-deploy.yml`

**デプロイフロー**:
1. Dockerイメージをビルド
2. Azure Container Registry にプッシュ
3. Azure App Service が新しいイメージをプル
4. コンテナを起動

**デプロイ先**:
- Production: `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net`

## 🔧 必要なGitHub Secrets

### クライアント用
```yaml
AZURE_STATIC_WEB_APPS_API_TOKEN: <your-static-web-apps-token>
AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING: <your-staging-token> # Optional
```

### サーバー用（Docker）
```yaml
# Azure Container Registry
ACR_LOGIN_SERVER: emergencyassistanceacr.azurecr.io
ACR_USERNAME: <your-acr-username>
ACR_PASSWORD: <your-acr-password>

# Azure App Service
AZURE_WEBAPP_PUBLISH_PROFILE: <your-publish-profile>
AZURE_CREDENTIALS: <your-service-principal-json>
AZURE_RESOURCE_GROUP: <your-resource-group>

# Application Secrets
DATABASE_URL: postgresql://...
SESSION_SECRET: <32-char-secret>
JWT_SECRET: <32-char-secret>
OPENAI_API_KEY: sk-...
AZURE_STORAGE_CONNECTION_STRING: DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME: knowledge
```

## 🚀 ローカル開発とデプロイのワークフロー

### 推奨ワークフロー

```bash
# 1. Docker開発環境で開発
.\start-docker.ps1
# メニューで「2」を選択（開発環境）
# http://localhost:8080 でアクセス

# 2. コード変更（ホットリロードで自動反映）
# ... 開発作業 ...

# 3. 本番環境シミュレーション
.\start-docker.ps1
# メニューで「1」を選択（本番シミュレーション）
# http://localhost:8080 で動作確認

# 4. 問題なければコミット＆プッシュ
git add .
git commit -m "feat: new feature"
git push origin main

# 5. 自動デプロイ
# → GitHub Actions が自動実行
# → クライアント: Static Web Apps へ
# → サーバー: Docker コンテナで App Service へ

# 6. 本番環境で動作確認
# https://witty-river-012f39e00.1.azurestaticapps.net
```

## 📊 デプロイの比較

### 従来の方法（廃止）

| 問題点 | 説明 |
|--------|------|
| ❌ 環境の不一致 | ローカルと本番で動作が異なる |
| ❌ 複雑なスクリプト | test-production-locally.ps1 等のスクリプトが必要 |
| ❌ CORSエラー | デプロイ後にしか発見できない |
| ❌ デバッグ困難 | 本番環境での問題を再現しにくい |

### Docker方式（現在）

| メリット | 説明 |
|---------|------|
| ✅ 環境の完全一致 | ローカル = 本番を保証 |
| ✅ シンプル | `.\start-docker.ps1` だけで本番環境を再現 |
| ✅ 事前検証 | デプロイ前にすべての問題を発見 |
| ✅ 確実性 | ローカルで動作 = 本番でも動作 |

## 🔍 デプロイ後の確認

### クライアント

```bash
# ヘルスチェック
curl https://witty-river-012f39e00.1.azurestaticapps.net

# 主要機能確認
# 1. ブラウザでアクセス
# 2. ログイン機能
# 3. API通信
```

### サーバー

```bash
# ヘルスチェック
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/health

# API確認
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/ping

# 詳細情報
curl https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health/detailed
```

## 🆘 トラブルシューティング

### クライアントデプロイが失敗する

```bash
# ログ確認
# GitHub Actions → Cliente-azure workflow → 失敗したジョブ

# 解決方法
1. ビルドエラーを確認
2. 依存関係を確認: npm ci
3. Secrets が設定されているか確認
```

### サーバーデプロイが失敗する

```bash
# Docker ビルドエラー
1. Dockerfile の構文を確認
2. ローカルでビルドテスト: docker build .

# Azure デプロイエラー
1. ACR認証情報を確認
2. App Service設定を確認
3. 環境変数を確認

# コンテナ起動エラー
1. Azure Portal → App Service → ログを確認
2. Container Settings を確認
3. 環境変数 WEBSITES_PORT=8080 を確認
```

### ローカルと本番で動作が異なる

```bash
# Docker本番シミュレーションで再現
.\start-docker.ps1  # → 「1」を選択

# 本番環境と同じ構成で動作確認
# 問題が再現したら修正 → 再テスト
```

## 📚 関連ドキュメント

- [Docker環境セットアップ](DOCKER_SETUP.md)
- [Docker クイックリファレンス](DOCKER_QUICKREF.md)
- [開発環境セットアップ](DEVELOPMENT_SETUP.md)
- [Azure Docker デプロイ詳細](docs/AZURE_DOCKER_DEPLOYMENT.md)

## ✅ デプロイチェックリスト

### デプロイ前

- [ ] ローカルDockerで動作確認
- [ ] 本番環境シミュレーションでテスト
- [ ] CORSエラーなし
- [ ] APIが正常に動作
- [ ] データベース接続が正常
- [ ] GitHub Secrets が設定済み

### デプロイ後

- [ ] クライアントが表示される
- [ ] サーバーヘルスチェックが成功
- [ ] ログインが動作
- [ ] API呼び出しが成功
- [ ] CORSエラーなし
- [ ] 主要機能が動作

---

**重要**: Docker環境を使用することで、**ローカルで動作確認 = 本番でも確実に動作**が保証されます！
