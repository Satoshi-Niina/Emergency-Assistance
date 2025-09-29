# Azure App Service デプロイプロファイル更新手順

## 問題
- Deployment Failed: Publish profile is invalid
- ヘルスチェックタイムアウト

## 解決手順

### 1. 新しい発行プロファイルのダウンロード

#### Azure Portal での操作:
1. Azure Portal にログイン
2. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. **「デプロイ」** → **「デプロイセンター」** をクリック
4. **「発行プロファイルのダウンロード」** をクリック
5. ダウンロードした `.PublishSettings` ファイルを開く

### 2. GitHub Secrets の更新

#### GitHub での操作:
1. GitHub リポジトリの **「Settings」** → **「Secrets and variables」** → **「Actions」** を開く
2. **`AZURE_WEBAPP_PUBLISH_PROFILE`** シークレットを編集
3. 新しい発行プロファイルの **XML内容全体** をコピー&ペースト
4. **「Update secret」** をクリック

### 3. 発行プロファイルの内容例

```xml
<publishData>
  <publishProfile profileName="Emergencyassistance-sv - Web Deploy" publishMethod="MSDeploy" publishUrl="emergencyassistance-sv-fbanemhrbshuf9bd.scm.japanwest-01.azurewebsites.net:443" msdeploySite="Emergencyassistance-sv" userName="$Emergencyassistance-sv" userPWD="新しいパスワード" destinationAppUrl="https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites">
    <databases />
  </publishProfile>
  <!-- 他のプロファイルも含める -->
</publishData>
```

### 4. Azure Portal での設定確認

#### 全般設定:
```
スタック: Node
メジャーバージョン: Node 20
マイナーバージョン: Node 20 LTS
スタートアップコマンド: npm start
```

#### 環境変数 (App Settings):
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your_openai_api_key_here
PG_SSL=require
```

### 5. 設定保存と再起動

1. **「保存」** をクリック
2. **「概要」** ページで **「再起動」** をクリック
3. 再起動完了まで待機（約2-3分）

### 6. デプロイの再実行

1. GitHub Actions で **Backend CI/CD** を実行
2. ログで以下を確認：
   ```
   ✅ Express found in copied node_modules
   ✅ Deploy to Azure Web App: Success
   ✅ All health checks passed!
   ```

### 7. ログストリームでの確認

Azure Portal → App Service → **「監視」** → **「ログストリーム」** で以下を確認：

```
npm start
node production-server.js
🚀 Server running on 0.0.0.0:8080
```

## トラブルシューティング

### まだタイムアウトする場合:
1. **スタートアップコマンド** を以下に変更：
   ```bash
   cd /home/site/wwwroot && npm install --production && npm start
   ```

2. **環境変数** で以下を追加：
   ```
   WEBSITES_NODE_DEFAULT_VERSION=20.19.3
   ```

### デプロイプロファイルがまだ無効な場合:
1. **新しい App Service** を作成
2. **新しい発行プロファイル** をダウンロード
3. **GitHub Secrets** を更新

## 重要なポイント

- **発行プロファイルは定期的に更新が必要**
- **スタートアップコマンドは `npm start` が重要**
- **環境変数は必須**
- **再起動後にデプロイを実行**
