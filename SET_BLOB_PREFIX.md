# Azure CLI で環境変数を設定

## 現在の環境変数を確認
```powershell
az webapp config appsettings list --name emergency-assistantapp --resource-group rg-Emergencyassistant-app --query "[?name=='BLOB_PREFIX']"
```

## BLOB_PREFIX を設定
```powershell
az webapp config appsettings set --name emergency-assistantapp --resource-group rg-Emergencyassistant-app --settings BLOB_PREFIX=knowledge-base
```

## App Service を再起動
```powershell
az webapp restart --name emergency-assistantapp --resource-group rg-Emergencyassistant-app
```

## 設定を確認
```powershell
Start-Sleep -Seconds 30
Invoke-RestMethod -Uri "https://emergency-assistantapp.azurewebsites.net/api/_diag/blob-detailed" | Select-Object status, @{Name='BLOB_PREFIX';Expression={$_.config.blobPrefix}}
```

## 期待される結果
```
status  : healthy
BLOB_PREFIX : knowledge-base
```
