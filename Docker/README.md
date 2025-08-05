# 🐳 Emergency Assistance System - Docker

このリポジトリは、Emergency Assistance SystemのDocker化されたバージョンです。

## 📋 概要

Emergency Assistance SystemをDockerコンテナで簡単に実行できるようにしたものです。以下のサービスが含まれています：

- **PostgreSQL**: データベース
- **Backend**: Express.js API サーバー
- **Frontend**: React + Vite アプリケーション

## 🚀 クイックスタート

### 前提条件

- Docker
- Docker Compose
- Git

### 1. リポジトリのクローン

```bash
git clone <docker-repository-url>
cd Emergency-Assistance-Docker
```

### 2. 環境変数の設定

```bash
# 環境変数ファイルの作成
cp env.example .env

# 環境変数の編集
# 必要な設定を.envファイルに記入
```

### 3. アプリケーションの起動

```bash
# すべてのサービスを起動
docker-compose up -d

# ログの確認
docker-compose logs -f
```

### 4. アクセス

- **フロントエンド**: http://localhost:5002
- **バックエンド**: http://localhost:3001
- **データベース**: localhost:5432

## 📁 ファイル構成

```
Emergency-Assistance-Docker/
├── docker-compose.yml          # メインのDocker Compose設定
├── docker-compose.dev.yml      # 開発環境用設定
├── docker-compose.prod.yml     # 本番環境用設定
├── Dockerfile                  # バックエンド用Dockerfile
├── Dockerfile.client           # フロントエンド用Dockerfile
├── Dockerfile.dev              # 開発環境用Dockerfile
├── nginx/                      # Nginx設定
│   ├── nginx.conf
│   └── default.conf
├── scripts/                    # 便利なスクリプト
│   ├── setup.sh
│   ├── setup.bat
│   ├── backup.sh
│   └── restore.sh
├── data/                       # データ永続化
│   └── postgres/
├── logs/                       # ログファイル
├── env.example                 # 環境変数テンプレート
└── README.md                   # このファイル
```

## 🔧 環境設定

### 開発環境

```bash
# 開発環境で起動（ホットリロード有効）
docker-compose -f docker-compose.dev.yml up -d
```

### 本番環境

```bash
# 本番環境で起動
docker-compose -f docker-compose.prod.yml up -d
```

### カスタム設定

```bash
# カスタム設定で起動
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

## 🛠️ 管理コマンド

### サービスの管理

```bash
# サービスの起動
docker-compose up -d

# サービスの停止
docker-compose down

# サービスの再起動
docker-compose restart

# 特定のサービスの再起動
docker-compose restart server
```

### ログの確認

```bash
# すべてのログ
docker-compose logs

# 特定のサービスのログ
docker-compose logs server
docker-compose logs client
docker-compose logs postgres

# リアルタイムログ
docker-compose logs -f
```

### データベースの管理

```bash
# データベースに接続
docker-compose exec postgres psql -U postgres -d emergency_assistance

# マイグレーションの実行
docker-compose exec server npm run db:migrate

# バックアップの作成
./scripts/backup.sh

# バックアップの復元
./scripts/restore.sh backup_file.sql
```

### コンテナの管理

```bash
# コンテナの状態確認
docker-compose ps

# コンテナの詳細情報
docker-compose top

# コンテナ内でコマンド実行
docker-compose exec server npm run db:studio
docker-compose exec client npm run build
```

## 🔍 トラブルシューティング

### よくある問題

#### 1. ポートが使用中

```bash
# ポートの使用状況確認
netstat -tulpn | grep :3001
netstat -tulpn | grep :5002
netstat -tulpn | grep :5432

# 使用中のプロセスを終了
sudo kill -9 <PID>
```

#### 2. データベース接続エラー

```bash
# データベースの状態確認
docker-compose exec postgres pg_isready -U postgres

# データベースのログ確認
docker-compose logs postgres
```

#### 3. ビルドエラー

```bash
# イメージの再ビルド
docker-compose build --no-cache

# 特定のサービスの再ビルド
docker-compose build --no-cache server
```

#### 4. ボリュームの問題

```bash
# ボリュームの確認
docker volume ls

# ボリュームの削除（データが失われます）
docker-compose down -v
```

### ログの確認

```bash
# 詳細なログ
docker-compose logs --tail=100 -f

# エラーログのみ
docker-compose logs --tail=100 | grep ERROR
```

## 📊 監視とメトリクス

### リソース使用量の確認

```bash
# コンテナのリソース使用量
docker stats

# 特定のコンテナのリソース使用量
docker stats server client postgres
```

### ヘルスチェック

```bash
# ヘルスチェックの実行
curl http://localhost:3001/api/health
curl http://localhost:5002
```

## 🔒 セキュリティ

### 本番環境での設定

1. **環境変数の暗号化**
2. **ネットワークの分離**
3. **セキュリティスキャン**
4. **定期的なアップデート**

### セキュリティベストプラクティス

```bash
# セキュリティスキャン
docker scan emergency-assistance

# 不要なイメージの削除
docker image prune -a

# 未使用のボリュームの削除
docker volume prune
```

## 📈 スケーリング

### 水平スケーリング

```bash
# サービスのスケール
docker-compose up -d --scale server=3

# ロードバランサーの設定
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### 垂直スケーリング

```bash
# リソース制限の設定
docker-compose -f docker-compose.yml -f docker-compose.resources.yml up -d
```

## 🚀 デプロイ

### 本番環境へのデプロイ

```bash
# 本番環境用のビルド
docker-compose -f docker-compose.prod.yml build

# 本番環境へのデプロイ
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD パイプライン

```yaml
# .github/workflows/docker-deploy.yml
name: Docker Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        run: |
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
```

## 📞 サポート

問題が発生した場合：

1. **ログの確認**: `docker-compose logs`
2. **Issue の作成**: GitHub Issues で報告
3. **ドキュメントの確認**: このREADMEと関連ドキュメント

## 📄 ライセンス

MIT License - 詳細はLICENSEファイルを参照してください。

---

**Happy Docker! 🐳** 