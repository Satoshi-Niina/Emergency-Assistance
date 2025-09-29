# Azure App Service デプロイエラー解決手順

## 問題の概要
1. `express`パッケージが見つからないエラー
2. デプロイプロファイルの認証情報が無効

## 解決手順

### 1. デプロイプロファイルの更新

#### Azure Portalでの操作:
1. Azure Portalにログイン
2. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. 「デプロイ」セクションの「デプロイセンター」をクリック
4. 「発行プロファイルのダウンロード」をクリック
5. ダウンロードしたファイルを開いて内容をコピー

#### GitHub Secretsの更新:
1. GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」を開く
2. `AZURE_WEBAPP_PUBLISH_PROFILE` シークレットを編集
3. 新しい発行プロファイルの内容を貼り付け
4. 「Update secret」をクリック

### 2. Azure App Service設定の確認

#### 必要な環境変数の設定:
Azure Portal → App Service → 設定 → アプリケーション設定で以下を設定:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
SESSION_SECRET=your_session_secret_here_minimum_32_characters
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your_openai_api_key_here
PG_SSL=require
```

#### Node.jsバージョンの確認:
1. App Service → 設定 → 全般設定
2. 「スタック設定」でNode.jsバージョンを20.19.3に設定

### 3. デプロイの再実行

#### GitHub Actionsでの再デプロイ:
1. GitHub リポジトリの「Actions」タブを開く
2. 「Backend CI/CD」ワークフローを選択
3. 「Run workflow」をクリック
4. デプロイの進行状況を確認

### 4. トラブルシューティング

#### ログの確認:
1. Azure Portal → App Service → 監視 → ログストリーム
2. エラーメッセージを確認

#### よくあるエラーと解決方法:

**`Cannot find package 'express'`**:
- `node_modules`が正しくインストールされていない
- `package.json`の依存関係を確認
- デプロイパッケージに`node_modules`が含まれているか確認

**`Publish profile is invalid`**:
- 発行プロファイルが期限切れまたは無効
- 新しい発行プロファイルをダウンロードして更新

**`Module not found`**:
- ESMモジュールの設定を確認
- `package.json`の`"type": "module"`を確認
- インポート文の構文を確認

### 5. 成功の確認

デプロイが成功したら、以下のエンドポイントで動作確認:

- ヘルスチェック: `https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health`
- Ping: `https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping`

## 注意事項

- 環境変数は機密情報を含むため、GitHubリポジトリにはコミットしない
- デプロイプロファイルは定期的に更新が必要
- Node.jsのバージョンはAzure App Serviceでサポートされているものを使用
