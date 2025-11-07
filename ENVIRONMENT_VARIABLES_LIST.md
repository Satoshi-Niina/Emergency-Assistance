# 環境変数一覧

このシステムで使用される環境変数の完全な一覧です。

## フロントエンド環境変数（VITE_プレフィックス）

### 必須環境変数

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `VITE_API_BASE_URL` | バックエンドAPIのベースURL（末尾に/apiは含めない） | `http://localhost:8080` | `http://localhost:8080` |
| `VITE_CLIENT_PORT` | クライアント開発サーバーのポート番号 | `5173` | `5173` |

### オプション環境変数

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `VITE_STATIC_WEB_APP_URL` | Azure Static Web App URL（本番環境用） | `https://witty-river-012f39e00.1.azurestaticapps.net` | `https://witty-river-012f39e00.1.azurestaticapps.net` |
| `VITE_BACKEND_SERVICE_URL` | バックエンドサービスURL（本番環境用） | `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net` | `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net` |
| `VITE_CORS_ALLOW_ORIGINS` | CORS許可オリジン（カンマ区切り） | `*` | `http://localhost:5173,http://localhost:8080` |
| `VITE_SERVER_PORT` | サーバーポート（開発用） | `3003` | `3003` |

## バックエンド環境変数

### 必須環境変数

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `NODE_ENV` | 実行環境 | `development` | `production` |
| `PORT` | サーバーポート | `8080` | `8080` |
| `CLIENT_PORT` | クライアントポート（開発用） | `5173` | `5173` |
| `FRONTEND_URL` | フロントエンドURL | `http://localhost:8080` | `https://witty-river-012f39e00.1.azurestaticapps.net` |
| `JWT_SECRET` | JWT署名用シークレット（32文字以上） | - | `your-secret-key-32-characters-minimum` |
| `SESSION_SECRET` | セッション管理用シークレット（32文字以上） | - | `your-session-secret-32-characters-minimum` |

### 推奨環境変数

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `FRONTEND_ORIGIN` | フロントエンドオリジン（CORS用） | `http://localhost:8080` | `https://witty-river-012f39e00.1.azurestaticapps.net` |
| `STATIC_WEB_APP_URL` | Azure Static Web App URL | `https://witty-river-012f39e00.1.azurestaticapps.net` | `https://witty-river-012f39e00.1.azurestaticapps.net` |
| `BACKEND_SERVICE_URL` | バックエンドサービスURL | `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net` | `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net` |
| `CORS_ALLOW_ORIGINS` | CORS許可オリジン（カンマ区切り） | `http://localhost:5173,http://localhost:8080` | `http://localhost:5173,http://localhost:8080,https://witty-river-012f39e00.1.azurestaticapps.net` |

### データベース設定

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `DATABASE_URL` | PostgreSQL接続文字列 | - | `postgresql://postgres:password@localhost:5432/webappdb` |
| `PG_SSL` | PostgreSQL SSL設定 | `require` | `require` |

### OpenAI設定（オプション）

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `OPENAI_API_KEY` | OpenAI APIキー | - | `sk-...` |
| `OPENAI_MODEL` | OpenAIモデル名 | `gpt-4o` | `gpt-4o` |

### その他のAPI設定

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `TECH_SUPPORT_API_URL` | テックサポートAPI URL | `http://localhost:5000` | `http://localhost:5000` |

### 開発用設定

| 環境変数名 | 説明 | デフォルト値 | 例 |
|---------|------|------------|-----|
| `BYPASS_DB_FOR_LOGIN` | データベースをバイパスしてログイン（開発用） | `true` | `true` |

## 環境変数の設定方法

### フロントエンド

1. `client/.env.example`をコピーして`client/.env`を作成
2. 必要な環境変数を設定

### バックエンド

1. `server/.env.example`をコピーして`server/.env`を作成
2. 必要な環境変数を設定

## 変更履歴

- 2025-01-XX: ハードコーディングされたURLとポート番号を環境変数に変換
  - `VITE_API_BASE_URL`を追加
  - `VITE_CLIENT_PORT`を追加
  - `VITE_STATIC_WEB_APP_URL`を追加
  - `VITE_BACKEND_SERVICE_URL`を追加
  - `STATIC_WEB_APP_URL`を追加
  - `BACKEND_SERVICE_URL`を追加
  - `TECH_SUPPORT_API_URL`を追加
  - CORS設定を環境変数化

