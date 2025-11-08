# Azure App Service設定修正スクリプト (本番用)
# 実行前に Azure CLI でログインしてください: az login

$AppName = "Emergency-Assistance"
$ResourceGroup = "rg-Emergencyassistant-app"

Write-Host "🔧 Azure App Service設定修正スクリプト (本番用)" -ForegroundColor Blue
Write-Host "App Name: $AppName" -ForegroundColor White
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host ""

# 1. 現在の設定確認
Write-Host "📋 現在の設定を確認中..." -ForegroundColor Yellow
try {
    $currentConfig = az webapp config show --name $AppName --resource-group $ResourceGroup | ConvertFrom-Json
    Write-Host "✅ 現在のLinuxFxVersion: $($currentConfig.linuxFxVersion)" -ForegroundColor Green
    Write-Host "✅ 現在のNodeVersion: $($currentConfig.nodeVersion)" -ForegroundColor Green
    Write-Host "✅ 現在のPlatform: $($currentConfig.use32BitWorkerProcess)" -ForegroundColor Green
} catch {
    Write-Host "❌ 設定確認に失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Dockerコンテナ設定をクリア
Write-Host ""
Write-Host "🐳 Docker設定をクリア中..." -ForegroundColor Yellow
try {
    # LinuxFxVersionを空にしてDockerを無効化
    az webapp config set --name $AppName --resource-group $ResourceGroup --linux-fx-version ""
    Write-Host "✅ Docker設定をクリアしました" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker設定クリアに失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Node.js設定を適用
Write-Host ""
Write-Host "📦 Node.js設定を適用中..." -ForegroundColor Yellow
try {
    # Node.js 20.xを設定
    az webapp config set --name $AppName --resource-group $ResourceGroup --node-version "20-lts"
    Write-Host "✅ Node.js 20 LTSを設定しました" -ForegroundColor Green

    # 64bitプラットフォームを設定
    az webapp config set --name $AppName --resource-group $ResourceGroup --use-32bit-worker-process false
    Write-Host "✅ 64bitプラットフォームを設定しました" -ForegroundColor Green

    # Always Onを有効化（本番環境）
    az webapp config set --name $AppName --resource-group $ResourceGroup --always-on true
    Write-Host "✅ Always Onを有効化しました" -ForegroundColor Green

} catch {
    Write-Host "❌ Node.js設定に失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. 本番用アプリケーション設定
Write-Host ""
Write-Host "⚙️ 本番用環境変数を設定中..." -ForegroundColor Yellow
try {
    # 本番用環境変数を設定
    az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings `
        NODE_ENV="production" `
        WEBSITE_NODE_DEFAULT_VERSION="20-lts" `
        FRONTEND_URL="https://witty-river-012f39e00.1.azurestaticapps.net" `
        SAFE_MODE="false" `
        WEBSITES_ENABLE_APP_SERVICE_STORAGE="false" `
        WEBSITES_PORT="8080" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

    Write-Host "✅ 本番用環境変数を設定しました" -ForegroundColor Green
} catch {
    Write-Host "❌ 環境変数設定に失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. スタートアップコマンドを設定
Write-Host ""
Write-Host "🚀 スタートアップコマンドを設定中..." -ForegroundColor Yellow
try {
    az webapp config set --name $AppName --resource-group $ResourceGroup --startup-file "node index.js"
    Write-Host "✅ スタートアップコマンドを設定しました" -ForegroundColor Green
} catch {
    Write-Host "❌ スタートアップコマンド設定に失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. 修正後の設定確認
Write-Host ""
Write-Host "🔍 修正後の設定確認..." -ForegroundColor Yellow
try {
    $updatedConfig = az webapp config show --name $AppName --resource-group $ResourceGroup | ConvertFrom-Json
    Write-Host "✅ LinuxFxVersion: '$($updatedConfig.linuxFxVersion)' (空であること)" -ForegroundColor Green
    Write-Host "✅ NodeVersion: $($updatedConfig.nodeVersion)" -ForegroundColor Green
    Write-Host "✅ AlwaysOn: $($updatedConfig.alwaysOn)" -ForegroundColor Green
    Write-Host "✅ Use32BitWorkerProcess: $($updatedConfig.use32BitWorkerProcess)" -ForegroundColor Green

    # アプリ設定も確認
    $appSettings = az webapp config appsettings list --name $AppName --resource-group $ResourceGroup | ConvertFrom-Json
    $nodeEnv = ($appSettings | Where-Object { $_.name -eq "NODE_ENV" }).value
    Write-Host "✅ NODE_ENV: $nodeEnv" -ForegroundColor Green
} catch {
    Write-Host "❌ 設定確認に失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 設定修正完了！" -ForegroundColor Green
Write-Host "📋 次のステップ:" -ForegroundColor Yellow
Write-Host "  1. GitHub Actionsで再デプロイを実行してください" -ForegroundColor White
Write-Host "  2. デプロイ完了後、ヘルスチェックを確認してください" -ForegroundColor White
Write-Host "  3. https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/health" -ForegroundColor Cyan
Write-Host ""
