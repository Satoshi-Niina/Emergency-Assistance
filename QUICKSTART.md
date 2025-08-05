# 🚀 Quick Start Guide

このガイドでは、Emergency Assistance Systemを素早くセットアップする方法を説明します。

## 📋 前提条件

以下のソフトウェアがインストールされていることを確認してください：

- **Node.js** 18.0.0 以上
- **npm** 8.0.0 以上
- **Git**
- **PostgreSQL** 12 以上（または Docker）

## ⚡ 5分でセットアップ

### 1. リポジトリのクローン

```bash
git clone <your-repository-url>
cd Emergency-Assistance
```

### 2. 自動セットアップスクリプトの実行

#### Windows の場合
```bash
setup.bat
```

#### macOS/Linux の場合
```bash
chmod +x setup.sh
./setup.sh
```

### 3. 環境変数の設定

`.env` ファイルを編集して、必要な設定を行います：

```env
# データベース接続（必須）
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance

# セッションシークレット（必須）
SESSION_SECRET=your-random-secret-key

# OpenAI API キー（AI機能を使用する場合）
OPENAI_API_KEY=your-openai-api-key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5002 を開いてアプリケーションにアクセスできます。

## 🐳 Docker を使用したセットアップ

### 1. Docker Compose での起動

```bash
# 環境変数ファイルの作成
cp env.example .env

# アプリケーションの起動
docker-compose up -d
```

### 2. アクセス

- **フロントエンド**: http://localhost:5002
- **バックエンド**: http://localhost:3001
- **データベース**: localhost:5432

## 🔧 手動セットアップ

### 1. 依存関係のインストール

```bash
npm run install:all
```

### 2. データベースの準備

#### PostgreSQL のインストール

**macOS (Homebrew)**:
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:
- [PostgreSQL 公式サイト](https://www.postgresql.org/download/windows/) からダウンロード

#### データベースの作成

```bash
# PostgreSQL に接続
psql -U postgres

# データベースの作成
CREATE DATABASE emergency_assistance;

# ユーザーの作成（オプション）
CREATE USER emergency_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE emergency_assistance TO emergency_user;

# 終了
\q
```

### 3. マイグレーションの実行

```bash
npm run db:migrate
```

### 4. 初期データの投入（オプション）

```bash
npm run db:seed
```

## 🧪 テストの実行

```bash
# すべてのテストを実行
npm run test

# フロントエンドのテストのみ
npm run test:client

# バックエンドのテストのみ
npm run test:server
```

## 📊 データベースの管理

### Drizzle Studio の起動

```bash
npm run db:studio
```

ブラウザで http://localhost:4983 を開いてデータベースを管理できます。

### マイグレーションの管理

```bash
# 新しいマイグレーションの生成
npm run db:generate

# マイグレーションの適用
npm run db:migrate
```

## 🔍 トラブルシューティング

### よくある問題

#### 1. Node.js のバージョンエラー

```bash
# Node.js のバージョン確認
node --version

# nvm を使用して Node.js 18 をインストール
nvm install 18
nvm use 18
```

#### 2. データベース接続エラー

```bash
# PostgreSQL の状態確認
sudo systemctl status postgresql

# 接続テスト
psql -U postgres -d emergency_assistance -c "SELECT 1;"
```

#### 3. ポートが使用中

```bash
# ポートの使用状況確認
lsof -i :3001
lsof -i :5002

# プロセスの終了
kill -9 <PID>
```

#### 4. 依存関係のエラー

```bash
# node_modules の削除と再インストール
npm run clean
npm run install:all
```

### ログの確認

```bash
# 開発サーバーのログ
npm run dev 2>&1 | tee dev.log

# 特定のサービスのログ
cd server && npm run dev
cd client && npm run dev
```

## 📚 次のステップ

### 1. アプリケーションの理解

- [README.md](./README.md) - プロジェクトの概要
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - デプロイ方法
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API仕様

### 2. 開発の開始

```bash
# 開発ブランチの作成
git checkout -b feature/your-feature-name

# コードの変更
# ...

# コミットとプッシュ
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

### 3. 貢献

1. Issue を作成して機能やバグを報告
2. Pull Request を作成してコードを貢献
3. コードレビューに参加

## 🆘 サポート

問題が発生した場合：

1. **ドキュメントを確認**: このガイドと README.md
2. **Issue を検索**: GitHub Issues で類似の問題を探す
3. **新しい Issue を作成**: 詳細な情報とログを添付
4. **コミュニティに相談**: 開発者フォーラムやチャット

## 📞 連絡先

- **GitHub Issues**: バグ報告や機能要求
- **Email**: 開発チームへの直接連絡
- **Slack**: リアルタイムサポート

---

**Happy Coding! 🚀** 