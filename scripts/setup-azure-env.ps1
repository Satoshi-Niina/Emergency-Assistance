# Azure App Service環境変数設定スクリプト - 503エラー対策
$ResourceGroup = "your-resource-group"
$AppName = "emergencyassistance-sv"

Write-Host "=== Azure App Service環境変数設定 ===" -ForegroundColor Green

# 重要な環境変数を設定
$envVars = @{
    "NODE_ENV" = "production"
    "WEBSITE_NODE_DEFAULT_VERSION" = "20.x"
    "SCM_COMMAND_IDLE_TIMEOUT" = "300"
    "WEBSITE_TIME_ZONE" = "Asia/Tokyo"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
}

foreach ($key in $envVars.Keys) {
    Write-Host "Setting $key = $($envVars[$key])" -ForegroundColor Yellow
    az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings "$key=$($envVars[$key])"
}

# Startup commandを設定
Write-Host "Setting startup command: npm start" -ForegroundColor Yellow
az webapp config set --resource-group $ResourceGroup --name $AppName --startup-file "npm start"

Write-Host "=== 設定完了 ===" -ForegroundColor Green

# 設定確認
Write-Host "`n=== 設定確認 ===" -ForegroundColor Cyan
az webapp config appsettings list --resource-group $ResourceGroup --name $AppName --query "[?name=='NODE_ENV' || name=='WEBSITE_NODE_DEFAULT_VERSION'].{name:name, value:value}" --output table
