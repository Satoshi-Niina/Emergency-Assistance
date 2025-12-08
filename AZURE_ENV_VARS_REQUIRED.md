# Azure本番環境に必要な環境変数一覧

## 🔴 必須環境変数（本番デプロイで必ず設定）

### データベース接続
```
DATABASE_URL=postgresql://user:password@host:port/dbname
PG_SSL=require
```

### ストレージモード
```
STORAGE_MODE=azure
```
**重要**: 本番環境では`azure`または`blob`に設定。`local`だと画像が表示されません。

### Azure BLOBストレージ
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_ACCOUNT_NAME=rgemergencyassistantb25b
AZURE_STORAGE_ACCOUNT_KEY=QVvpMTeeNO+D8XHpe82kFkGx5b9X...
AZURE_STORAGE_CONTAINER_NAME=knowledge
BLOB_PREFIX=knowledge-base/
```

### ナレッジベースパス
```
AZURE_KNOWLEDGE_BASE_PATH=knowledge-base
```
**重要**: BLOBストレージ内のベースパスを指定。フロー保存パスの基準になります。

### セキュリティ
```
SESSION_SECRET=<32文字以上のランダム文字列>
JWT_SECRET=<32文字以上のランダム文字列>
```

### OpenAI API
```
OPENAI_API_KEY=sk-proj-...
OPENAI_MAX_TOKENS=2000
```

### フロントエンドURL
```
FRONTEND_URL=https://happy-bush-083160b00.3.azurestaticapps.net
STATIC_WEB_APP_URL=https://happy-bush-083160b00.3.azurestaticapps.net
```

## 🟡 オプション環境変数

### デバッグ設定
```
DEBUG_MODE=false
VERBOSE_LOGGING=false
NODE_ENV=production
```

### Webサイトキャッシュ
```
WEBSITE_DYNAMIC_CACHE=<値を表示する>
WEBSITE_LOCAL_CACHE_OPTION=Never
WEBSITE_NODE_DEFAULT_VERSION=<値を表示する>
WEBSITE_RUN_FROM_PACKAGE=0
```

## 📋 現在の設定確認方法

Azure Portalで以下を確認：
1. App Service → 設定 → 構成 → アプリケーション設定
2. 上記の環境変数が全て設定されているか確認
3. 特に`STORAGE_MODE=azure`が設定されているか確認

## ⚠️ よくある問題と解決方法

### 問題1: 画像が表示されない
**原因**: `STORAGE_MODE`が`local`になっている、または未設定
**解決**: `STORAGE_MODE=azure`に設定

### 問題2: フローが保存されない
**原因**: `AZURE_KNOWLEDGE_BASE_PATH`が未設定、またはBLOB接続情報が不正
**解決**: 
- `AZURE_KNOWLEDGE_BASE_PATH=knowledge-base`を設定
- `AZURE_STORAGE_CONNECTION_STRING`が正しいか確認
- `BLOB_PREFIX=knowledge-base/`が設定されているか確認

### 問題3: 画像アップロードが失敗する
**原因**: BLOBストレージへの書き込み権限がない
**解決**: 
- `AZURE_STORAGE_ACCOUNT_KEY`が正しいか確認
- コンテナ`knowledge`が存在するか確認
- コンテナのアクセスレベルを確認（プライベートでOK）

## 🔧 設定手順

### Azure Portalでの設定
1. Azure Portal → App Service → 設定 → 構成
2. 「新しいアプリケーション設定」をクリック
3. 上記の環境変数を1つずつ追加
4. 「保存」をクリック
5. アプリケーションが再起動されます

### Azure CLIでの設定（一括設定）
```bash
az webapp config appsettings set --resource-group <リソースグループ名> --name emergency-assistantapp --settings \
  STORAGE_MODE=azure \
  AZURE_STORAGE_CONTAINER_NAME=knowledge \
  BLOB_PREFIX=knowledge-base/ \
  AZURE_KNOWLEDGE_BASE_PATH=knowledge-base
```

## ✅ 設定後の確認

1. アプリケーションログを確認
   ```
   🔗 画像URL生成: ... (STORAGE_MODE: azure)
   📦 BLOB取得: knowledge-base/images/...
   ```

2. 履歴管理で画像が表示されるか確認

3. フロー生成後、フロー一覧に表示されるか確認

4. 画像アップロードが成功するか確認
