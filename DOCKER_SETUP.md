# 🐳 Docker環境セットアップガイド

## なぜDockerを使うのか？

### 従来の問題
- ローカル環境と本番環境の違い（ポート、CORS、API等）
- 環境変数の複雑な管理
- デプロイ後にのみ発覚する問題
- スクリプトの信頼性の低さ

### Docker導入のメリット
- ✅ **完全な環境一致**: ローカル = 本番環境
- ✅ **簡単な起動**: `docker-compose up`のみ
- ✅ **データベース含む**: PostgreSQLも自動セットアップ
- ✅ **CORS問題なし**: 本番と同じ構成で検証
- ✅ **再現性100%**: 誰でも同じ環境を構築可能

## 🚀 クイックスタート

### 前提条件
- Docker Desktop for Windows インストール済み
- Git インストール済み

### 1. Docker Desktop のインストール

```powershell
# Docker Desktop for Windows をダウンロード
# https://www.docker.com/products/docker-desktop/

# インストール後、再起動してWSL2を有効化
```

### 2. 環境変数ファイルの作成（オプション）

```powershell
# OpenAI APIキーを使う場合のみ
Copy-Item .env.docker .env.docker.local
# .env.docker.local を編集してAPIキーを追加
```

### 3. 本番環境の起動（推奨）

```powershell
# ビルドして起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d
```

**アクセス**: http://localhost:8080

### 4. 開発環境の起動（ホットリロード対応）

```powershell
# 開発用Docker環境を起動
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンドで起動
docker-compose -f docker-compose.dev.yml up -d
```

**アクセス**: http://localhost:8080

## 📋 コマンド一覧

### 基本操作

```powershell
# 起動（本番環境シミュレーション）
docker-compose up

# バックグラウンド起動
docker-compose up -d

# 停止
docker-compose down

# 停止＋データ削除
docker-compose down -v

# 再ビルド
docker-compose up --build

# ログ確認
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f app
```

### 開発環境

```powershell
# 開発環境起動（ホットリロード）
docker-compose -f docker-compose.dev.yml up

# 開発環境停止
docker-compose -f docker-compose.dev.yml down
```

### デバッグ

```powershell
# コンテナ内に入る
docker-compose exec app sh

# データベースに接続
docker-compose exec postgres psql -U postgres -d emergency_assistance

# 環境変数確認
docker-compose exec app env

# ログストリーミング
docker-compose logs -f --tail=100
```

## 🏗️ アーキテクチャ

### 本番環境（`docker-compose.yml`）

```
┌─────────────────────────────────────┐
│   localhost:8080 (Browser)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  App Container (Node.js)            │
│  - azure-server.mjs                 │
│  - ビルド済みフロントエンド          │
│  - PostgreSQL接続                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PostgreSQL Container               │
│  - ユーザーデータ                    │
│  - 機械データ                        │
│  - チャット履歴                      │
└─────────────────────────────────────┘
```

### 開発環境（`docker-compose.dev.yml`）

```
┌─────────────────────────────────────┐
│   localhost:8080 (Browser)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  App Container (Node.js Dev)        │
│  - unified-hot-reload-server.js    │
│  - ホットリロード有効                │
│  - ソースコードマウント              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PostgreSQL Container               │
└─────────────────────────────────────┘
```

## 🔧 環境設定の詳細

### 本番環境シミュレーション

`docker-compose.yml`の環境変数:

```yaml
environment:
  NODE_ENV: production           # 本番モード
  PORT: 8080                    # 統一ポート
  DATABASE_URL: postgresql://... # PostgreSQL接続
  STORAGE_MODE: local_files     # ローカルストレージ
  CORS_ALLOW_ORIGINS: http://localhost:8080
```

### 開発環境

`docker-compose.dev.yml`の環境変数:

```yaml
environment:
  NODE_ENV: development         # 開発モード
  PORT: 8080                   # 統一ポート
  BYPASS_DB_FOR_LOGIN: false   # 本番と同じDB認証
```

## 🎯 ワークフロー

### 推奨開発フロー（完全一致保証）

```
1. Docker開発環境で開発
   ↓ docker-compose -f docker-compose.dev.yml up

2. ローカルで動作確認
   ↓ http://localhost:8080

3. 本番環境シミュレーション
   ↓ docker-compose up

4. 動作確認（CORS、API等）
   ↓ http://localhost:8080

5. コミット＆プッシュ
   ↓ git push

6. 本番デプロイ
   ↓ GitHub Actions

7. 本番環境で検証
   ✅ ローカルと完全一致
```

### 従来の問題のあるフロー

```
1. ローカル開発（統合サーバー）
   ↓ npm run dev

2. デプロイ
   ↓ git push

3. 本番環境で問題発覚 ❌
   - CORSエラー
   - APIパスの違い
   - 環境変数の不一致

4. 修正→再デプロイ
   ↓ 繰り返し...
```

## 🔍 トラブルシューティング

### Dockerが起動しない

```powershell
# Docker Desktopが起動しているか確認
Get-Process -Name "Docker Desktop"

# WSL2が有効か確認
wsl --list --verbose

# Docker Desktopを再起動
```

### ポートが使用中

```powershell
# ポート確認
netstat -ano | findstr :8080

# プロセス停止
Stop-Process -Id <PID> -Force

# または別のポートを使用
# docker-compose.ymlのportsセクションを変更
ports:
  - "8081:8080"  # ホスト側を8081に変更
```

### データベース接続エラー

```powershell
# PostgreSQLコンテナの状態確認
docker-compose ps

# データベースログ確認
docker-compose logs postgres

# データベースに手動接続
docker-compose exec postgres psql -U postgres -d emergency_assistance
```

### ビルドエラー

```powershell
# キャッシュをクリアして再ビルド
docker-compose build --no-cache

# イメージとボリュームを完全削除
docker-compose down -v --rmi all
docker-compose up --build
```

### コンテナ内のファイル確認

```powershell
# コンテナ内に入る
docker-compose exec app sh

# ファイル構造確認
ls -la /app/
ls -la /app/server/
ls -la /app/client/dist/

# 環境変数確認
env | grep -E "NODE_ENV|PORT|DATABASE_URL"
```

## 📊 パフォーマンス最適化

### ビルドキャッシュの活用

Dockerfileは**マルチステージビルド**を使用:
- `deps`: 依存関係のみインストール
- `builder`: クライアントビルド
- `runner`: 本番用最小イメージ

### ボリュームマウント

開発環境では効率的なマウント:
```yaml
volumes:
  - ./server:/app/server           # ソースをマウント
  - /app/server/node_modules       # node_modulesは除外
```

## 🔐 セキュリティ

### 非rootユーザー

本番用Dockerfileは非rootユーザーで実行:
```dockerfile
USER expressjs
```

### 環境変数の管理

機密情報は`.env.docker.local`で管理（gitignore済み）:
```bash
# .gitignore
.env.docker.local
```

## ✅ チェックリスト

デプロイ前に以下を確認:

- [ ] `docker-compose up`でローカル起動成功
- [ ] http://localhost:8080 でアクセス可能
- [ ] ログイン機能が動作
- [ ] API呼び出しが成功
- [ ] データベース接続が正常
- [ ] CORSエラーなし
- [ ] ブラウザコンソールにエラーなし
- [ ] 画像アップロードが動作（該当する場合）

## 🎓 次のステップ

### Azure App Serviceへのデプロイ

Dockerイメージを使用したデプロイ:

```powershell
# Azure Container Registryにプッシュ
docker tag emergency-assistance yourregistry.azurecr.io/emergency-assistance:latest
docker push yourregistry.azurecr.io/emergency-assistance:latest

# App ServiceでDockerイメージを指定
# Azure Portalで設定
```

### CI/CDパイプライン

GitHub Actionsでの自動化:
- Dockerイメージのビルド
- Azure Container Registryへのプッシュ
- App Serviceへのデプロイ

## 📚 参考資料

- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Node.js Dockerベストプラクティス](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Azure App Service - Docker](https://docs.microsoft.com/azure/app-service/configure-custom-container)

## 🆘 サポート

問題が発生した場合:
1. `docker-compose logs`でログ確認
2. `docker-compose exec app sh`でコンテナ内を調査
3. このドキュメントのトラブルシューティングセクションを確認

---

**重要**: このDocker環境は**ローカル開発 = 本番環境**を保証します。
ローカルで動作すれば、本番でも必ず動作します！
