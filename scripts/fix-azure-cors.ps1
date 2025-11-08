# Azure App Service CORS設定修正スクリプト
# Emergency-Assistance プロジェクト用

param(
    [string]$ResourceGroup = "Emergency-Assistance_group",
    [string]$AppName = "emergency-assistance-bfckhjejb3fbf9du"
)

Write-Host "🔧 Azure App Service CORS設定を修正します" -ForegroundColor Cyan
Write-Host "📱 App Service: $AppName" -ForegroundColor Yellow
Write-Host "🏠 Resource Group: $ResourceGroup" -ForegroundColor Yellow

# Azure CLIでログイン確認
Write-Host "`n🔍 Azure CLIの認証状態を確認中..." -ForegroundColor Cyan
try {
    $account = az account show --query "user.name" -o tsv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Azure CLI認証済み: $account" -ForegroundColor Green
    } else {
        throw "Azure CLI未認証"
    }
} catch {
    Write-Host "❌ Azure CLIにログインしてください" -ForegroundColor Red
    Write-Host "実行コマンド: az login" -ForegroundColor Yellow
    exit 1
}

# 現在のCORS設定を取得
Write-Host "`n📋 現在のCORS設定を確認中..." -ForegroundColor Cyan
try {
    $currentCors = az webapp cors show --name $AppName --resource-group $ResourceGroup --query "allowedOrigins" -o json
    Write-Host "現在の許可オリジン:" -ForegroundColor Yellow
    $currentCors | ConvertFrom-Json | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
} catch {
    Write-Host "⚠️ 現在のCORS設定取得に失敗" -ForegroundColor Yellow
}

# 新しいCORS設定を適用
Write-Host "`n🚀 新しいCORS設定を適用中..." -ForegroundColor Cyan

$allowedOrigins = @(
    "https://witty-river-012f39e00.1.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://localhost:5173",
    "https://127.0.0.1:5173"
)

Write-Host "設定する許可オリジン:" -ForegroundColor Yellow
$allowedOrigins | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

try {
    # CORS設定をクリア（既存設定を削除）
    Write-Host "`n🗑️ 既存CORS設定をクリア中..." -ForegroundColor Cyan
    az webapp cors remove --name $AppName --resource-group $ResourceGroup --allowed-origins "*"
    
    # 新しいCORS設定を追加
    Write-Host "➕ 新しいCORS設定を追加中..." -ForegroundColor Cyan
    $originsString = $allowedOrigins -join " "
    az webapp cors add --name $AppName --resource-group $ResourceGroup --allowed-origins $originsString
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CORS設定が正常に更新されました" -ForegroundColor Green
    } else {
        throw "CORS設定更新に失敗"
    }
} catch {
    Write-Host "❌ CORS設定の更新に失敗しました" -ForegroundColor Red
    Write-Host "エラー: $_" -ForegroundColor Red
    exit 1
}

# 設定確認
Write-Host "`n🔍 更新後のCORS設定を確認中..." -ForegroundColor Cyan
try {
    $newCors = az webapp cors show --name $AppName --resource-group $ResourceGroup --query "allowedOrigins" -o json
    Write-Host "更新後の許可オリジン:" -ForegroundColor Yellow
    $newCors | ConvertFrom-Json | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
} catch {
    Write-Host "⚠️ 更新後のCORS設定確認に失敗" -ForegroundColor Yellow
}

# App Serviceの再起動
Write-Host "`n🔄 App Serviceを再起動して設定を反映中..." -ForegroundColor Cyan
try {
    az webapp restart --name $AppName --resource-group $ResourceGroup
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ App Serviceが正常に再起動されました" -ForegroundColor Green
    } else {
        throw "App Service再起動に失敗"
    }
} catch {
    Write-Host "❌ App Service再起動に失敗しました" -ForegroundColor Red
    Write-Host "手動で再起動してください" -ForegroundColor Yellow
}

Write-Host "`n🎉 CORS設定修正が完了しました！" -ForegroundColor Green
Write-Host "📱 フロントエンドからのアクセスが可能になります" -ForegroundColor Cyan
Write-Host "🌐 テストURL: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor Cyan
Write-Host "🔗 バックエンドURL: https://$AppName.azurewebsites.net" -ForegroundColor Cyan

Write-Host "`n⏰ 設定反映まで数分かかる場合があります" -ForegroundColor Yellow