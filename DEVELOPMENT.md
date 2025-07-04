# 開発環境セットアップ

このドキュメントでは、Emergency Assistance Systemの開発環境のセットアップと使用方法について説明します。

## 🚀 クイックスタート

### 1. 開発環境の起動

```bash
# 開発用サーバーとクライアントを同時起動
npm run dev:local

# または、個別に起動
npm run dev:local-server  # サーバーのみ
npm run dev:local-client  # クライアントのみ
```

### 2. アクセス

- **フロントエンド**: http://localhost:5002
- **バックエンドAPI**: http://localhost:3002
- **ヘルスチェック**: http://localhost:3002/api/health
- **デバッグ情報**: http://localhost:3002/api/dev/debug

## 🔧 開発環境の特徴

### ポート設定
- **サーバー**: 3002 (デプロイ用と分離)
- **クライアント**: 5002 (デプロイ用と分離)
- **HMR**: 5003 (ホットリロード専用)

### 環境変数
開発環境では `env.development.local` ファイルが使用されます：
- ローカルデータベース接続
- 開発用セッション設定
- デバッグログ有効化
- セキュリティ設定緩和

### ファイルパス
- **アップロード**: `./uploads/dev/`
- **一時ファイル**: `./temp/dev/`
- **ログ**: `./logs/dev/`

## 📋 利用可能なコマンド

### 開発用コマンド
```bash
# 開発環境の起動
npm run dev:local              # サーバー + クライアント
npm run dev:local-server       # サーバーのみ
npm run dev:local-client       # クライアントのみ

# ポートクリア
npm run dev:ports              # 使用中のポートをクリア

# 完全セットアップ
npm run dev:setup              # ポートクリア + 開発環境起動
```

### デプロイ用コマンド（影響なし）
```bash
# デプロイ用のビルドと起動
npm run build                  # 本番用ビルド
npm run dev:production         # 本番環境設定で開発
npm run start                  # 本番サーバー起動
```

## 🗄️ データベース設定

### 開発用データベース
```sql
-- PostgreSQLで開発用DBを作成
CREATE DATABASE emergency_assistance_dev;
```

### 接続設定
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance_dev
```

## 🔍 デバッグ機能

### 開発専用エンドポイント
- `/api/health` - ヘルスチェック
- `/api/dev/debug` - 詳細デバッグ情報

### ログ設定
- 開発環境では詳細ログが出力されます
- リクエスト/レスポンスの詳細情報
- セッション情報の表示
- エラースタックトレースの表示

## 🛡️ セキュリティ設定

### 開発環境での緩和設定
- HTTPS不要（`secure: false`）
- CORS設定緩和
- セキュリティヘッダー緩和
- デバッグ情報表示

## 📁 ファイル構造

```
Emergency-Assistance/
├── env.development.local      # 開発環境設定
├── server/
│   └── index.dev.ts          # 開発用サーバー
├── client/
│   └── vite.config.dev.ts    # 開発用Vite設定
├── uploads/
│   └── dev/                  # 開発用アップロード
├── temp/
│   └── dev/                  # 開発用一時ファイル
└── logs/
    └── dev/                  # 開発用ログ
```

## 🚨 トラブルシューティング

### ポートが使用中の場合
```bash
npm run dev:ports
```

### データベース接続エラー
1. PostgreSQLが起動していることを確認
2. 開発用DBが作成されていることを確認
3. 接続情報を確認

### 環境変数が読み込まれない場合
1. `env.development.local` ファイルが存在することを確認
2. ファイルの構文エラーを確認

## 📝 注意事項

- 開発環境は本番環境と完全に分離されています
- 開発用の設定変更はデプロイに影響しません
- 開発用データベースは本番データベースと独立しています
- 開発用のファイルは `uploads/dev/` に保存されます

## 🔄 本番環境との切り替え

```bash
# 開発環境
npm run dev:local

# 本番環境設定で開発
npm run dev:production

# 本番ビルド
npm run build
``` 