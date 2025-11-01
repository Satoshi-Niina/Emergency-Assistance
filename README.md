# Emergency Assistance System

統合Docker環境で動作する緊急支援システムです。フロントエンドとAPIサーバーが1つのDockerコンテナで動作します。

## 特徴

- **統合環境**: フロントエンドとAPIサーバーが1つのDockerコンテナで動作
- **Runtime Config**: ビルド時ではなく実行時に環境変数を設定
- **SPA対応**: Expressで静的ファイル配信とSPAルーティング
- **Docker対応**: マルチステージビルドで最適化されたイメージ

## クイックスタート

### Docker環境での実行

```bash
# イメージをビルド
docker build -t emergency-assistance .

# コンテナを実行
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e API_BASE_URL=/api \
  -e CORS_ALLOW_ORIGINS=* \
  emergency-assistance
```

### ローカル開発

```bash
# 依存関係のインストール
npm install
cd client && npm install
cd ../server && npm install

# 開発サーバーの起動
npm run dev
```

## 環境変数

`env.example`をコピーして`.env`ファイルを作成し、必要な値を設定してください。

```bash
cp env.example .env
```

主要な環境変数：

- `NODE_ENV`: 実行環境 (production/development)
- `PORT`: サーバーポート (デフォルト: 8080)
- `API_BASE_URL`: APIのベースURL (デフォルト: /api)
- `CORS_ALLOW_ORIGINS`: CORS許可オリジン (デフォルト: *)

## アーキテクチャ

```
┌─────────────────────────────────────┐
│           Docker Container          │
│  ┌─────────────────────────────────┐│
│  │        Express Server            ││
│  │  ┌─────────────┐ ┌─────────────┐ ││
│  │  │   Static    │ │     API     │ ││
│  │  │   Files     │ │  Endpoints  │ ││
│  │  │  (Frontend) │ │             │ ││
│  │  └─────────────┘ └─────────────┘ ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## API エンドポイント

- `GET /health` - ヘルスチェック
- `GET /api/health` - APIヘルスチェック
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - ユーザー情報取得
- `POST /api/chatgpt` - チャットAPI

## デプロイ

GitHub ActionsでDockerイメージをビルド・テスト・デプロイします。

```yaml
# .github/workflows/docker-deploy.yml
- Dockerイメージのビルド
- スモークテストの実行
- 本番環境へのデプロイ
```

## 開発

### 環境変数の取り扱い

- ルートにある `.env.template` は、サーバーとフロントエンドで使用するすべての環境変数（VITE_ で始まるクライアント変数を含む）を一覧化したテンプレートです。
- 実際のシークレット（API キーやデータベース接続文字列）は `.env` に記載し、`.gitignore` によりリポジトリに含めないでください。
- クライアントに公開される変数は `VITE_` プレフィックスを付けてください（Vite の仕様）。例: `VITE_API_BASE_URL`。

手順:

1. ルートの `.env.template` を参照して `cp .env.template .env` でコピーします。
2. `.env` に実際の値（秘密値は含める）を設定して開発環境を起動します。


### プロジェクト構造

```
├── client/          # React フロントエンド
├── server/          # Express API サーバー
├── shared/          # 共通ライブラリ
├── Dockerfile       # Docker設定
├── start-production.sh  # 起動スクリプト
└── env.example      # 環境変数テンプレート
```

### ビルド

```bash
# フロントエンドとサーバーをビルド
npm run build

# Dockerイメージをビルド
npm run docker:build
```

## ライセンス
