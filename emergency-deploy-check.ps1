# Emergency Deployment Script
# Azure App Serviceの直接診断とテスト

Write-Host "🚨 Emergency Assistance - Deployment Status Check" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. GitHub Actions実行状況チェック
Write-Host "`n📋 GitHub Actions Check:" -ForegroundColor Yellow
Write-Host "1. https://github.com/Satoshi-Niina/Emergency-Assistance/actions で実行状況を確認"
Write-Host "2. 'Force Deploy Server Now' ワークフローを手動実行"

# 2. サーバー応答テスト
Write-Host "`n🔍 Server Response Test:" -ForegroundColor Yellow
$baseUrl = "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net"

# Health Check
Write-Host "Testing: $baseUrl/api/health"
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health Check Success!" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host "   Message: $($healthResponse.message)" -ForegroundColor White
    Write-Host "   Node Version: $($healthResponse.nodeVersion)" -ForegroundColor White
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # 503エラーの詳細確認
    try {
        $webResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 10
    } catch {
        Write-Host "   HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "   Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
}

# Debug Endpoint Test (if health check fails)
if ($healthResponse -eq $null) {
    Write-Host "`nTesting debug endpoint..."
    try {
        $debugResponse = Invoke-RestMethod -Uri "$baseUrl/api/debug/env" -Method GET -TimeoutSec 15
        Write-Host "✅ Debug endpoint responding!" -ForegroundColor Green
        Write-Host "   Environment: $($debugResponse.environment.NODE_ENV)" -ForegroundColor White
        Write-Host "   Database: $($debugResponse.environment.DATABASE_URL)" -ForegroundColor White
        Write-Host "   JWT Secret: $($debugResponse.environment.JWT_SECRET)" -ForegroundColor White
    } catch {
        Write-Host "❌ Debug endpoint also failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Azure App Service診断
Write-Host "`n🔧 Azure App Service Manual Actions:" -ForegroundColor Yellow
Write-Host "If server is not responding, perform these manual steps:"
Write-Host "1. Azure Portal → App Service 'Emergency-Assistance'"
Write-Host "2. 開発ツール → SSH → 接続"
Write-Host "3. Run: 'cd /home/site/wwwroot && ls -la'"
Write-Host "4. Run: 'node index.js' (check for errors)"
Write-Host "5. 設定 → 環境変数 → 確認:"
Write-Host "   - DATABASE_URL"
Write-Host "   - JWT_SECRET" 
Write-Host "   - SESSION_SECRET"
Write-Host "   - NODE_ENV=production"

# 4. GitHub Manual Deploy Instructions
Write-Host "`n🚀 Manual Deployment Instructions:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/Satoshi-Niina/Emergency-Assistance/actions"
Write-Host "2. Click 'Force Deploy Server Now'"
Write-Host "3. Click 'Run workflow' → 'Run workflow'"
Write-Host "4. Wait for completion (5-10 minutes)"
Write-Host "5. Test server again"

# 5. Critical Environment Variables Check
Write-Host "`n⚠️  Critical Environment Variables to Verify:" -ForegroundColor Red
Write-Host "GitHub Secrets (Repository → Settings → Secrets):"
Write-Host "- AZURE_WEBAPP_PUBLISH_PROFILE"
Write-Host "- DATABASE_URL"
Write-Host "- JWT_SECRET"
Write-Host "- SESSION_SECRET"
Write-Host ""
Write-Host "Azure App Service Environment Variables:"
Write-Host "- Same as above GitHub Secrets"
Write-Host "- NODE_ENV=production"
Write-Host "- PORT=8080 (auto-set by Azure)"

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "💡 If all else fails, try Azure Portal → App Service → 再起動" -ForegroundColor Yellow