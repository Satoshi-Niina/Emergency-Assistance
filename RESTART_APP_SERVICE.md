# Azure App Service 再起動手順

## 問題
GitHubからデプロイしても古いコードが実行され続ける可能性があります。

## 解決策

### 方法1: Azureポータルで再起動
1. Azure Portal → App Service `emergency-assistantapp`
2. 左メニュー「概要」
3. 上部の「再起動」ボタンをクリック
4. 確認ダイアログで「はい」

### 方法2: Azure CLIで再起動
```powershell
az webapp restart --name emergency-assistantapp --resource-group rg-Emergencyassistant-app
```

### 方法3: デプロイキャッシュをクリア
```powershell
# デプロイメントセンターで再デプロイ
az webapp deployment source sync --name emergency-assistantapp --resource-group rg-Emergencyassistant-app
```

## 確認

再起動後、以下を確認：

### 1. ログストリーム確認
```
[Config] BLOB_PREFIX='' (length: 0)
[Blob] Configuration: Container=knowledge, BlobPrefix=''
[Blob] Normalized path: images/chat-exports/xxx.jpg -> images/chat-exports/xxx.jpg
```

### 2. 診断エンドポイント
```
https://emergency-assistantapp.azurewebsites.net/api/_diag/blob-detailed
```

`sampleImageBlobs[0].name` が `images/chat-exports/xxx.jpg` になっているか確認

### 3. 環境変数確認
```
https://emergency-assistantapp.azurewebsites.net/api/_diag/env
```

`BLOB_PREFIX` または `AZURE_KNOWLEDGE_BASE_PATH` が空または未設定であることを確認
