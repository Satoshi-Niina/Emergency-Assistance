# 環境変数設定ガイド

## 概要
このガイドでは、Emergency Assistance Systemのローカル開発環境での環境変数設定方法を説明します。

## 必要な環境変数

### サーバー側（server/.env）
```bash
# 基本設定
NODE_ENV=development
PORT=3001

# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance

# セッション・認証設定
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI設定
OPENAI_API_KEY=your_openai_api_key_here

# フロントエンド用
VITE_API_BASE_URL=http://localhost:3001
```

### フロントエンド側（client/.env.local）
```bash
# API設定
VITE_API_BASE_URL=http://localhost:3001
VITE_NODE_ENV=development
```

## 設定手順

### 1. サーバー側の環境変数設定
```bash
# serverディレクトリに移動
cd server

# .envファイルを作成
cat > .env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your_openai_api_key_here
VITE_API_BASE_URL=http://localhost:3001
EOF
```

### 2. フロントエンド側の環境変数設定
```bash
# clientディレクトリに移動
cd client

# .env.localファイルを作成
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:3001
VITE_NODE_ENV=development
EOF
```

## トラブルシューティング

### 問題1: DATABASE_URL = [NOT SET] が表示される
**原因**: サーバー側の.envファイルが読み込まれていない
**解決方法**:
1. `server/.env`ファイルが存在することを確認
2. ファイルの内容が正しいことを確認
3. サーバーを再起動

### 問題2: ログイン画面が表示されない
**原因**: フロントエンドのAPI接続が失敗している
**解決方法**:
1. `client/.env.local`ファイルが存在することを確認
2. `VITE_API_BASE_URL`が正しく設定されていることを確認
3. サーバーが起動していることを確認

### 問題3: 認証APIがエラーになる
**原因**: セッション設定やデータベース接続の問題
**解決方法**:
1. `SESSION_SECRET`が設定されていることを確認
2. データベースが起動していることを確認
3. デバッグエンドポイント `/api/auth/debug/env` で状態を確認

## デバッグ方法

### 1. サーバー側の環境変数確認
```bash
# サーバーを起動
cd server
npm run dev

# ログで以下を確認
# ✅ 環境変数ファイル読み込み成功: [パス]
# 🔧 環境変数確認: { DATABASE_URL: '[SET]', ... }
```

### 2. フロントエンド側の環境変数確認
```bash
# フロントエンドを起動
cd client
npm run dev

# ブラウザの開発者ツールで以下を確認
console.log(import.meta.env.VITE_API_BASE_URL);
```

### 3. API接続確認
```bash
# サーバーが起動している状態で
curl http://localhost:3001/api/health
curl http://localhost:3001/api/auth/debug/env
```

## 開発用デフォルト値

コード内でデフォルト値が設定されているため、環境変数ファイルがなくても基本的な動作は可能です：

- `VITE_API_BASE_URL`: `http://localhost:3001`
- `SESSION_SECRET`: `dev-session-secret-for-development-only`
- `JWT_SECRET`: `dev-secret`

ただし、本格的な開発には環境変数ファイルの設定を推奨します。 