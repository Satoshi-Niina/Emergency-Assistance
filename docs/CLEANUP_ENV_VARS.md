# App Service環境変数のクリーンアップ手順

## 🎯 目的

App Serviceに古い環境変数が残っている場合、GitHubシークレットから正しく設定されない可能性があります。
この手順では、古い環境変数を削除してから、GitHubシークレットから再設定します。

## 📋 前提条件

- Azure CLIがインストールされていること
- Azureにログインしていること
- App Serviceのリソースグループ名とアプリ名が分かっていること

## 🔍 ステップ1: 現在の環境変数を確認

まず、現在設定されている環境変数を確認します：

```powershell
# リソースグループ名とApp Service名を設定
$RESOURCE_GROUP = "<your-resource-group-name>"
$WEBAPP_NAME = "<your-app-service-name>"

# BLOBストレージ関連の環境変数を確認
az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')]" `
  --output table
```

**確認すべき環境変数**:
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_CONTAINER_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY` (古い設定の可能性)
- `BLOB_PREFIX` (オプション)

## 🗑️ ステップ2: 古い環境変数を削除

### 方法1: 個別に削除（推奨）

```powershell
# 各環境変数を個別に削除
az webapp config appsettings delete `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --setting-names AZURE_STORAGE_CONNECTION_STRING AZURE_STORAGE_ACCOUNT_NAME AZURE_STORAGE_CONTAINER_NAME AZURE_STORAGE_ACCOUNT_KEY BLOB_PREFIX
```

### 方法2: すべてのBLOB関連を一括削除

```powershell
# 現在の設定を取得して、BLOB関連のみを抽出して削除
$settings = az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')].name" `
  --output tsv

# 各設定を削除
foreach ($setting in $settings) {
    az webapp config appsettings delete `
      --resource-group $RESOURCE_GROUP `
      --name $WEBAPP_NAME `
      --setting-names $setting
    Write-Host "✅ Deleted: $setting"
}
```

## ✅ ステップ3: 削除の確認

削除が完了したことを確認します：

```powershell
# BLOB関連の環境変数が削除されたか確認
az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')]" `
  --output table
```

結果が空の配列 `[]` または何も表示されなければ、削除成功です。

## 🔄 ステップ4: GitHubシークレットの確認

GitHubシークレットが正しく設定されているか確認します：

1. GitHubリポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions**
3. 以下のシークレットが存在するか確認：
   - ✅ `AZURE_STORAGE_CONNECTION_STRING`
   - ✅ `AZURE_STORAGE_ACCOUNT_NAME`
   - ✅ `AZURE_STORAGE_CONTAINER_NAME`
   - ⚠️ `BLOB_PREFIX` (オプション)

**シークレットが存在しない場合**:
- [BLOB_SETUP.md](BLOB_SETUP.md) を参照して設定してください

## 🚀 ステップ5: CI/CDで再デプロイ

GitHubシークレットから環境変数を再設定するため、CI/CDを実行します：

### 方法1: 新しいコミットをプッシュ

```bash
# 空のコミットを作成してプッシュ
git commit --allow-empty -m "Trigger deployment to refresh environment variables"
git push origin main
```

### 方法2: GitHub Actionsを手動実行

1. GitHubリポジトリを開く
2. **Actions** タブを開く
3. **Deploy Server (Docker Container)** ワークフローを選択
4. **Run workflow** をクリック
5. ブランチを選択して実行

## 🔍 ステップ6: デプロイ後の確認

デプロイ完了後、環境変数が正しく設定されたか確認します：

```powershell
# 環境変数の確認
az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?name=='AZURE_STORAGE_CONNECTION_STRING' || name=='AZURE_STORAGE_ACCOUNT_NAME' || name=='AZURE_STORAGE_CONTAINER_NAME' || name=='BLOB_PREFIX'].{name:name, value:value}" `
  --output table
```

**期待される結果**:
- `AZURE_STORAGE_CONNECTION_STRING`: 接続文字列が表示される（値はマスクされる）
- `AZURE_STORAGE_ACCOUNT_NAME`: ストレージアカウント名が表示される
- `AZURE_STORAGE_CONTAINER_NAME`: コンテナ名が表示される（通常は `knowledge`）
- `BLOB_PREFIX`: 設定されている場合のみ表示される

## 🧪 ステップ7: BLOB接続のテスト

環境変数が設定されたら、BLOB接続をテストします：

```powershell
# App Serviceのログを確認してBLOB接続の状態を確認
az webapp log tail `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --provider application
```

**正常なログの例**:
```
✅ BLOB service client initialized with connection string
✅ BLOB Storage Environment Variables:
   AZURE_STORAGE_CONNECTION_STRING: [SET] (length: 180)
   AZURE_STORAGE_CONTAINER_NAME: knowledge
   AZURE_STORAGE_ACCOUNT_NAME: [SET]
```

## 📝 完全なスクリプト例

以下は、すべての手順を自動化したPowerShellスクリプトです：

```powershell
# 設定
$RESOURCE_GROUP = "<your-resource-group-name>"
$WEBAPP_NAME = "<your-app-service-name>"

Write-Host "🔍 Step 1: Checking current environment variables..." -ForegroundColor Cyan
$currentSettings = az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')].name" `
  --output tsv

if ($currentSettings) {
    Write-Host "Found existing settings: $currentSettings" -ForegroundColor Yellow
    
    Write-Host "🗑️ Step 2: Deleting old environment variables..." -ForegroundColor Cyan
    az webapp config appsettings delete `
      --resource-group $RESOURCE_GROUP `
      --name $WEBAPP_NAME `
      --setting-names $currentSettings
    
    Write-Host "✅ Deleted old settings" -ForegroundColor Green
} else {
    Write-Host "✅ No old settings found" -ForegroundColor Green
}

Write-Host "✅ Step 3: Verification..." -ForegroundColor Cyan
$remaining = az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $WEBAPP_NAME `
  --query "[?contains(name, 'AZURE_STORAGE') || contains(name, 'BLOB')]" `
  --output table

if ($remaining -eq $null -or $remaining.Count -eq 0) {
    Write-Host "✅ All old settings removed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some settings still remain: $remaining" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Step 4: Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify GitHub Secrets are set correctly"
Write-Host "2. Trigger a new deployment (git push or manual workflow run)"
Write-Host "3. Verify environment variables are set after deployment"
```

## ⚠️ 注意事項

1. **削除前にバックアップ**: 重要な設定値は事前にメモしておくことを推奨します
2. **ダウンタイム**: 環境変数を削除すると、アプリが一時的に動作しなくなる可能性があります
3. **即座に再デプロイ**: 削除後はすぐにCI/CDを実行して、環境変数を再設定してください
4. **GitHubシークレット**: 削除前にGitHubシークレットが正しく設定されていることを確認してください

## 🔗 関連ドキュメント

- [BLOB_SETUP.md](BLOB_SETUP.md) - GitHubシークレットの設定方法
- [TROUBLESHOOTING_BLOB.md](TROUBLESHOOTING_BLOB.md) - BLOB接続のトラブルシューティング
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - デプロイメントチェックリスト

