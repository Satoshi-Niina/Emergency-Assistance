# Azure App Service 本番環境修正デプロイスクリプト
# セッション管理とJWT認証を完全実装

Write-Host "🚀 Azure App Service 本番環境修正デプロイを開始..." -ForegroundColor Green

# Azure CLI でログイン確認
Write-Host "📋 Azure CLI ログイン状態を確認..." -ForegroundColor Yellow
az account show --query "name" -o tsv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure CLI にログインしてください: az login" -ForegroundColor Red
    exit 1
}

# App Service 名とリソースグループ
$APP_NAME = "emergencyassistance-sv"
$RESOURCE_GROUP = "emergency-assistance-rg"

Write-Host "🔧 App Service 設定を更新中..." -ForegroundColor Yellow

# 1. 本番環境変数を設定
Write-Host "📝 本番環境変数を設定中..." -ForegroundColor Cyan
az webapp config appsettings set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings `
        NODE_ENV=production `
        JWT_SECRET="emergency-assistance-jwt-secret-key-32chars-production" `
        SESSION_SECRET="emergency-assistance-session-secret-key-32chars-production" `
        DATABASE_URL="$env:DATABASE_URL" `
        FRONTEND_URL="https://your-swa-url.azurestaticapps.net" `
    --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 環境変数設定に失敗しました" -ForegroundColor Red
    exit 1
}

# 2. スタートアップコマンドを設定
Write-Host "🚀 スタートアップコマンドを設定中..." -ForegroundColor Cyan
az webapp config set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --startup-file "node index.js" `
    --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ スタートアップコマンド設定に失敗しました" -ForegroundColor Red
    exit 1
}

# 3. App Service を停止
Write-Host "⏹️ App Service を停止中..." -ForegroundColor Yellow
az webapp stop --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

# 4. 修正されたコードをデプロイ
Write-Host "📦 修正されたコードをデプロイ中..." -ForegroundColor Cyan
az webapp deployment source config-zip `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --src "server-deploy-production-fixed.zip" `
    --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ デプロイに失敗しました" -ForegroundColor Red
    exit 1
}

# 5. App Service を開始
Write-Host "▶️ App Service を開始中..." -ForegroundColor Yellow
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

# 6. デプロイ完了を待機
Write-Host "⏳ デプロイ完了を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 7. ヘルスチェック
Write-Host "🔍 ヘルスチェックを実行中..." -ForegroundColor Cyan
$HEALTH_URL = "https://$APP_NAME-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health"
try {
    $response = Invoke-WebRequest -Uri $HEALTH_URL -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "📄 レスポンス: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ ヘルスチェック警告: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. ハンドシェイクエンドポイントテスト
Write-Host "🤝 ハンドシェイクエンドポイントをテスト中..." -ForegroundColor Cyan
$HANDSHAKE_URL = "https://$APP_NAME-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/handshake"
try {
    $response = Invoke-WebRequest -Uri $HANDSHAKE_URL -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ハンドシェイク成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "📄 レスポンス: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ ハンドシェイク警告: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ハンドシェイク失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. /me エンドポイントテスト（認証なし）
Write-Host "👤 /me エンドポイントをテスト中..." -ForegroundColor Cyan
$ME_URL = "https://$APP_NAME-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/me"
try {
    $response = Invoke-WebRequest -Uri $ME_URL -Method GET -TimeoutSec 30
    Write-Host "📄 /me レスポンス: $($response.StatusCode) - $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "📄 /me エラー（期待される動作）: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "🎉 本番環境デプロイ完了！" -ForegroundColor Green
Write-Host "🌐 App Service URL: https://$APP_NAME-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net" -ForegroundColor Cyan
Write-Host "📊 ログ確認: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Cyan
Write-Host "🔐 ログインAPI: https://$APP_NAME-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/login" -ForegroundColor Cyan
