# 緊急対応: Azure App Service 503エラー修正スクリプト
# 一時的なバイパス設定でサーバーを起動

Write-Host "🚨 緊急対応: 503エラー修正開始..." -ForegroundColor Red

# 1. 環境変数を一時的に設定
Write-Host "🔧 緊急環境変数設定中..." -ForegroundColor Yellow

$emergencySettings = @{
    "NODE_ENV" = "production"
    "PORT" = "8080"
    "FRONTEND_URL" = "https://witty-river-012f39e00.1.azurestaticapps.net"
    "BYPASS_DB_FOR_LOGIN" = "true"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "WEBSITES_PORT" = "8080"
    "WEBSITES_NODE_DEFAULT_VERSION" = "20-lts"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "ENABLE_ORYX_BUILD" = "false"
}

# Azure CLIで環境変数を設定（リソースグループ名を修正）
$resourceGroup = "rg-Emergencyassistant-app"
$appName = "Emergencyassistant-sv"

Write-Host "リソースグループ: $resourceGroup" -ForegroundColor Cyan
Write-Host "App Service: $appName" -ForegroundColor Cyan

foreach ($key in $emergencySettings.Keys) {
    Write-Host "設定: $key = $($emergencySettings[$key])" -ForegroundColor Cyan
    try {
        az webapp config appsettings set --name $appName --resource-group $resourceGroup --settings "$key=$($emergencySettings[$key])" --output none
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $key 設定成功" -ForegroundColor Green
        } else {
            Write-Host "❌ $key 設定失敗" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $key 設定エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 2. App Serviceを再起動
Write-Host "🔄 App Service再起動中..." -ForegroundColor Yellow
try {
    az webapp restart --name $appName --resource-group $resourceGroup --output table
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ App Service再起動成功" -ForegroundColor Green
    } else {
        Write-Host "❌ App Service再起動失敗" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ App Service再起動エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. ヘルスチェック（複数回試行）
Write-Host "🏥 ヘルスチェック実行中..." -ForegroundColor Yellow
$healthUrl = "https://$appName.japanwest-01.azurewebsites.net/api/health"
$maxAttempts = 5
$attempt = 1

while ($attempt -le $maxAttempts) {
    Write-Host "Health check attempt $attempt/$maxAttempts..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ ヘルスチェック成功！" -ForegroundColor Green
            Write-Host "レスポンス: $($response.Content)" -ForegroundColor Gray
            break
        } else {
            Write-Host "⚠️ ヘルスチェック警告: Status Code $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Attempt $attempt failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "⏳ 30秒待機中..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
    
    $attempt++
}

if ($attempt -gt $maxAttempts) {
    Write-Host "❌ すべてのヘルスチェックが失敗しました" -ForegroundColor Red
    Write-Host "Azure Portalでログを確認してください:" -ForegroundColor Yellow
    Write-Host "https://portal.azure.com/#@sniinatakabeni.onmicrosoft.com/resource/subscriptions/831f0c65-26bf-4565-9842-96ab74b4e6ee/resourceGroups/$resourceGroup/providers/Microsoft.Web/sites/$appName" -ForegroundColor Cyan
}

Write-Host "🎉 緊急対応完了！" -ForegroundColor Green
Write-Host "フロントエンドURL: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor Cyan
Write-Host "バックエンドURL: https://$appName.japanwest-01.azurewebsites.net" -ForegroundColor Cyan
