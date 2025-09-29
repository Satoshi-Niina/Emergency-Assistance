# Azure Web App Publish Profile 更新手順

## 問題
```
Error: Deployment Failed, Error: Publish profile is invalid for app-name and slot-name provided. 
Provide correct publish profile credentials for app.
```

## 解決手順

### 1. Azure Portal で新しいPublish Profileをダウンロード

1. Azure Portal にログイン
2. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. **「デプロイ」** → **「デプロイセンター」** をクリック
4. **「発行プロファイルのダウンロード」** をクリック
5. ダウンロードした `.PublishSettings` ファイルを開く

### 2. GitHub Secrets の更新

1. GitHub リポジトリの **「Settings」** → **「Secrets and variables」** → **「Actions」** を開く
2. **`AZURE_WEBAPP_PUBLISH_PROFILE`** シークレットを編集
3. 新しい発行プロファイルの **XML内容全体** をコピー&ペースト
4. **「Update secret」** をクリック

### 3. Azure App Service の設定確認

#### 基本設定:
```
プラットフォーム: Linux
Node.js バージョン: 20.19.3 (または 20 LTS)
Always On: 有効
スタートアップコマンド: npm start
```

#### 環境変数 (App Settings):
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### 4. デプロイの再実行

1. GitHub リポジトリの **「Actions」** タブを開く
2. **「Backend CI/CD」** ワークフローを選択
3. **「Run workflow」** をクリック
4. デプロイの進行状況を確認

### 5. トラブルシューティング

#### ログの確認:
1. Azure Portal → App Service → 監視 → ログストリーム
2. GitHub Actions → ワークフロー実行 → ログ

#### よくある問題:
- Publish Profile の有効期限切れ
- Azure App Service の設定不備
- Node.js バージョンの不一致
- 環境変数の設定漏れ

## 注意事項

- Publish Profile は定期的に更新が必要
- Azure App Service の設定変更後は再起動が必要
- Node.js 20+ を使用する場合は、すべてのワークフローで一貫したバージョンを使用
