# Azure Static Web Apps デプロイメントガイド

## 問題の解決策

### 1. 404エラーの解決

Azure Static Web Appsで404エラーが発生している問題を解決するために、以下の設定を行いました：

#### A. Azure Static Web Apps設定ファイル
- `staticwebapp.config.json` を作成
- APIルートの設定を追加
- CORS設定を適切に構成

#### B. Azure Functions APIエンドポイント
以下のAPIエンドポイントを作成：
- `/api/users` - ユーザー管理
- `/api/machines` - 機械管理
- `/api/machines/machine-types` - 機種管理
- `/api/knowledge-base` - ナレッジベース
- `/api/auth/me` - 認証確認
- `/api/flows` - フローデータ管理

### 2. 機種・機械番号データの取得

#### A. データベースクエリの修正
- 生のSQLクエリを使用してデータベースから直接データを取得
- Drizzle ORMの代わりに確実な方法でデータを取得

#### B. Azure Blob Storage連携
- `knowledge` コンテナとの連携を設定
- フローデータの取得と管理を実装

### 3. 応急処置データ管理

#### A. Azure Blob Storage設定
- コンテナ名: `knowledge`
- パス: `emergency-flows/`
- ファイル形式: JSON, 画像ファイル

#### B. フローデータ管理API
- フローファイルの一覧取得
- ファイルのアップロード・ダウンロード
- メタデータの管理

## デプロイメント手順

### 1. 環境変数の設定

GitHub Secretsに以下の値を設定：

```
AZURE_STATIC_WEB_APPS_API_TOKEN=your_token
AZURE_FUNCTION_APP_NAME=your_function_app_name
AZURE_FUNCTION_PUBLISH_PROFILE=your_publish_profile
VITE_API_BASE_URL=https://your-function-app.azurewebsites.net
```

### 2. Azure Storage設定

Azure Storage Accountで以下の設定：

```
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=knowledge
```

### 3. データベース設定

PostgreSQLデータベースの接続設定：

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## ファイル構成

```
├── api/                          # Azure Functions API
│   ├── users/                    # ユーザー管理API
│   ├── machines/                 # 機械管理API
│   ├── knowledge-base/           # ナレッジベースAPI
│   ├── auth/me/                  # 認証API
│   ├── flows/                    # フローデータAPI
│   ├── package.json              # API依存関係
│   ├── host.json                 # Azure Functions設定
│   └── local.settings.json       # ローカル設定
├── staticwebapp.config.json      # Azure Static Web Apps設定
├── .github/workflows/            # GitHub Actions
│   ├── frontend-deploy.yaml      # フロントエンドデプロイ
│   └── api-deploy.yaml           # APIデプロイ
└── client/                       # Reactフロントエンド
```

## トラブルシューティング

### 1. 404エラーが続く場合
- Azure Functionsが正しくデプロイされているか確認
- 環境変数が正しく設定されているか確認
- データベース接続が正常か確認

### 2. データが表示されない場合
- データベースにデータが存在するか確認
- APIエンドポイントが正しく動作しているか確認
- CORS設定が適切か確認

### 3. Azure Blob Storage接続エラー
- 接続文字列が正しいか確認
- コンテナが存在するか確認
- アクセス権限が適切か確認

## 次のステップ

1. GitHub Secretsを設定
2. デプロイメントワークフローを実行
3. アプリケーションの動作確認
4. 必要に応じて追加のAPIエンドポイントを実装

この設定により、Azure Static Web Appsでアプリケーションが正常に動作し、ユーザー管理、機種・機械番号のデータ取得、応急処置データ管理が可能になります。
