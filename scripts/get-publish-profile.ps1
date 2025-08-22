# Function App発行プロファイル取得スクリプト
# Azure CLIを使用してFunction Appの発行プロファイルを取得し、GitHub Secretsの設定をサポートします

Write-Host "🔧 Function App 発行プロファイル取得ツール" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Azure CLI ログイン確認
Write-Host "Azure CLI 認証状態を確認中..." -ForegroundColor Yellow
$authStatus = az account show 2>$null
if (-not $authStatus) {
    Write-Host "⚠️  Azure CLI にログインが必要です" -ForegroundColor Red
    Write-Host "実行: az login" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Azure CLI 認証済み" -ForegroundColor Green

# Function App 情報
$resourceGroup = "rg-Emergencyassistant-app"
$functionAppName = "emergency-backend-api-v2"

Write-Host "📋 Function App 情報:" -ForegroundColor Blue
Write-Host "  リソースグループ: $resourceGroup" -ForegroundColor White
Write-Host "  Function App 名: $functionAppName" -ForegroundColor White

# Function App の存在確認
Write-Host "Function App の存在確認中..." -ForegroundColor Yellow
$functionApp = az functionapp show --name $functionAppName --resource-group $resourceGroup 2>$null
if (-not $functionApp) {
    Write-Host "❌ Function App '$functionAppName' が見つかりません" -ForegroundColor Red
    Write-Host "リソースグループ '$resourceGroup' 内で確認してください" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Function App 確認済み" -ForegroundColor Green

# 発行プロファイルの取得
Write-Host "📄 発行プロファイルを取得中..." -ForegroundColor Yellow

try {
    $publishProfile = az functionapp deployment list-publishing-profiles `
        --name $functionAppName `
        --resource-group $resourceGroup `
        --xml 2>$null

    if (-not $publishProfile) {
        throw "発行プロファイルの取得に失敗しました"
    }

    # クリップボードにコピー
    $publishProfile | Set-Clipboard
    Write-Host "✅ 発行プロファイルをクリップボードにコピーしました" -ForegroundColor Green

    # ファイルにも保存（オプション）
    $outputFile = ".\emergency-backend-api-v2-publish-profile.xml"
    $publishProfile | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "💾 発行プロファイルをファイルに保存: $outputFile" -ForegroundColor Green

    Write-Host ""
    Write-Host "🎯 次のステップ:" -ForegroundColor Cyan
    Write-Host "1. GitHub リポジトリの Settings > Secrets and variables > Actions を開く" -ForegroundColor White
    Write-Host "2. 'New repository secret' をクリック" -ForegroundColor White
    Write-Host "3. Name: AZURE_FUNCTIONAPP_PUBLISH_PROFILE" -ForegroundColor Yellow
    Write-Host "4. Value: クリップボードの内容を貼り付け (Ctrl+V)" -ForegroundColor Yellow
    Write-Host "5. 'Add secret' をクリック" -ForegroundColor White

    Write-Host ""
    Write-Host "🔗 GitHub リポジトリ:" -ForegroundColor Blue
    Write-Host "https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions" -ForegroundColor Cyan

} catch {
    Write-Host "❌ エラー: $_" -ForegroundColor Red
    Write-Host "手動で Azure Portal から取得してください:" -ForegroundColor Yellow
    Write-Host "1. https://portal.azure.com でFunction Appを開く" -ForegroundColor White
    Write-Host "2. 概要 > 発行プロファイルの取得をクリック" -ForegroundColor White
    Write-Host "3. ダウンロードしたファイルの内容をGitHub Secretsに設定" -ForegroundColor White
}

# Function App の基本情報表示
Write-Host ""
Write-Host "📊 Function App 詳細情報:" -ForegroundColor Blue
$functionAppInfo = $functionApp | ConvertFrom-Json
Write-Host "  URL: https://$($functionAppInfo.defaultHostName)" -ForegroundColor White
Write-Host "  状態: $($functionAppInfo.state)" -ForegroundColor White
Write-Host "  プラン: $($functionAppInfo.serverFarmId -split '/')[-1]" -ForegroundColor White

Write-Host ""
Write-Host "✅ 完了!" -ForegroundColor Green
