# APP_URL 設定の修正とログ確認手順

## 問題点

1. **APP_URL が実際のApp ServiceのURLと一致していない**
   - 実際のURL: `https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net`
   - 誤った設定: `https://emergency-backend-api.azurewebsites.net` (このApp Serviceは存在しない可能性)
   - **重要**: `APP_URL` は実際のApp ServiceのURLと完全に一致している必要があります

2. **ログストリームに何も表示されない**
   - 間違ったApp Serviceを参照している可能性
   - コンテナが起動していない可能性
   - ログ設定が無効になっている可能性

## 修正手順

### 1. GitHub Secrets の APP_URL を修正

GitHub リポジトリの Settings > Secrets and variables > Actions で以下を設定：

```
APP_URL=https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net
```
それでは
**重要:**
- `https://` を必ず含めてください
- **実際のApp ServiceのURLと完全に一致させる必要があります**
- Azure Portal > App Service > 概要 > URL で実際のURLを確認してください

### 2. App Service のログ設定を有効化（重要）

**ログストリームを表示するには、Azure Portalでの設定が必須です。**

Azure Portal で以下を設定：

1. **App Service > 監視 > App Service ログ**（最重要）
   - **アプリケーション ログ**: `ファイル システム` を選択して有効化
   - **詳細なエラー メッセージ**: `オン`
   - **失敗した要求トレース**: `オン`
   - **ログ レベル**: `詳細` または `情報`
   - **保存** をクリック（重要：保存しないと設定が反映されません）

2. **App Service > 監視 > ログストリーム**
   - ログストリームページを開く
   - 複数のログソースを選択：
     - ✅ **アプリケーション ログ**
     - ✅ **Web サーバー ログ**
     - ✅ **Docker ログ**（コンテナを使用している場合）

3. **App Service > 設定 > アプリケーション設定**（オプション）
   - `WEBSITES_ENABLE_APP_SERVICE_STORAGE`: 未設定でOK（デフォルトは `false`）
   - `DIAGNOSTICS_AZUREBLOBRETENTIONDAYS`: 未設定でOK（ログストリームには不要）

**重要**:
- 環境変数の設定よりも、**Azure Portalでの「App Service ログ」の設定が優先されます**
- 設定を変更した後は、**必ず「保存」をクリック**してください
- 保存後、App Serviceを再起動すると確実です

### 3. コンテナの起動状態を確認

Azure Portal で以下を確認：

1. **App Service > 概要**
   - **状態**: `実行中` になっているか
   - **URL**: 実際のURLを確認（例: `https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net`）
   - **App Service名**: `emergency-assistantapp-gwgscxcca5cahyb9` など、実際の名前を確認

2. **App Service > 開発ツール > SSH**
   - SSH でコンテナに接続して、プロセスを確認：
   ```bash
   ps aux | grep node
   ```

3. **App Service > 監視 > メトリック**
   - CPU 使用率、メモリ使用率を確認
   - リクエスト数が0のままか確認

### 4. 手動でログを確認

Azure CLI を使用：

```bash
# ログストリームを確認（実際のApp Service名を使用）
az webapp log tail \
  --name emergency-assistantapp-gwgscxcca5cahyb9 \
  --resource-group <RESOURCE_GROUP>

# ログをダウンロード（実際のApp Service名を使用）
az webapp log download \
  --name emergency-assistantapp-gwgscxcca5cahyb9 \
  --resource-group <RESOURCE_GROUP> \
  --log-file app-service-logs.zip
```

**重要**: `--name` には実際のApp Service名を指定してください。Azure Portal > App Service > 概要で確認できます。

### 5. App Service を再起動

```bash
# App Service を再起動（実際のApp Service名を使用）
az webapp restart \
  --name emergency-assistantapp-gwgscxcca5cahyb9 \
  --resource-group <RESOURCE_GROUP>

# 再起動後、60秒待ってから確認（実際のURLを使用）
sleep 60
curl https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/health
```

### 6. コンテナログを直接確認

Azure Portal > App Service > 監視 > ログストリーム で以下を確認：

- **アプリケーション ログ**: サーバーの起動ログ
- **Web サーバー ログ**: HTTP リクエストログ
- **Docker ログ**: コンテナの起動ログ

## 期待されるログ出力

サーバーが正常に起動している場合、以下のようなログが表示されるはずです：

```
🚀 Azure Server Starting (ES Module)...
📍 Working directory: /app
🌍 Environment: production
🔌 Port: 8080
📋 Azure Environment Variables:
   WEBSITE_SITE_NAME: emergency-backend-api
   ...
✅ CORS Allowed Origins: [...]
🌐 Static Web App URL: https://...
🚀 Server listening on port 8080
```

## ログが表示されない場合の対処

### 対処1: ログ設定を有効化（最も重要）

Azure Portal > App Service > 監視 > App Service ログ で：
1. **アプリケーション ログ**: `ファイル システム` を選択して有効化
2. **詳細なエラー メッセージ**: `オン`
3. **失敗した要求トレース**: `オン`
4. **ログ レベル**: `詳細` または `情報`
5. **保存** をクリック（必須）
6. App Serviceを再起動

**注意**: 環境変数 `WEBSITES_ENABLE_APP_SERVICE_STORAGE` や `DIAGNOSTICS_AZUREBLOBRETENTIONDAYS` は設定不要です。Azure Portalでの設定が優先されます。

### 対処2: コンテナを再デプロイ

GitHub Actions で再デプロイを実行：
- 最新のコミットをプッシュ
- または、ワークフローを手動実行

### 対処3: App Service の設定を確認

Azure Portal > App Service > 設定 > 全般設定 で：
- **常時接続**: `オン`
- **ARR アフィニティ**: `オフ`（必要に応じて）
- **HTTP バージョン**: `2.0`

### 対処4: セーフモードで起動

一時的にセーフモードで起動して、ログを確認：

Azure Portal > App Service > 設定 > アプリケーション設定 で追加：
```
SAFE_MODE=true
BYPASS_DB_FOR_LOGIN=true
```

保存して再起動後、ログを確認。

## 確認チェックリスト

- [ ] `APP_URL` が実際のApp ServiceのURLと完全に一致している
- [ ] `APP_URL` に `https://` が含まれている
- [ ] `WEBAPP_NAME` が実際のApp Service名と一致している
- [ ] **Azure Portal > App Service > 監視 > App Service ログ** で「アプリケーション ログ」が有効化されている
- [ ] **App Service ログの設定を「保存」した**
- [ ] App Service の状態が「実行中」
- [ ] ログストリームでログが表示される
- [ ] `/health` エンドポイントが応答する
- [ ] コンテナが正常に起動している

**注意**: `WEBSITES_ENABLE_APP_SERVICE_STORAGE` や `DIAGNOSTICS_AZUREBLOBRETENTIONDAYS` の環境変数は設定不要です。

## 次のステップ

1. **Azure Portalで実際のApp ServiceのURLと名前を確認**
   - App Service > 概要 > URL
   - App Service > 概要 > App Service名

2. **GitHub Secretsを実際の値に修正**
   - `APP_URL`: 実際のURL（例: `https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net`）
   - `WEBAPP_NAME`: 実際のApp Service名（例: `emergency-assistantapp-gwgscxcca5cahyb9`）

3. **Azure Portalでログ設定を有効化（最重要）**
   - App Service > 監視 > App Service ログ
   - 「アプリケーション ログ」を `ファイル システム` に設定して有効化
   - **必ず「保存」をクリック**

4. App Service を再起動

5. ログストリームでログを確認（正しいApp Serviceを参照していることを確認）

6. 問題が解決しない場合は、上記の対処方法を試す

**重要**: 環境変数 `WEBSITES_ENABLE_APP_SERVICE_STORAGE` や `DIAGNOSTICS_AZUREBLOBRETENTIONDAYS` は設定不要です。Azure Portalでの設定が優先されます。

