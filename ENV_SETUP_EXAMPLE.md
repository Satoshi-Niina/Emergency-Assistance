# Emergency Assistance System - 環境変数設定例

## 概要
このファイルは、Emergency Assistance Systemの環境変数設定例です。
実際の環境に合わせて値を設定してください。

## 設定ファイルの作成

### 1. サーバー側（server/.env）
```bash
# =============================================================================
# 基本設定
# =============================================================================
NODE_ENV=development
PORT=3001

# =============================================================================
# データベース設定
# =============================================================================
# PostgreSQL接続文字列（pu-tomo3001で統一）
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance

# =============================================================================
# セッション・認証設定
# =============================================================================
# セッション暗号化キー（本番環境では強力なランダム文字列を使用）
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# =============================================================================
# OpenAI設定
# =============================================================================
# OpenAI APIキー（開発環境では任意）
OPENAI_API_KEY=your_openai_api_key_here

# =============================================================================
# フロントエンド用API設定
# =============================================================================
# フロントエンドからバックエンドAPIへの接続URL
VITE_API_BASE_URL=http://localhost:3001
```

### 2. フロントエンド側（client/.env.local）
```bash
# =============================================================================
# API設定
# =============================================================================
# フロントエンドからバックエンドAPIへの接続URL
VITE_API_BASE_URL=http://localhost:3001
VITE_NODE_ENV=development
```

## 環境別設定例

### ローカル開発環境
```bash
# server/.env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
SESSION_SECRET=dev-session-secret-for-development-only
JWT_SECRET=dev-secret
VITE_API_BASE_URL=http://localhost:3001

# client/.env.local
VITE_API_BASE_URL=http://localhost:3001
VITE_NODE_ENV=development
```

### Replit環境
```bash
# server/.env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
SESSION_SECRET=your-production-session-secret
JWT_SECRET=your-production-jwt-secret
VITE_API_BASE_URL=https://your-replit-app.replit.app
REPLIT_ENVIRONMENT=true

# client/.env.local
VITE_API_BASE_URL=https://your-replit-app.replit.app
VITE_NODE_ENV=production
```

### Azure環境
```bash
# server/.env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
SESSION_SECRET=your-production-session-secret
JWT_SECRET=your-production-jwt-secret
VITE_API_BASE_URL=https://your-azure-app.azurewebsites.net
AZURE_ENVIRONMENT=true

# client/.env.local
VITE_API_BASE_URL=https://your-azure-app.azurewebsites.net
VITE_NODE_ENV=production
```

## セキュリティ設定

### 本番環境での強力なシークレットキー生成
```bash
# セッションシークレットの生成
openssl rand -base64 32

# JWTシークレットの生成
openssl rand -base64 32
```

### 環境変数の確認方法

#### サーバー側
```bash
# サーバー起動時にログで確認
npm run dev

# デバッグエンドポイントで確認
curl http://localhost:3001/api/debug/env
```

#### フロントエンド側
```bash
# ブラウザの開発者ツールで確認
console.log(import.meta.env.VITE_API_BASE_URL);
```

## トラブルシューティング

### 1. 環境変数が読み込まれない
- ファイル名が正しいか確認（`.env`、`.env.local`）
- ファイルの場所が正しいか確認
- サーバーを再起動

### 2. CORSエラーが発生する
- `VITE_API_BASE_URL`が正しく設定されているか確認
- サーバーのCORS設定でフロントエンドのドメインが許可されているか確認

### 3. セッションが維持されない
- `SESSION_SECRET`が設定されているか確認
- 本番環境では`secure: true`、`sameSite: 'none'`が設定されているか確認

### 4. データベース接続エラー
- `DATABASE_URL`が正しく設定されているか確認
- PostgreSQLサーバーが起動しているか確認
- データベースが存在するか確認

## 注意事項

1. **本番環境では必ず強力なシークレットキーを使用してください**
2. **環境変数ファイルはGitにコミットしないでください**
3. **本番環境ではHTTPSを使用してください**
4. **定期的にシークレットキーを更新してください** 