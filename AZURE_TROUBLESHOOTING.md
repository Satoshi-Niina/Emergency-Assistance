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

## よくあるエラーと解決方法

### 1. "Publish profile is invalid" エラー

**エラーメッセージ:**
```
Error: Deployment Failed, Error: Publish profile is invalid for app-name and slot-name provided. Provide correct publish profile credentials for app.
```

**原因:**
- Azure Service Principalの認証情報が無効
- 認証情報の期限切れ
- 権限不足

**解決方法:**

#### A. 新しいService Principalを作成

1. **Azure CLIでログイン**
   ```bash
   az login
   ```

2. **Service Principal作成**
   ```bash
   az ad sp create-for-rbac \
     --name "emergency-backend-deploy" \
     --role contributor \
     --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/your-resource-group/providers/Microsoft.Web/sites/emergency-backend \
     --sdk-auth
   ```

3. **出力されたJSONをGitHub Secretsに設定**
   - GitHubリポジトリ → Settings → Secrets and variables → Actions
   - `AZURE_CREDENTIALS` を更新

#### B. 権限の確認

Service Principalに以下の権限があることを確認：
- **Contributor** ロール（App Service用）
- **Azure Service Management** APIアクセス許可

### 2. "Resource not found" エラー

**原因:**
- App Service名が間違っている
- リソースグループ名が間違っている

**解決方法:**
1. Azure Portalで正しいApp Service名を確認
2. GitHub Secretsの `AZURE_WEBAPP_NAME` を更新

### 3. "Build failed" エラー

**原因:**
- 依存関係のインストールエラー
- TypeScriptコンパイルエラー
- 環境変数が不足

**解決方法:**
1. ローカルで `npm run build` を実行してエラーを確認
2. 必要な環境変数がGitHub Secretsに設定されているか確認

## デバッグ手順

### 1. Azure接続の確認

GitHub Actionsのログで以下を確認：
```
🔍 Azure接続を確認中...
✅ Azure接続確認完了
```

### 2. App Serviceの状態確認

```bash
az webapp show --name emergency-backend --resource-group your-resource-group
```

### 3. ログの確認

- **GitHub Actionsログ**: リポジトリ → Actions → 最新の実行
- **Azure App Serviceログ**: Azure Portal → App Service → ログストリーム

## 予防策

### 1. 定期的な認証情報の更新

Service Principalの認証情報は定期的に更新することを推奨：
- 90日ごとに新しいクライアントシークレットを作成
- 古い認証情報を削除

### 2. 最小権限の原則

Service Principalには必要最小限の権限のみを付与：
- 特定のApp Serviceのみにアクセス
- 読み取り専用権限の使用を検討

### 3. 環境変数の管理

機密情報はGitHub Secretsで管理：
- データベース接続文字列
- APIキー
- ストレージ接続文字列

## 緊急時の対応

### 1. 手動デプロイ

GitHub Actionsが失敗した場合の手動デプロイ：

```bash
# ローカルでビルド
npm run build

# Azure CLIでデプロイ
az webapp deployment source config-zip \
  --resource-group your-resource-group \
  --name emergency-backend \
  --src deployment.zip
```

### 2. ロールバック

前のバージョンに戻す：
1. Azure Portal → App Service → デプロイメントセンター
2. 前のデプロイメントを選択
3. 再デプロイを実行 