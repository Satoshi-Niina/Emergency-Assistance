# クライアント・サーバー分離デプロイ構成ガイド

## 概要

このドキュメントでは、Emergency Assistance Systemのクライアント（フロントエンド）とサーバー（バックエンド）を分離してデプロイする際の構成と、各ファイルの配置について説明します。

## 現在のプロジェクト構造

### モノレポ構成
- **ルートレベル**: workspace管理用の`package.json`で`client`, `server`, `shared`を統合管理
- **各ディレクトリ**: 独立した`package.json`とビルド設定を持つ

### 環境変数管理
- **ルートレベル**: `production.env`, `local.env`, `production-local.env`
- **クライアント**: `client/env.production`, `client/env.development`, `client/env.local`
- **サーバー**: 主にルートレベルの環境変数ファイルを参照

### Docker設定
- **サーバー**: `server/Dockerfile`, `server/docker-compose.yml`
- **クライアント**: Docker設定なし（Static Web Appでデプロイ）

## 推奨ファイル構成

### ルートレベル（共有リソース）

```
Emergency-Assistance/
├── package.json                    # Workspace管理用
├── package-lock.json              # 依存関係ロックファイル
├── tsconfig.json                  # 共有TypeScript設定
├── eslint.config.js               # ESLint設定
├── tailwind.config.ts             # 共有Tailwind設定
├── postcss.config.js              # PostCSS設定
├── drizzle.config.ts              # データベース設定
├── migrations/                    # DBマイグレーションファイル
│   ├── 0001_initial_schema.sql
│   ├── 0002_fix_schema_issues.sql
│   └── ...
├── shared/                        # 共有コード
│   ├── types/                     # 共通型定義
│   ├── utils/                     # ユーティリティ関数
│   └── constants/                 # 定数定義
├── knowledge-base/                # ナレッジベースデータ
│   ├── documents/                 # ドキュメント
│   ├── images/                    # 画像ファイル
│   └── data/                      # データファイル
├── scripts/                       # ビルド・デプロイスクリプト
│   ├── smoke.js                   # ヘルスチェック
│   └── ...
├── .github/workflows/             # CI/CD設定
│   ├── backend-docker.yml        # バックエンドデプロイ
│   ├── frontend.yml              # フロントエンドデプロイ
│   └── mirror-backup.yml         # バックアップ
├── production.env                # 本番環境変数
├── local.env                     # ローカル環境変数
├── production-local.env          # 本番ローカル環境変数
└── README.md                     # プロジェクト説明
```

### クライアント専用ディレクトリ

```
client/
├── package.json                  # クライアント依存関係
├── package-lock.json            # クライアント依存関係ロック
├── vite.config.ts               # Vite設定
├── tsconfig.json                # クライアントTypeScript設定
├── tsconfig.node.json           # Node.js用TypeScript設定
├── tailwind.config.ts           # クライアント専用Tailwind設定
├── postcss.config.js            # クライアントPostCSS設定
├── staticwebapp.config.json     # Azure Static Web Apps設定
├── index.html                   # エントリーポイント
├── src/                         # ソースコード
│   ├── components/              # Reactコンポーネント
│   ├── pages/                   # ページコンポーネント
│   ├── hooks/                   # カスタムフック
│   ├── utils/                   # クライアントユーティリティ
│   ├── types/                   # クライアント型定義
│   └── styles/                 # スタイルファイル
├── dist/                        # ビルド出力
├── env.production               # 本番環境変数
├── env.development              # 開発環境変数
└── env.local                    # ローカル環境変数
```

### サーバー専用ディレクトリ

```
server/
├── package.json                 # サーバー依存関係
├── package-lock.json           # サーバー依存関係ロック
├── Dockerfile                  # Docker設定
├── docker-compose.yml          # Docker Compose設定
├── tsconfig.json               # サーバーTypeScript設定
├── azure-package.json          # Azure用package.json
├── azure-server.js             # Azure用サーバーファイル
├── production-server.js        # 本番サーバーファイル
├── src/                        # ソースコード
│   ├── routes/                 # APIルート
│   ├── middleware/             # ミドルウェア
│   ├── models/                 # データモデル
│   ├── services/               # ビジネスロジック
│   ├── utils/                  # サーバーユーティリティ
│   └── types/                  # サーバー型定義
├── dist/                       # ビルド出力
└── logs/                       # ログファイル
```

## デプロイ戦略

### 1. バックエンドデプロイ
- **プラットフォーム**: Azure App Service
- **コンテナ**: Docker
- **レジストリ**: Azure Container Registry
- **ワークフロー**: `.github/workflows/backend-docker.yml`

**デプロイフロー**:
1. `server/`ディレクトリの変更を検知
2. Dockerイメージをビルド
3. Azure Container Registryにプッシュ
4. Azure App Serviceにデプロイ
5. ヘルスチェック実行

### 2. フロントエンドデプロイ
- **プラットフォーム**: Azure Static Web Apps
- **ビルドツール**: Vite
- **ワークフロー**: `.github/workflows/frontend.yml`

**デプロイフロー**:
1. `client/`ディレクトリの変更を検知
2. 依存関係インストール
3. Viteでプロダクションビルド
4. Azure Static Web Appsにデプロイ
5. アクセシビリティチェック

### 3. データベース
- **プラットフォーム**: Azure PostgreSQL
- **管理**: Drizzle ORM
- **マイグレーション**: `migrations/`ディレクトリ

## 環境変数管理

### ルートレベル環境変数
```bash
# production.env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
JWT_SECRET=your-production-jwt-secret-32-characters-minimum
SESSION_SECRET=your-production-session-secret-32-characters-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your-actual-openai-api-key
BYPASS_DB_FOR_LOGIN=false
```

### クライアント環境変数
```bash
# client/env.production
VITE_API_BASE_URL=
VITE_API_BASE=
```

## CI/CD設定ファイル

### バックエンドデプロイ
**ファイル**: `.github/workflows/backend-docker.yml`
- **トリガー**: `server/**`の変更
- **アクション**: Dockerビルド → ACRプッシュ → App Serviceデプロイ

### フロントエンドデプロイ
**ファイル**: `.github/workflows/frontend.yml`
- **トリガー**: `client/**`の変更
- **アクション**: Viteビルド → Static Web Appsデプロイ

### バックアップ
**ファイル**: `.github/workflows/mirror-backup.yml`
- **トリガー**: `main`ブランチへのプッシュ
- **アクション**: `backup`ブランチへのミラー

## 開発ワークフロー

### ローカル開発
```bash
# 全体の開発サーバー起動
npm run dev

# クライアントのみ
npm run dev:client

# サーバーのみ
npm run dev:server
```

### プロダクションビルド
```bash
# 全体ビルド
npm run build

# クライアントのみ
npm run build:client

# サーバーのみ
npm run build:server
```

## セキュリティ考慮事項

### 環境変数の管理
- 本番環境の機密情報はAzure Portalの環境変数で管理
- `.env`ファイルは`.gitignore`に追加
- 開発用のダミー値を使用

### データベース接続
- SSL接続を必須とする
- 接続プールの設定
- レート制限の実装

## 監視・ログ

### ヘルスチェック
- バックエンド: `/api/health`エンドポイント
- フロントエンド: 静的ファイルのアクセシビリティ
- CI/CD: デプロイ後の自動ヘルスチェック

### ログ管理
- サーバーログ: `server/logs/`ディレクトリ
- デプロイログ: `logs/deployments/`ディレクトリ
- Azure Application Insightsとの連携

## トラブルシューティング

### よくある問題
1. **依存関係の競合**: 各ディレクトリの`package-lock.json`を確認
2. **環境変数の不整合**: ルートとクライアントの環境変数を同期
3. **ビルドエラー**: TypeScript設定の確認
4. **デプロイ失敗**: Azure認証情報の確認

### デバッグ手順
1. ローカル環境での動作確認
2. CI/CDログの確認
3. Azure Portalでのリソース状態確認
4. ヘルスチェックエンドポイントの確認

## 今後の改善点

### スケーラビリティ
- マイクロサービス化の検討
- コンテナオーケストレーション（Kubernetes）の導入
- CDNの活用

### 開発効率
- ホットリロードの改善
- テスト自動化の強化
- パフォーマンス監視の導入

---

この構成により、クライアントとサーバーを独立してデプロイしながら、共有リソースを効率的に管理し、スケーラブルなアーキテクチャを実現できます。
