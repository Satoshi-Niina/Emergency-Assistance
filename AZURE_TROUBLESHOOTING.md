# Azure デプロイ トラブルシューティングガイド

## 問題の概要
Azureにデプロイしたフロントエンドとサーバー間で以下のエラーが発生：
- 405 Method Not Allowed エラー
- 404 Not Found エラー
- CORS設定の問題

## 解決済みの修正

### 1. 認証ルートの修正
- `server/index.ts` で認証ルートを明示的に登録
- `/api/auth` プレフィックスで認証ルートを統一

### 2. CORS設定の改善
- Azure Static Web AppsとAzure Web Appsのドメインを許可
- デバッグログを追加してCORS設定を確認可能

### 3. デバッグ機能の追加
- サーバー側とクライアント側にデバッグログを追加
- 環境変数の確認スクリプトを作成

## Azure環境変数の設定

### 必須環境変数
```bash
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.azurestaticapps.net
DATABASE_URL=your-database-connection-string
SESSION_SECRET=your-session-secret
```

### 推奨環境変数
```bash
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string
OPENAI_API_KEY=your-openai-api-key
```

## デバッグ手順

### 1. 環境変数の確認
```bash
# サーバー側で実行
node server/debug-env.js
```

### 2. サーバーログの確認
Azure Web Appのログで以下を確認：
- CORS設定の出力
- 認証リクエストの受信ログ
- エラーメッセージ

### 3. クライアント側の確認
ブラウザの開発者ツールで以下を確認：
- ネットワークタブでのリクエスト/レスポンス
- コンソールでのAPI設定ログ

## よくある問題と解決策

### 1. 405 Method Not Allowed
**原因**: ルートが正しく登録されていない
**解決策**: 
- 認証ルートが `/api/auth` プレフィックスで登録されていることを確認
- サーバーログでルート登録の確認

### 2. 404 Not Found
**原因**: APIエンドポイントのパスが一致していない
**解決策**:
- フロントエンドのAPI設定で `/api/auth/login` を使用
- サーバー側で `/api/auth/login` エンドポイントが利用可能

### 3. CORSエラー
**原因**: フロントエンドのドメインが許可されていない
**解決策**:
- `FRONTEND_URL` 環境変数を正しく設定
- Azure Static Web Appsのドメインを許可リストに追加

## テスト手順

### 1. ヘルスチェック
```bash
curl https://your-backend-api.azurewebsites.net/api/health
```

### 2. 認証エンドポイントのテスト
```bash
curl -X POST https://your-backend-api.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 3. CORSプリフライトのテスト
```bash
curl -X OPTIONS https://your-backend-api.azurewebsites.net/api/auth/login \
  -H "Origin: https://your-frontend-app.azurestaticapps.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

## 追加の確認事項

### 1. Azure Web App設定
- Node.js バージョンが正しく設定されているか
- アプリケーション設定で環境変数が設定されているか
- スケーリング設定が適切か

### 2. ネットワーク設定
- ファイアウォール設定
- VNET統合の設定
- プライベートエンドポイントの設定

### 3. セキュリティ設定
- HTTPS設定
- 認証設定
- アクセス制御

## ログの確認方法

### Azure Web App ログ
1. Azure PortalでWeb Appを開く
2. 「監視」→「ログストリーム」を選択
3. リアルタイムログを確認

### アプリケーションログ
1. 「監視」→「ログ」を選択
2. カスタムクエリでログを検索
3. エラーログを特定

## サポート情報

問題が解決しない場合は、以下を確認してください：
1. サーバーログの詳細
2. クライアント側のネットワークタブ
3. 環境変数の設定状況
4. Azure Web Appの設定 