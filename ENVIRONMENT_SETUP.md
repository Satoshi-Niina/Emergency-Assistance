# 環境変数設定ガイド

このプロジェクトでは、環境ごとに異なる`.env`ファイルを使用します。

## 🚀 使い方

### ローカル開発環境
```bash
npm run dev
```
- `NODE_ENV=development` が自動設定されます
- `server/.env.development` ファイルが読み込まれます
- Vite開発サーバー: http://localhost:5173
- APIサーバー: http://localhost:8080

### 本番環境
```bash
npm run start
# または
npm run start:prod
```
- `NODE_ENV=production` が自動設定されます
- `server/.env.production` ファイルが読み込まれます（テンプレート）
- **Azure App Service** では環境変数が優先されます

## 📁 環境ファイル

### `server/.env.development` (ローカル開発)
- ローカルのPostgreSQLデータベース
- ローカルのAPIキー
- CORS: localhost許可
- デバッグモード有効
- **⚠️ Git除外対象** (機密情報を含む)

### `server/.env.production` (本番テンプレート)
- Azure PostgreSQLデータベース
- 本番APIキー（プレースホルダー）
- CORS: 本番ドメイン
- デバッグモード無効
- **✅ Gitに含まれる** (実際の値は Azure App Service で設定)

### `server/.env` (レガシー/フォールバック)
- 従来の設定ファイル
- 新しいプロジェクトでは使用不推奨
- フォールバックとして機能

## 🔄 自動切り替えの仕組み

`server/azure-server.mjs` で以下のロジックが動作:

1. Azure App Service かチェック (`WEBSITE_SITE_NAME`)
   - ✅ Azure → 環境変数を直接使用
   - ❌ ローカル → `.env` ファイル読み込み

2. `NODE_ENV` の値をチェック
   - `production` → `.env.production` 読み込み
   - それ以外 → `.env.development` 読み込み

3. ファイルが存在しない場合
   - `.env` ファイルにフォールバック
   - それも無ければ環境変数のみ使用

## 🔐 セキュリティ

### ローカル開発
- `.env.development` は **Git除外**
- 実際のAPIキーや認証情報を含む
- 各開発者が独自に管理

### 本番環境
- `.env.production` は **テンプレート**のみGitに含む
- 実際の値は **Azure App Service の環境変数** で設定
- GitHub Secrets や Azure Key Vault を使用推奨

## 📋 環境変数一覧

### 必須 (共通)
```bash
NODE_ENV=development|production
PORT=8080
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-32-chars-minimum
```

### 開発環境のみ
```bash
DEBUG_MODE=true
HOT_RELOAD=true
VERBOSE_LOGGING=true
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:8080
```

### 本番環境のみ
```bash
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=...
STATIC_WEB_APP_URL=https://...
```

### オプション
```bash
OPENAI_API_KEY=sk-...
STORAGE_MODE=hybrid|file|database
LOCAL_EXPORT_DIR=./knowledge-base/exports
```

## ✅ 動作確認

サーバー起動時のログで環境ファイルが正しく読み込まれているか確認:

```bash
npm run dev
# ログで確認:
# 📄 Environment file loaded: .env.development (development mode)
# 📍 Path: .../server/.env.development
```

```bash
npm run start:prod
# ログで確認:
# 📄 Environment file loaded: .env.production (production mode)
# 📍 Path: .../server/.env.production
```

## 🛠️ トラブルシューティング

### 環境変数が読み込まれない
1. ファイル名を確認: `.env.development` or `.env.production`
2. `NODE_ENV` の値を確認: `echo $env:NODE_ENV` (PowerShell)
3. サーバーログを確認: `📄 Environment file loaded: ...`

### 開発環境で本番設定が読み込まれる
```bash
# NODE_ENVを明示的に設定
npm run dev
# または
cross-env NODE_ENV=development node server/azure-server.mjs
```

### Azureで環境変数が優先されない
- Azure App Service では `.env` ファイルより環境変数が優先
- `WEBSITE_SITE_NAME` が設定されていれば `.env` は読み込まれない
- Azure Portal で環境変数を設定

## 🔗 関連ドキュメント
- [Azure App Service 環境変数](docs/AZURE_SECRETS_SETUP.md)
- [ローカル開発環境](DEVELOPMENT_SETUP.md)
- [デプロイメントガイド](DEPLOYMENT.md)
