# Azure App Service設定用PowerShellスクリプト

$ResourceGroup = "your-resource-group"
$AppName = "emergencyassistance-sv"

Write-Host "Azure App ServiceでのStartup Commandを設定中..." -ForegroundColor Green

# Startup Commandをnpm startに設定
az webapp config set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --startup-file "npm start"

Write-Host "設定完了: npm start" -ForegroundColor Green

# 設定の確認
Write-Host "現在の設定を確認中..." -ForegroundColor Yellow
az webapp config show `
  --resource-group $ResourceGroup `
  --name $AppName `
  --query "appCommandLine"

Write-Host "設定が完了しました！" -ForegroundColor Green
