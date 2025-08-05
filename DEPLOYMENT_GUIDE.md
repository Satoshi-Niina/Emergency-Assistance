# Deployment Guide

このガイドでは、Emergency Assistance Systemのデプロイ方法について説明します。

## 🚀 デプロイオプション

### 1. 分離デプロイ（推奨）

フロントエンドとバックエンドを別々のサービスにデプロイします。

#### フロントエンド（Vercel）
- **URL**: https://your-app.vercel.app
- **設定ファイル**: `vercel.json`
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `client/dist`

#### バックエンド（Railway）
- **URL**: https://your-app.railway.app
- **設定ファイル**: `railway.json`
- **ビルドコマンド**: `npm run build:server`
- **起動コマンド**: `npm start`

#### データベース（Supabase/Railway PostgreSQL）
- **接続**: 環境変数 `DATABASE_URL` で管理
- **マイグレーション**: 自動実行

### 2. 統合デプロイ（Docker）

すべてのサービスを1つのサーバーにデプロイします。

## 📋 前提条件

### GitHub Secrets の設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：

```bash
# データベース
DATABASE_URL=postgresql://user:password@host:port/database

# セッション
SESSION_SECRET=your-random-secret-key

# API キー
OPENAI_API_KEY=your-openai-api-key

# フロントエンド設定
VITE_API_BASE_URL=https://your-backend-domain.com

# Vercel設定
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id

# Railway設定
RAILWAY_TOKEN=your-railway-token
RAILWAY_SERVICE_NAME=your-railway-service-name

# サーバー設定
PORT=3001
```

## 🔧 デプロイ手順

### 1. データベースの準備

#### Supabase の場合
1. Supabase プロジェクトを作成
2. データベースURLを取得
3. マイグレーションを実行

```bash
# ローカルでマイグレーション実行
DATABASE_URL=your-supabase-url npm run db:migrate
```

#### Railway PostgreSQL の場合
1. Railway で PostgreSQL サービスを作成
2. 接続URLを取得
3. GitHub Secrets に設定

### 2. バックエンドのデプロイ（Railway）

1. Railway で新しいサービスを作成
2. GitHub リポジトリを接続
3. 環境変数を設定
4. デプロイ

### 3. フロントエンドのデプロイ（Vercel）

1. Vercel で新しいプロジェクトを作成
2. GitHub リポジトリを接続
3. 設定：
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 環境変数を設定
5. デプロイ

### 4. GitHub Actions の設定

1. リポジトリに `.github/workflows/deploy.yml` を配置
2. GitHub Secrets を設定
3. main ブランチにプッシュすると自動デプロイ

## 🔄 デプロイフロー

```mermaid
graph TD
    A[Git Push to main] --> B[GitHub Actions Trigger]
    B --> C[Run Tests]
    C --> D[Build Application]
    D --> E[Deploy Backend to Railway]
    D --> F[Deploy Frontend to Vercel]
    E --> G[Database Migration]
    F --> H[Deployment Complete]
```

## 🛠️ 手動デプロイ

### ローカルビルド

```bash
# 依存関係のインストール
npm run install:all

# アプリケーションのビルド
npm run build

# 本番サーバーの起動
npm run start:prod
```

### Docker デプロイ

```bash
# イメージのビルド
docker build -t emergency-assistance .

# コンテナの起動
docker run -p 3001:3001 \
  -e DATABASE_URL=your-database-url \
  -e SESSION_SECRET=your-secret \
  -e OPENAI_API_KEY=your-key \
  emergency-assistance
```

## 🔍 デプロイ後の確認

### 1. ヘルスチェック

```bash
# バックエンド
curl https://your-backend-domain.com/api/health

# フロントエンド
curl https://your-frontend-domain.com
```

### 2. データベース接続確認

```bash
# マイグレーション状態確認
npm run db:studio
```

### 3. ログ確認

- Railway: Dashboard > Deployments > Logs
- Vercel: Dashboard > Functions > Logs

## 🚨 トラブルシューティング

### よくある問題

1. **CORS エラー**
   - フロントエンドとバックエンドのドメインが正しく設定されているか確認
   - `FRONTEND_URL` と `VITE_API_BASE_URL` を確認

2. **データベース接続エラー**
   - `DATABASE_URL` が正しく設定されているか確認
   - ファイアウォール設定を確認

3. **ビルドエラー**
   - Node.js バージョンが 18.0.0 以上か確認
   - 依存関係が正しくインストールされているか確認

### ログの確認方法

```bash
# Railway ログ
railway logs

# Vercel ログ
vercel logs
```

## 📊 監視とメトリクス

### 推奨監視ツール

1. **Uptime Robot**: 可用性監視
2. **Sentry**: エラー監視
3. **Railway Metrics**: パフォーマンス監視

### アラート設定

- レスポンス時間 > 5秒
- エラー率 > 5%
- 可用性 < 99.9%

## 🔒 セキュリティ

### 本番環境での必須設定

1. **HTTPS の強制**
2. **セキュリティヘッダーの設定**
3. **環境変数の暗号化**
4. **定期的なセキュリティアップデート**

### 推奨セキュリティプラクティス

```bash
# セッションシークレットの生成
openssl rand -base64 32

# データベースパスワードの生成
openssl rand -base64 16
```

## 📈 スケーリング

### 自動スケーリング設定

- Railway: 自動スケーリング有効
- Vercel: エッジ関数で自動スケーリング

### パフォーマンス最適化

1. **CDN の活用**
2. **データベース接続プール**
3. **キャッシュ戦略**
4. **画像最適化**

## 📞 サポート

デプロイに関する問題が発生した場合は：

1. GitHub Issues で報告
2. ログファイルを添付
3. 環境変数設定を確認
4. ネットワーク接続を確認 