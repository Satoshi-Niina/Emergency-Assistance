# 開発者向けセットアップガイド

## バックエンド開発者向け

### 必要な準備
1. **Docker Desktopのインストール**
   - [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - [Docker Desktop for Linux](https://docs.docker.com/desktop/install/linux-install/)

2. **Gitの最新版**
   - 既存のGitを使用

### セットアップ手順
```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd Emergency-Assistance

# 2. Docker Composeでバックエンドを起動
docker-compose up -d backend

# 3. ヘルスチェック
curl http://localhost:8080/api/health

# 4. ログの確認
docker-compose logs -f backend
```

### 開発ワークフロー
```bash
# バックエンドの開発
docker-compose up -d backend

# コードを編集
# ... ファイルを編集 ...

# 変更をコミット・プッシュ
git add .
git commit -m "Backend changes"
git push origin main

# GitHub Actionsが自動的にDockerイメージをビルド・デプロイ
```

## フロントエンド開発者向け

### 必要な準備
- **変更なし**: 従来通りの環境

### セットアップ手順
```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd Emergency-Assistance

# 2. フロントエンドの依存関係をインストール
cd client
npm install

# 3. 開発サーバーを起動
npm run dev
```

### 開発ワークフロー
```bash
# フロントエンドの開発（従来通り）
cd client
npm run dev

# コードを編集
# ... ファイルを編集 ...

# 変更をコミット・プッシュ
git add .
git commit -m "Frontend changes"
git push origin main

# GitHub Actionsが自動的にフロントエンドをデプロイ
```

## フルスタック開発者向け

### 必要な準備
1. **Docker Desktopのインストール**
2. **Node.js + npm**（フロントエンド用）

### セットアップ手順
```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd Emergency-Assistance

# 2. バックエンドをDockerで起動
docker-compose up -d backend

# 3. フロントエンドの依存関係をインストール
cd client
npm install

# 4. フロントエンドの開発サーバーを起動
npm run dev
```

### 開発ワークフロー
```bash
# バックエンドとフロントエンドを同時に開発
docker-compose up -d backend
cd client && npm run dev

# コードを編集
# ... ファイルを編集 ...

# 変更をコミット・プッシュ
git add .
git commit -m "Full-stack changes"
git push origin main

# GitHub Actionsが自動的に両方をデプロイ
```

## トラブルシューティング

### Docker関連
```bash
# Dockerの状態確認
docker-compose ps

# ログの確認
docker-compose logs backend

# コンテナの再起動
docker-compose restart backend

# 完全な再構築
docker-compose down
docker-compose up --build
```

### フロントエンド関連
```bash
# 依存関係の再インストール
cd client
rm -rf node_modules package-lock.json
npm install

# 開発サーバーの再起動
npm run dev
```
