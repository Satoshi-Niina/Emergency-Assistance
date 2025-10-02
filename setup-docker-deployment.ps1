# Azure App Service Docker設定スクリプト
# Container Registryからイメージをデプロイ

param(
    [string]$ResourceGroup = "rg-Emergencyassistant-app",
    [string]$AppName = "Emergencyassistant-sv",
    [string]$RegistryName = "emergencyassistance",
    [string]$ImageName = "emergency-assistance-backend",
    [string]$ImageTag = "latest"
)

Write-Host "🐳 Azure App Service Docker設定開始..." -ForegroundColor Green

# 1. Container Registryの情報を取得
Write-Host "📦 Container Registry情報確認中..." -ForegroundColor Yellow
try {
    $registryInfo = az acr show --name $RegistryName --resource-group $ResourceGroup --query "{loginServer: loginServer, sku: sku}" --output json | ConvertFrom-Json
    Write-Host "Registry: $($registryInfo.loginServer)" -ForegroundColor Cyan
    Write-Host "SKU: $($registryInfo.sku)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Container Registry情報の取得に失敗しました" -ForegroundColor Red
    Write-Host "エラー: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. App ServiceのDocker設定を更新
Write-Host "🔧 Docker設定更新中..." -ForegroundColor Yellow
$fullImageName = "$($registryInfo.loginServer)/$ImageName`:$ImageTag"
Write-Host "使用するイメージ: $fullImageName" -ForegroundColor Cyan

try {
    az webapp config container set \
        --name $AppName \
        --resource-group $ResourceGroup \
        --docker-custom-image-name $fullImageName \
        --output table
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker設定更新完了" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker設定更新に失敗しました" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker設定更新でエラーが発生しました" -ForegroundColor Red
    Write-Host "エラー: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. 環境変数を設定
Write-Host "🔧 環境変数設定中..." -ForegroundColor Yellow
$envVars = @{
    "NODE_ENV" = "production"
    "PORT" = "8080"
    "FRONTEND_URL" = "https://witty-river-012f39e00.1.azurestaticapps.net"
    "BYPASS_DB_FOR_LOGIN" = "true"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "WEBSITES_PORT" = "8080"
    "DOCKER_REGISTRY_SERVER_URL" = "https://$($registryInfo.loginServer)"
}

foreach ($key in $envVars.Keys) {
    Write-Host "設定: $key = $($envVars[$key])" -ForegroundColor Cyan
    az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings "$key=$($envVars[$key])" --output none
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 環境変数 $key の設定に失敗しました" -ForegroundColor Red
        exit 1
    }
}

# 4. App Serviceを再起動
Write-Host "🔄 App Service再起動中..." -ForegroundColor Yellow
az webapp restart --name $AppName --resource-group $ResourceGroup --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ App Service再起動に失敗しました" -ForegroundColor Red
    exit 1
}

# 5. ヘルスチェック
Write-Host "🏥 ヘルスチェック実行中..." -ForegroundColor Yellow
Start-Sleep -Seconds 60  # Dockerイメージのプルと起動を待機

$healthUrl = "https://$AppName.japanwest-01.azurewebsites.net/api/health"
Write-Host "ヘルスチェックURL: $healthUrl" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ヘルスチェック成功！" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ ヘルスチェック警告: Status Code $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Dockerイメージの起動に時間がかかっている可能性があります。" -ForegroundColor Yellow
}

Write-Host "🎉 Docker設定完了！" -ForegroundColor Green
Write-Host "フロントエンドURL: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor Cyan
Write-Host "バックエンドURL: https://$AppName.japanwest-01.azurewebsites.net" -ForegroundColor Cyan
Write-Host "ヘルスチェック: https://$AppName.japanwest-01.azurewebsites.net/api/health" -ForegroundColor Cyan
