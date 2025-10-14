# Emergency Assistance 統合開発サーバー

## 概要
フロントエンドとバックエンドを統合した開発サーバーで、ホットリロード対応の開発環境を提供します。

## 特徴
- **統合サーバー**: フロントエンドとバックエンドが1つのサーバーで動作
- **ホットリロード**: ファイル変更時の自動リロード
- **本番同等**: 本番環境と同じリソースとAPIエンドポイント
- **Docker不要**: ローカル環境で直接動作
- **高速起動**: ビルドプロセスを最小限に抑制

## 起動方法

### 1. 統合開発サーバー（推奨）
```bash
npm run dev
```

### 2. 個別起動（従来方式）
```bash
npm run dev:separate
```

## アクセス情報
- **フロントエンド**: http://localhost:8080
- **API**: http://localhost:8080/api
- **ヘルスチェック**: http://localhost:8080/api/health

## 技術構成
- **フロントエンド**: Vite + React + TypeScript
- **バックエンド**: Express.js + Node.js
- **プロキシ**: http-proxy-middleware
- **データベース**: PostgreSQL（オプション）

## 環境変数
```bash
NODE_ENV=development
PORT=8080
CLIENT_PORT=5173
DATABASE_URL=postgresql://postgres:password@localhost:5432/webappdb
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:8080
BYPASS_DB_FOR_LOGIN=true
OPENAI_API_KEY=your-openai-api-key
```

## 開発フロー
1. `npm run dev` で統合サーバー起動
2. ブラウザで http://localhost:8080 にアクセス
3. フロントエンド・バックエンドのファイルを編集
4. 自動的にホットリロードが実行される
5. 本番環境と同じAPIエンドポイントでテスト可能

## トラブルシューティング

### ポート競合
```bash
# ポート8080が使用中の場合
PORT=8081 npm run dev
```

### Viteサーバーが起動しない
```bash
# クライアントディレクトリで個別起動
cd client
npm run dev
```

### データベース接続エラー
- `.env` ファイルで `BYPASS_DB_FOR_LOGIN=true` を設定
- 簡易認証でログイン可能

## 本番デプロイ
- GitHub Actionsでフロントエンドとバックエンドを別々にデプロイ
- 統合サーバーは開発環境専用
