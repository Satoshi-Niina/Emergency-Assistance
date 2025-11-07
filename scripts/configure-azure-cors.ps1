# Azure App ServiceのCORS設定スクリプト
# Azure CLIが必要です: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

param(
    [string]$ResourceGroupName,
    [string]$AppServiceName,
    [string]$StaticWebAppUrl = "https://witty-river-012f39e00.1.azurestaticapps.net"
)

# デフォルト値の設定
if (-not $ResourceGroupName) {
    $ResourceGroupName = Read-Host "Azure Resource Group名を入力してください"
}

if (-not $AppServiceName) {
    $AppServiceName = Read-Host "Azure App Service名を入力してください"
}

Write-Host "🔧 Azure App ServiceのCORS設定を開始します..." -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "App Service: $AppServiceName" -ForegroundColor Cyan
Write-Host "Static Web App URL: $StaticWebAppUrl" -ForegroundColor Cyan

try {
    # Azure CLIでログイン状態を確認
    Write-Host "📋 Azure CLIのログイン状態を確認しています..." -ForegroundColor Yellow
    $loginCheck = az account show 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Azure CLIにログインしていません。az loginを実行してください。" -ForegroundColor Red
        exit 1
    }

    # CORS設定を行う
    Write-Host "🌐 CORS設定を適用しています..." -ForegroundColor Yellow
    
    # Azure App ServiceでCORSを有効化
    az webapp cors add `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --allowed-origins $StaticWebAppUrl `
        --verbose

    # 追加のCORS設定（開発用も含める）
    az webapp cors add `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --allowed-origins "http://localhost:5173" `
        --verbose

    az webapp cors add `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --allowed-origins "http://localhost:8080" `
        --verbose

    # 現在のCORS設定を表示
    Write-Host "📋 現在のCORS設定:" -ForegroundColor Green
    az webapp cors show `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --output table

    # 環境変数も確認
    Write-Host "📋 関連する環境変数:" -ForegroundColor Green
    az webapp config appsettings list `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --query "[?contains(name, 'FRONTEND_URL') || contains(name, 'CORS') || contains(name, 'STATIC_WEB_APP')].{Name:name, Value:value}" `
        --output table

    Write-Host "✅ CORS設定が完了しました！" -ForegroundColor Green
    Write-Host "🔄 App Serviceが設定を反映するまで少し時間がかかる場合があります。" -ForegroundColor Yellow

} catch {
    Write-Host "❌ CORS設定中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}