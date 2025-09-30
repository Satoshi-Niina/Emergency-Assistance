# Emergency Assistance - Docker開発環境

## 概要

このプロジェクトはDockerを使用して環境の違いを解決し、ローカルとAzure App Serviceで同じ環境を提供します。

## 開発環境のセットアップ

### 前提条件
- Docker Desktop
- Git

### ローカル開発

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd Emergency-Assistance
   ```

2. **Docker Composeで起動**
   ```bash
   docker-compose up -d
   ```

3. **ヘルスチェック**
   ```bash
   curl http://localhost:8080/api/health
   ```

4. **ログの確認**
   ```bash
   docker-compose logs -f backend
   ```

5. **停止**
   ```bash
   docker-compose down
   ```

### 開発ワークフロー

1. **コードを変更**
2. **Gitでコミット・プッシュ**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

3. **GitHub Actionsが自動的にデプロイ**
   - Dockerイメージをビルド
   - Azure Container Registryにプッシュ
   - Azure App Serviceにデプロイ

## デプロイメント

### 自動デプロイ
- `main`ブランチにプッシュすると自動的にデプロイされます
- Dockerイメージがビルドされ、Azure App Serviceにデプロイされます

### 手動デプロイ
- GitHub Actionsの「Run workflow」ボタンを使用

## トラブルシューティング

### ローカル環境
```bash
# コンテナの状態確認
docker-compose ps

# ログの確認
docker-compose logs backend

# コンテナの再起動
docker-compose restart backend

# 完全な再構築
docker-compose down
docker-compose up --build
```

### Azure環境
- Azure PortalでApp Serviceのログを確認
- GitHub Actionsのログを確認

## 環境の違い

### 従来の問題
- Windows（ローカル）vs Linux（Azure）
- 依存関係の違い
- 設定の複雑さ

### Dockerによる解決
- ローカルもAzureも同じLinux環境
- 依存関係の固定
- 設定の統一

## ファイル構成

```
├── Dockerfile              # Dockerイメージの定義
├── docker-compose.yml      # ローカル開発用
├── .dockerignore           # Docker用の除外ファイル
├── .github/workflows/
│   ├── backend-docker.yml  # Docker用デプロイ
│   └── backend.yml         # 従来のデプロイ（バックアップ）
└── server/
    ├── azure-server.js     # Azure専用サーバー
    └── azure-package.json  # Azure専用依存関係
```
