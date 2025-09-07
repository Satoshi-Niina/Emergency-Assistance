# Azure App Serviceログ確認スクリプト
$ResourceGroup = "your-resource-group"
$AppName = "emergencyassistance-sv"

Write-Host "=== Azure App Service診断開始 ===" -ForegroundColor Green

# 1. アプリの状態確認
Write-Host "`n1. アプリケーション状態確認:" -ForegroundColor Yellow
az webapp show --resource-group $ResourceGroup --name $AppName --query "{name:name, state:state, defaultHostName:defaultHostName, httpsOnly:httpsOnly}" --output table

# 2. 起動コマンド確認
Write-Host "`n2. 起動コマンド確認:" -ForegroundColor Yellow
az webapp config show --resource-group $ResourceGroup --name $AppName --query "appCommandLine" --output tsv

# 3. アプリケーションログ取得（最新50行）
Write-Host "`n3. アプリケーションログ（最新50行）:" -ForegroundColor Yellow
az webapp log tail --resource-group $ResourceGroup --name $AppName --logs application

Write-Host "`n4. 環境変数確認:" -ForegroundColor Yellow
az webapp config appsettings list --resource-group $ResourceGroup --name $AppName --query "[?name=='NODE_ENV' || name=='PORT' || name=='WEBSITE_NODE_DEFAULT_VERSION'].{name:name, value:value}" --output table

Write-Host "`n5. 手動ヘルスチェック実行:" -ForegroundColor Yellow
$healthUrl = "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/health"
Write-Host "URL: $healthUrl"
try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 30
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`n=== 診断完了 ===" -ForegroundColor Green
