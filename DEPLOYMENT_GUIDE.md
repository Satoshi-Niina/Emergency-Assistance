# デプロイガイド

## 修正内容

### 問題の原因
本番環境で `/api/files/import` が500エラーを返していた原因:

1. **ファイルアップロード処理が未実装** - スタブコードのみで実際の処理がなかった
2. **環境分離の欠如** - ローカルとAzure環境でストレージの切り替えが適切に行われていなかった
3. **Multerミドルウェアの未適用** - ファイルアップロードに必要なmiddlewareが設定されていなかった

### 実装した修正

#### 1. 環境に応じたストレージの完全分離

**ローカル環境:**
```
- ストレージ: ローカルファイルシステム
- 保存先: uploads/imports/
- 判定: STORAGE_MODE=local または Azure環境変数なし
```

**本番環境 (Azure):**
```
- ストレージ: Azure Blob Storage
- コンテナ: knowledge
- 保存先: knowledge-base/imports/
- 判定: STORAGE_MODE=azure または WEBSITE_SITE_NAME存在
```

#### 2. ファイルインポート処理の実装

**server/src/api/files/index.mjs**
- Multerでファイルをパース
- 環境判定 (`isAzureEnvironment()`)
- Azure: Blob Storage にアップロード
- ローカル: ローカルファイルシステムに保存
- 詳細なログ出力

#### 3. Multerミドルウェアの統合

**server/src/app.mjs**
- `files` モジュールに対して自動的にmulterミドルウェアを適用
- `/api/files/import` エンドポイントに `upload.single('file')` を設定

## デプロイ手順

### 前提条件

本番環境 (Azure App Service) に以下の環境変数が設定されていることを確認:

```bash
# 必須
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=knowledge
NODE_ENV=production

# 推奨
STORAGE_MODE=azure  # または自動判定に任せる
BLOB_PREFIX=knowledge-base  # Blob内のパスプレフィックス
```

### 環境変数の確認

```powershell
az webapp config appsettings list `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app `
  --query "[?name=='AZURE_STORAGE_CONNECTION_STRING' || name=='STORAGE_MODE' || name=='NODE_ENV'].{name:name, value:value}" `
  --output table
```

### デプロイ方法

#### オプション 1: GitHub経由 (推奨)

```powershell
# コミットをプッシュ (既に完了)
git push origin main
```

GitHub Actionsが設定されていれば自動デプロイされます。

#### オプション 2: Azure CLI Zip Deploy

```powershell
# 1. ワークスペースルートに移動
cd "c:\Users\Satoshi Niina\OneDrive\Desktop\system\Emergency-Assistance"

# 2. サーバーディレクトリをZIP化
Compress-Archive -Path server\* -DestinationPath server-deploy.zip -Force

# 3. Azureにデプロイ
az webapp deploy `
  --resource-group rg-Emergencyassistant-app `
  --name emergency-assistantapp `
  --src-path server-deploy.zip `
  --type zip
```

#### オプション 3: Kudu REST API

```powershell
$user = '$emergency-assistantapp'
$password = 'YOUR_PASSWORD_HERE'  # 実際のパスワードを使用
$url = 'https://emergency-assistantapp.scm.azurewebsites.net/api/zipdeploy'

# ZIP作成
Compress-Archive -Path server\* -DestinationPath server-deploy.zip -Force

# アップロード
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$user:$password"))
Invoke-RestMethod -Uri $url `
  -Headers @{Authorization=("Basic {0}" -f $base64AuthInfo)} `
  -Method POST `
  -InFile server-deploy.zip `
  -ContentType "multipart/form-data"
```

### デプロイ後の確認

#### 1. アプリケーションを再起動

```powershell
az webapp restart `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app
```

#### 2. ログを確認

```powershell
# リアルタイムログ
az webapp log tail `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app
```

#### 3. エンドポイントをテスト

```powershell
$baseUrl = "https://emergency-assistantapp.azurewebsites.net"

# Health check
Invoke-WebRequest "$baseUrl/api/health" -UseBasicParsing

# Knowledge base stats
Invoke-WebRequest "$baseUrl/api/knowledge-base/stats" -UseBasicParsing

# Settings RAG
Invoke-WebRequest "$baseUrl/api/settings/rag" -UseBasicParsing

# Admin dashboard
Invoke-WebRequest "$baseUrl/api/admin/dashboard" -UseBasicParsing
```

#### 4. ファイルインポートをテスト

```powershell
# テストファイルを作成
"Test content" | Out-File -FilePath test.txt -Encoding UTF8

# アップロード
$form = @{
    file = Get-Item -Path test.txt
}

Invoke-WebRequest `
  -Uri "$baseUrl/api/files/import" `
  -Method POST `
  -Form $form `
  -UseBasicParsing
```

## トラブルシューティング

### 500エラーが継続する場合

1. **環境変数を確認**
```powershell
az webapp config appsettings list `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app `
  --output table
```

2. **ログを詳細に確認**
```powershell
az webapp log download `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app `
  --log-file latest-logs.zip

# 解凍してログを確認
Expand-Archive latest-logs.zip -DestinationPath logs-extracted
Get-Content logs-extracted/LogFiles/Application/*.log | Select-Object -Last 100
```

3. **Blob Storage接続を確認**
```powershell
# コンテナの存在確認
az storage container list `
  --connection-string "YOUR_CONNECTION_STRING" `
  --query "[?name=='knowledge']" `
  --output table
```

### Multerエラーが発生する場合

エラー: `Unexpected field` または `File upload failed`

**解決策:**
- クライアント側で `FormData` に `file` という名前でファイルを添付
- `Content-Type: multipart/form-data` ヘッダーを設定しない（ブラウザが自動設定）

### Blobアップロードエラー

エラー: `Blob Service Client is not available`

**解決策:**
```powershell
# 接続文字列を確認
az webapp config appsettings set `
  --name emergency-assistantapp `
  --resource-group rg-Emergencyassistant-app `
  --settings AZURE_STORAGE_CONNECTION_STRING="YOUR_CONNECTION_STRING"
```

## 環境変数リファレンス

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage接続文字列 | `DefaultEndpointsProtocol=https;...` |
| `AZURE_STORAGE_CONTAINER_NAME` | コンテナ名 | `knowledge` |
| `NODE_ENV` | 環境 | `production` |

### オプション環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `STORAGE_MODE` | ストレージモード | `auto` (自動判定) |
| `BLOB_PREFIX` | Blobパスプレフィックス | `knowledge-base` |

## ローカル開発

ローカル環境では自動的にローカルファイルシステムを使用します：

```bash
# .env.development
NODE_ENV=development
STORAGE_MODE=local
```

ローカルでBlobStorageをテストする場合:

```bash
# .env.development
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=knowledge
BLOB_PREFIX=knowledge-base
```

## まとめ

- ✅ ローカルと本番のストレージを完全に分離
- ✅ 環境に応じた自動切り替え
- ✅ 詳細なログ出力
- ✅ エラーハンドリング強化
- ✅ Multerミドルウェアの統合

これで本番環境でのファイルインポートが正常に動作するはずです。
