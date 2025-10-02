# Azure App Service 継続的デプロイ設定スクリプト
# GitHubからの自動デプロイを設定

param(
    [string]$ResourceGroup = "rg-Emergencyassistant-app",
    [string]$AppName = "Emergencyassistant-sv",
    [string]$GitHubRepo = "Satoshi-Niina/Emergency-Assistance",
    [string]$Branch = "main"
)

Write-Host "🚀 Azure App Service 継続的デプロイ設定開始..." -ForegroundColor Green

# 1. App Serviceの現在の状態を確認
Write-Host "📊 App Service状態確認中..." -ForegroundColor Yellow
try {
    $appInfo = az webapp show --name $AppName --resource-group $ResourceGroup --query "{name: name, state: state, defaultHostName: defaultHostName}" --output json | ConvertFrom-Json
    Write-Host "App Service: $($appInfo.name)" -ForegroundColor Cyan
    Write-Host "状態: $($appInfo.state)" -ForegroundColor Cyan
    Write-Host "URL: https://$($appInfo.defaultHostName)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ App Service情報の取得に失敗しました" -ForegroundColor Red
    Write-Host "エラー: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. GitHubからの継続的デプロイを設定
Write-Host "🔗 GitHub継続的デプロイ設定中..." -ForegroundColor Yellow
try {
    az webapp deployment source config \
        --name $AppName \
        --resource-group $ResourceGroup \
        --repo-url "https://github.com/$GitHubRepo" \
        --branch $Branch \
        --manual-integration \
        --output table
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub継続的デプロイ設定完了" -ForegroundColor Green
    } else {
        Write-Host "❌ GitHub継続的デプロイ設定に失敗しました" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ GitHub継続的デプロイ設定でエラーが発生しました" -ForegroundColor Red
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
}

foreach ($key in $envVars.Keys) {
    Write-Host "設定: $key = $($envVars[$key])" -ForegroundColor Cyan
    az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings "$key=$($envVars[$key])" --output none
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 環境変数 $key の設定に失敗しました" -ForegroundColor Red
        exit 1
    }
}

# 4. Docker設定を確認・設定
Write-Host "🐳 Docker設定確認中..." -ForegroundColor Yellow
try {
    $dockerConfig = az webapp config container show --name $AppName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    
    if ($dockerConfig.dockerImageName) {
        Write-Host "現在のDockerイメージ: $($dockerConfig.dockerImageName)" -ForegroundColor Cyan
    } else {
        Write-Host "Dockerイメージが設定されていません" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Docker設定の確認に失敗しました（新規設定の可能性）" -ForegroundColor Yellow
}

# 5. App Serviceを再起動
Write-Host "🔄 App Service再起動中..." -ForegroundColor Yellow
az webapp restart --name $AppName --resource-group $ResourceGroup --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ App Service再起動に失敗しました" -ForegroundColor Red
    exit 1
}

# 6. デプロイメントの確認
Write-Host "📋 デプロイメント履歴確認中..." -ForegroundColor Yellow
try {
    az webapp deployment list --name $AppName --resource-group $ResourceGroup --output table
} catch {
    Write-Host "⚠️ デプロイメント履歴の取得に失敗しました" -ForegroundColor Yellow
}

# 7. ヘルスチェック
Write-Host "🏥 ヘルスチェック実行中..." -ForegroundColor Yellow
Start-Sleep -Seconds 30  # サーバー起動を待機

$healthUrl = "https://$($appInfo.defaultHostName)/api/health"
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
    Write-Host "サーバーの起動に時間がかかっている可能性があります。" -ForegroundColor Yellow
}

Write-Host "🎉 継続的デプロイ設定完了！" -ForegroundColor Green
Write-Host "フロントエンドURL: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor Cyan
Write-Host "バックエンドURL: https://$($appInfo.defaultHostName)" -ForegroundColor Cyan
Write-Host "ヘルスチェック: https://$($appInfo.defaultHostName)/api/health" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "📝 次のステップ:" -ForegroundColor Yellow
Write-Host "1. GitHubリポジトリでコードを変更" -ForegroundColor White
Write-Host "2. mainブランチにプッシュ" -ForegroundColor White
Write-Host "3. Azure App Serviceが自動的にデプロイを実行" -ForegroundColor White
Write-Host "4. Azure Portalでデプロイメント履歴を確認" -ForegroundColor White
