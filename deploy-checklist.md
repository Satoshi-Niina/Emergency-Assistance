# 🚀 デプロイ前チェックリスト

## ✅ 環境変数チェック

### 必須環境変数
- [ ] `DATABASE_URL` - PostgreSQL接続URL
- [ ] `OPENAI_API_KEY` - OpenAI APIキー
- [ ] `SESSION_SECRET` - セッション暗号化キー
- [ ] `JWT_SECRET` - JWT暗号化キー
- [ ] `NODE_ENV` - 環境設定（development/production）

### 推奨環境変数
- [ ] `PORT` - サーバーポート（デフォルト: 3001）
- [ ] `VITE_PORT` - クライアントポート（デフォルト: 5002）
- [ ] `DEV_MODE` - 開発モードフラグ
- [ ] `ENABLE_DEBUG_LOGS` - デバッグログ有効化

## 🔧 依存関係チェック

### サーバー依存関係
- [ ] `tsx` - TypeScript実行環境
- [ ] `concurrently` - 並行実行
- [ ] `dotenv` - 環境変数読み込み
- [ ] `express` - Webサーバー
- [ ] `cors` - CORS設定

### クライアント依存関係
- [ ] `vite` - ビルドツール
- [ ] `react` - UIフレームワーク
- [ ] `@vitejs/plugin-react` - Reactプラグイン

## 🌐 ネットワークチェック

### ポート設定
- [ ] バックエンド: 3001
- [ ] フロントエンド: 5002
- [ ] HMR: 5003
- [ ] プロキシ設定: `/api` → `http://localhost:3001`

### CORS設定
- [ ] 開発環境: `http://localhost:5002`
- [ ] 本番環境: 適切なドメイン設定

## 🗄️ データベースチェック

### PostgreSQL接続
- [ ] データベースサーバー起動確認
- [ ] 接続文字列確認
- [ ] テーブル存在確認
- [ ] マイグレーション実行

## 🚀 起動テスト

### 開発環境
```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数確認
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');"

# 3. フロント/バックエンド同時起動
npm run dev:local

# 4. アクセス確認
# フロントエンド: http://localhost:5002
# バックエンド: http://localhost:3001/api/health
```

### プロダクション環境
```bash
# 1. プロダクション環境変数設定
npm run dev:production

# 2. 起動確認
npm run start:prod
```

## 🐛 エラー対処

### よくあるエラー
1. **ポート競合**: `kill-port 3001 3002 5000 5001 5002 5003`
2. **環境変数未設定**: `.env`ファイル確認
3. **依存関係不足**: `npm install`実行
4. **データベース接続エラー**: PostgreSQL起動確認

### ログ確認
```bash
# サーバーログ確認
npm run dev:local-server

# クライアントログ確認
npm run dev:local-client
```

## 📝 デプロイ手順

### 1. 事前準備
- [ ] 環境変数設定完了
- [ ] 依存関係インストール完了
- [ ] データベース接続確認完了

### 2. 開発環境テスト
- [ ] `npm run dev:local` で起動確認
- [ ] フロントエンドアクセス確認
- [ ] バックエンドAPI確認
- [ ] データベース操作確認

### 3. プロダクション環境テスト
- [ ] `npm run dev:production` で起動確認
- [ ] 本番環境変数確認
- [ ] セキュリティ設定確認

### 4. デプロイ実行
- [ ] 本番サーバーにコード配置
- [ ] 環境変数設定
- [ ] サービス起動
- [ ] 動作確認 