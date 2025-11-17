# 🐳 Docker環境 - クイックリファレンス

## 🚀 最速スタート

### 推奨方法（対話型メニュー）
```powershell
.\start-docker.ps1
```

メニューから選択:
- `1`: 本番環境シミュレーション
- `2`: 開発環境（ホットリロード）
- `3`: 停止
- `4`: 完全クリーンアップ

### NPMコマンド

```bash
# 本番環境シミュレーション
npm run docker:prod           # フォアグラウンド起動
npm run docker:prod:detach    # バックグラウンド起動

# 開発環境（ホットリロード）
npm run docker:dev            # フォアグラウンド起動
npm run docker:dev:detach     # バックグラウンド起動

# 停止
npm run docker:stop

# 完全クリーンアップ
npm run docker:clean

# ログ確認
npm run docker:logs           # 本番環境
npm run docker:logs:dev       # 開発環境
```

### 直接Dockerコマンド

```bash
# 本番環境
docker-compose up                    # フォアグラウンド
docker-compose up -d                 # バックグラウンド
docker-compose down                  # 停止
docker-compose logs -f               # ログ

# 開発環境
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
```

## 📊 比較表

| 方法 | メリット | 使用シーン |
|-----|---------|-----------|
| `.\start-docker.ps1` | ✅ 最も簡単<br>✅ 対話型メニュー<br>✅ 自動ヘルスチェック | 初心者・推奨 |
| NPMコマンド | ✅ 短い<br>✅ 覚えやすい | 通常の開発 |
| Dockerコマンド | ✅ 細かい制御<br>✅ 柔軟性 | 高度な操作 |

## 🎯 推奨ワークフロー

```powershell
# 1. 開発開始
.\start-docker.ps1  # → 「2」を選択（開発環境）

# 2. コード編集（ホットリロード自動）
# ファイルを保存すると自動で反映

# 3. 本番環境テスト
.\start-docker.ps1  # → 「1」を選択（本番シミュレーション）

# 4. 問題なければコミット
git add .
git commit -m "..."
git push

# 5. 停止
.\start-docker.ps1  # → 「3」を選択
```

## 🔧 デバッグコマンド

```powershell
# コンテナの状態確認
docker-compose ps

# コンテナ内に入る
docker-compose exec app sh

# データベースに接続
docker-compose exec postgres psql -U postgres -d emergency_assistance

# 環境変数確認
docker-compose exec app env

# ネットワーク確認
docker network ls
docker network inspect emergency-assistance_emergency-net

# ボリューム確認
docker volume ls
docker volume inspect emergency-assistance_postgres_data
```

## 📁 ファイル一覧

| ファイル | 説明 |
|---------|------|
| `docker-compose.yml` | 本番環境設定 |
| `docker-compose.dev.yml` | 開発環境設定 |
| `Dockerfile` | 本番用イメージ定義 |
| `Dockerfile.dev` | 開発用イメージ定義 |
| `.dockerignore` | イメージから除外するファイル |
| `.env.docker` | Docker環境変数テンプレート |
| `start-docker.ps1` | Windows用起動スクリプト |
| `start-docker.sh` | Linux/Mac用起動スクリプト |
| `DOCKER_SETUP.md` | 詳細セットアップガイド |
| `README_DOCKER.md` | Docker環境概要 |
| `DOCKER_QUICKREF.md` | このファイル |

## 🆘 トラブルシューティング

### ポートが使用中
```powershell
# ポート確認
netstat -ano | findstr :8080

# プロセス停止
Stop-Process -Id <PID> -Force

# または docker-compose.yml のポートを変更
# ports:
#   - "8081:8080"  # ホスト側を8081に
```

### コンテナが起動しない
```powershell
# ログ確認
docker-compose logs app

# 完全クリーンアップして再起動
.\start-docker.ps1  # → 「4」を選択
.\start-docker.ps1  # → 「1」を選択
```

### データベース接続エラー
```powershell
# PostgreSQLログ確認
docker-compose logs postgres

# データベースに直接接続してテスト
docker-compose exec postgres psql -U postgres -d emergency_assistance -c "SELECT 1;"
```

### ビルドエラー
```powershell
# キャッシュをクリアして再ビルド
docker-compose build --no-cache

# または完全クリーンアップ
npm run docker:clean
npm run docker:prod
```

## 💡 ベストプラクティス

### 開発時
- 開発環境（`docker:dev`）を使用
- ホットリロードで効率的に開発
- 定期的に本番環境シミュレーションでテスト

### デプロイ前
- 必ず本番環境シミュレーションで動作確認
- CORSエラーがないか確認
- ブラウザのDevToolsでネットワークタブをチェック

### 本番環境
- GitHub Actionsで自動デプロイ
- ローカルのDocker環境と完全一致を保証

## 📚 関連ドキュメント

- [詳細セットアップ](DOCKER_SETUP.md)
- [環境概要](README_DOCKER.md)
- [開発ガイド](DEVELOPMENT_SETUP.md)
- [本番テスト](docs/LOCAL_PRODUCTION_TESTING.md)

---

**最も簡単な方法**: `.\start-docker.ps1` を実行してメニューから選択！
