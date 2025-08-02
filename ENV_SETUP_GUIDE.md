# 環境変数設定ガイド

## 概要
サーバー起動時にDATABASE_URLが読み込まれない問題を解決するための環境変数設定ガイドです。

## 問題の原因
- .envファイルが存在しない
- dotenv.config()のパス設定が正しくない
- 環境変数の読み込み順序が適切でない

## 解決方法

### 1. .envファイルの作成

#### ルートディレクトリに.envファイルを作成
```bash
# ルートディレクトリに.envファイルを作成
touch .env
```

#### .envファイルの内容
```bash
# アプリケーション設定
NODE_ENV=development
PORT=3001

# クライアント設定
CLIENT_PORT=5002

# API設定
VITE_API_BASE_URL=http://localhost:3001

# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance

# 認証設定
JWT_SECRET=dev-secret-key-for-development-only
SESSION_SECRET=dev-session-secret-for-development-only

# OpenAI設定（必要に応じて）
OPENAI_API_KEY=your_openai_api_key_here

# ログ設定
LOG_LEVEL=info
```

### 2. 環境別設定ファイル（オプション）

#### 開発環境用
```bash
# .env.development
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
VITE_API_BASE_URL=http://localhost:3001
```

#### 本番環境用
```bash
# .env.production
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@your-db-host:5432/emergency_assistance
VITE_API_BASE_URL=https://your-backend-domain.com
```

### 3. 修正内容

#### server/index.ts
- 環境変数ファイルの読み込み順序を改善
- デバッグログを追加
- 複数のパスで.envファイルを検索

#### server/db/index.ts
- dotenv設定を削除（index.tsで読み込まれるため）
- デバッグログを追加

#### server/db/db.ts
- dotenv設定を削除（index.tsで読み込まれるため）

#### server/app.ts
- dotenv設定を削除（index.tsで読み込まれるため）
- 環境変数確認ログを追加

## 環境変数の読み込み順序

1. `.env.${NODE_ENV}.local` (ルート)
2. `.env.${NODE_ENV}` (ルート)
3. `.env` (ルート)
4. `.env.${NODE_ENV}.local` (server)
5. `.env.${NODE_ENV}` (server)
6. `.env` (server)

## デバッグ方法

### サーバー起動時のログ確認
```bash
cd server
npm run dev
```

期待されるログ出力：
```
🔧 環境変数読み込み開始: { NODE_ENV: 'development', isProduction: false, ... }
✅ 環境変数ファイル読み込み成功: /path/to/.env
[DEV] Development environment variables loaded: { DATABASE_URL: 'SET', ... }
🔍 DEBUG server/db/index.ts: DATABASE_URL = [SET]
```

### 問題が発生した場合の確認項目

1. **.envファイルの存在確認**
   ```bash
   ls -la .env
   ```

2. **.envファイルの内容確認**
   ```bash
   cat .env
   ```

3. **環境変数の確認**
   ```bash
   echo $DATABASE_URL
   ```

4. **サーバーログの確認**
   - DATABASE_URLが[NOT SET]になっていないか
   - 環境変数ファイルの読み込みエラーがないか

## トラブルシューティング

### よくある問題

#### 1. DATABASE_URLが[NOT SET]になる
**原因**: .envファイルが存在しない、または読み込まれていない
**解決方法**: 
- .envファイルを作成
- ファイルパスを確認
- ファイルの権限を確認

#### 2. 認証APIが動作しない
**原因**: DATABASE_URLが設定されていないため、データベース接続が失敗
**解決方法**:
- DATABASE_URLを正しく設定
- PostgreSQLが起動しているか確認
- データベースの存在確認

#### 3. ログイン画面が表示されない
**原因**: 認証APIが動作しないため、フロントエンドでエラーが発生
**解決方法**:
- サーバーが正常に起動しているか確認
- ブラウザの開発者ツールでエラーを確認
- APIエンドポイントの動作確認

## 完了確認項目

- [ ] .envファイルが作成されている
- [ ] DATABASE_URLが正しく設定されている
- [ ] サーバー起動時にDATABASE_URLが[SET]と表示される
- [ ] データベース接続が成功する
- [ ] 認証APIが正常に動作する
- [ ] ログイン画面が表示される
- [ ] ユーザー管理機能が動作する

## 注意事項

1. **セキュリティ**: 本番環境では強力なパスワードとシークレットを使用
2. **バックアップ**: 重要な設定はバックアップを取る
3. **権限**: .envファイルの権限を適切に設定（600推奨）
4. **Git**: .envファイルは.gitignoreに含める 