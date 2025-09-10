# Azure App Service 必須環境変数

デプロイ後にAzure portalで以下の環境変数を設定してください：

## 基本設定
```
NODE_ENV=production
SESSION_SECRET=emergency-assistance-session-secret-2025-secure
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
CORS_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net
```

## データベース接続
```
DATABASE_URL=postgresql://[ユーザー名]:[パスワード]@[サーバー名].postgres.database.azure.com:5432/[データベース名]?sslmode=require
```

## Azure Blob Storage (ファイルアップロード用)
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=[ストレージアカウント名];AccountKey=[アクセスキー];EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=emergency-assistance-images
```

## OpenAI API (チャット機能用)
```
OPENAI_API_KEY=sk-[あなたのOpenAI APIキー]
```

## 設定手順

1. Azure portalにログイン
2. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. 左メニューの「構成」→「アプリケーション設定」
4. 上記の環境変数を追加/更新
5. 「保存」をクリック
6. アプリが自動的に再起動されます

## データベース接続の確認

PostgreSQLサーバーのファイアウォール設定で以下を確認：
- Azure Services からの接続を許可
- 必要に応じて特定のIPアドレスを追加

## トラブルシューティング

### DB接続エラーの場合
1. `DATABASE_URL`の形式を確認
2. PostgreSQLサーバーのファイアウォール設定を確認
3. ユーザー名とパスワードを確認

### Blob Storage接続エラーの場合
1. `AZURE_STORAGE_CONNECTION_STRING`の形式を確認
2. ストレージアカウントのアクセスキーを確認
3. コンテナ名を確認

### API機能が動作しない場合
1. ブラウザの開発者ツールでCORSエラーを確認
2. `FRONTEND_URL`と`CORS_ORIGINS`の設定を確認
3. セッションクッキーの設定を確認
