# Emergency Assistance System デプロイガイド

## 概要

このドキュメントでは、Emergency Assistance Systemのデプロイ構成と手順について説明します。

## デプロイ構成

### デプロイ対象フォルダ

```
deploy/
├── client/dist/          # フロントエンド（Viteビルド後）
├── server/dist/          # バックエンド（TypeScriptビルド後）
├── shared/dist/          # 共有ライブラリ（TypeScriptビルド後）
├── knowledge-base/       # ナレッジベースデータ
├── package.json          # 依存関係定義
├── package-lock.json     # 依存関係ロック
└── .env                  # 環境変数
```

### ビルドプロセス

1. **共有ライブラリのビルド**: `npm run build:shared`
2. **フロントエンドのビルド**: `npm run build:client`
3. **バックエンドのビルド**: `npm run build:server`

## デプロイ方法

### 1. 手動デプロイ

```bash
# ステージング環境へのデプロイ
npm run deploy:staging

# 本番環境へのデプロイ
npm run deploy:production
```

### 2. GitHub Actions（自動デプロイ）

- `main`ブランチへのプッシュ → 本番環境に自動デプロイ
- `develop`ブランチへのプッシュ → ステージング環境に自動デプロイ

## 環境変数設定

### 必要なシークレット（GitHub Secrets）

#### データベース関連
- `DATABASE_URL`: PostgreSQL接続文字列

#### 認証関連
- `SESSION_SECRET`: セッション暗号化キー
- `JWT_SECRET`: JWT署名キー

#### API関連
- `OPENAI_API_KEY`: OpenAI APIキー

#### Azure関連
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Storage接続文字列
- `AZURE_STORAGE_ACCOUNT_NAME`: Storageアカウント名
- `AZURE_STORAGE_ACCOUNT_KEY`: Storageアカウントキー

#### デプロイ関連
- `PRODUCTION_HOST`: 本番サーバーホスト
- `PRODUCTION_USER`: 本番サーバーユーザー
- `PRODUCTION_KEY`: 本番サーバーSSHキー
- `STAGING_HOST`: ステージングサーバーホスト
- `STAGING_USER`: ステージングサーバーユーザー
- `STAGING_KEY`: ステージングサーバーSSHキー

## CI/CDパイプライン

### ワークフロー

1. **テスト・ビルド**
   - 依存関係のインストール
   - テストの実行
   - 共有ライブラリのビルド
   - フロントエンドのビルド
   - バックエンドのビルド
   - アーティファクトのアップロード

2. **データベースマイグレーション**（本番環境のみ）
   - データベーススキーマの更新

3. **デプロイ**
   - アーティファクトのダウンロード
   - サーバーへのデプロイ
   - ヘルスチェック

### ブランチ戦略

- `main`: 本番環境
- `develop`: ステージング環境
- `feature/*`: 機能開発ブランチ

## サーバー設定

### 必要なソフトウェア

- Node.js 20.16.11+
- PostgreSQL 14+
- PM2（プロセス管理）
- Nginx（リバースプロキシ）

### PM2設定例

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'emergency-assistance',
    script: 'server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Nginx設定例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # フロントエンド（静的ファイル）
    location / {
        root /path/to/emergency-assistance/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## トラブルシューティング

### よくある問題

1. **ビルドエラー**
   - 依存関係の確認: `npm ci`
   - TypeScriptエラーの確認
   - 共有ライブラリのビルド確認

2. **デプロイエラー**
   - 環境変数の設定確認
   - サーバー接続の確認
   - 権限の確認

3. **データベースエラー**
   - 接続文字列の確認
   - マイグレーションの確認
   - 権限の確認

### ログ確認

```bash
# PM2ログ
pm2 logs emergency-assistance

# Nginxログ
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## バックアップ・復旧

### バックアップ

```bash
# データベースバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# ファイルバックアップ
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz knowledge-base/ uploads/
```

### 復旧

```bash
# データベース復旧
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# ファイル復旧
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
```

## セキュリティ考慮事項

1. **環境変数**
   - 本番環境のシークレットは必ずGitHub Secretsで管理
   - 環境変数ファイルはGitにコミットしない

2. **データベース**
   - 強力なパスワードを使用
   - 接続をSSL/TLSで暗号化
   - 最小権限の原則を適用

3. **サーバー**
   - ファイアウォールの設定
   - 定期的なセキュリティアップデート
   - アクセスログの監視

## 監視・アラート

### 監視項目

- サーバーリソース（CPU、メモリ、ディスク）
- アプリケーションの応答時間
- エラーレート
- データベース接続

### アラート設定

- サーバーダウン時の通知
- 高負荷時の通知
- エラー率上昇時の通知 