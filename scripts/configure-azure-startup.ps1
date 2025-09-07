# Azure App Service設定用PowerShellスクリプト - npm start対応

$ResourceGroup = "your-resource-group"
$AppName = "emergencyassistance-sv"

Write-Host "Azure App ServiceでのStartup Commandを設定中..." -ForegroundColor Green

# Startup Commandをnpm startに設定
az webapp config set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --startup-file "npm start"

Write-Host "設定完了: npm start (エントリーポイント: dist/index.js)" -ForegroundColor Green

# 設定の確認
Write-Host "現在の設定を確認中..." -ForegroundColor Yellow
az webapp config show `
  --resource-group $ResourceGroup `
  --name $AppName `
  --query "appCommandLine"

# 重要な環境変数の確認
Write-Host "重要な環境変数を確認中..." -ForegroundColor Yellow
az webapp config appsettings list `
  --resource-group $ResourceGroup `
  --name $AppName `
  --query "[?name=='NODE_ENV' || name=='DATABASE_URL'].{name:name, value:value}"

Write-Host "設定が完了しました！" -ForegroundColor Green
Write-Host "デプロイ後のヘルスチェック: https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/health" -ForegroundColor Cyan
