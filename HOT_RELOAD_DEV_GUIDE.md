# ホットリロード統合開発環境ガイド

## 概要
元ファイルを直接修正・確認できるホットリロード対応の統合開発環境です。
Docker環境を使わず、ローカルで直接ファイルを編集して即座に反映されます。

## 特徴
- **元ファイル直接編集**: ビルド不要でソースファイルを直接修正
- **即座反映**: ファイル保存と同時にブラウザに反映
- **統合環境**: フロントエンドとバックエンドが1つのサーバーで動作
- **本番同等**: 本番環境と同じAPIエンドポイントでテスト
- **Docker不要**: ローカル環境で直接動作
- **壊れにくい**: 古いファイルでの検証を避け、常に最新状態

## 起動方法

### 1. 推奨方法（PowerShell）
```powershell
.\scripts\start-hot-reload-dev.ps1
```

### 2. 推奨方法（Bash）
```bash
bash scripts/start-hot-reload-dev.sh
```

### 3. npmスクリプト
```bash
npm run dev
# または
npm run dev:hot
```

## アクセス情報
- **フロントエンド**: http://localhost:8080
- **API**: http://localhost:8080/api
- **ヘルスチェック**: http://localhost:8080/api/health

## 開発フロー
1. ホットリロードサーバーを起動
2. ブラウザで http://localhost:8080 にアクセス
3. フロントエンド・バックエンドのファイルを直接編集
4. 保存と同時に自動的にブラウザに反映
5. 本番環境と同じAPIエンドポイントでテスト

## ファイル構造
```
client/src/          # フロントエンドソース（直接編集）
server/routes/        # APIルート（直接編集）
server/services/      # サービス層（直接編集）
server/lib/          # ライブラリ（直接編集）
knowledge-base/      # 知識ベース（直接編集）
```

## 環境変数
```bash
NODE_ENV=development
PORT=8080
CLIENT_PORT=5173
DATABASE_URL=postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb
JWT_SECRET=dev-secret-key-32-characters-long
SESSION_SECRET=dev-session-secret-32-characters-long
FRONTEND_URL=http://localhost:8080
BYPASS_DB_FOR_LOGIN=true
OPENAI_API_KEY=sk-CHANGE_THIS_TO_YOUR_ACTUAL_OPENAI_API_KEY
CORS_ALLOW_ORIGINS=http://localhost:8080,http://localhost:5173
```

## トラブルシューティング

### ポート競合
```bash
# ポート8080が使用中の場合
PORT=8081 npm run dev
```

### Viteサーバーが起動しない
```bash
# クライアントディレクトリで個別起動
cd client
npm run dev
```

### データベース接続エラー
- `.env` ファイルで `BYPASS_DB_FOR_LOGIN=true` を設定
- 簡易認証でログイン可能

### ファイルが反映されない
1. ブラウザのキャッシュをクリア
2. 開発者ツールでハードリロード（Ctrl+Shift+R）
3. サーバーを再起動

## 本番デプロイ
- ホットリロード環境で修正したファイルがそのまま本番環境で使用されます
- ビルドプロセスは本番デプロイ時のみ実行
- 開発時の修正が本番環境に確実に反映されます

## 従来のDocker環境との違い
- **Docker環境**: コンテナ内でファイルをコピーしてビルド
- **ホットリロード環境**: ローカルファイルを直接使用、ビルド不要
- **メリット**: ファイル修正が即座に反映、壊れにくい、デバッグしやすい
