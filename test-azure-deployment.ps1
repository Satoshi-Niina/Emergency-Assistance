# Azure デプロイメント疎通確認スクリプト
# 使用方法: .\test-azure-deployment.ps1

Write-Host "=== Azure Emergency Assistance デプロイメント疎通確認 ===" -ForegroundColor Green

$backendUrl = "https://emergency-backend-webapp.azurewebsites.net"
$frontendUrl = "https://witty-river-012f39e00.1.azurestaticapps.net"

Write-Host "`n1. バックエンドAPI基本ヘルスチェック..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -TimeoutSec 30
    Write-Host "✅ 基本ヘルスチェック成功" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)"
    Write-Host "   Timestamp: $($healthResponse.timestamp)"
} catch {
    Write-Host "❌ 基本ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. DB疎通確認..." -ForegroundColor Yellow
try {
    $dbResponse = Invoke-RestMethod -Uri "$backendUrl/db-ping" -Method Get -TimeoutSec 30
    Write-Host "✅ DB疎通確認成功" -ForegroundColor Green
    Write-Host "   Status: $($dbResponse.status)"
    Write-Host "   Message: $($dbResponse.message)"
    Write-Host "   DB Time: $($dbResponse.current_time)"
    Write-Host "   Database URL: $($dbResponse.database_url)"
} catch {
    Write-Host "❌ DB疎通確認失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   詳細: DATABASE_URL設定を確認してください" -ForegroundColor Yellow
}

Write-Host "`n3. APIヘルスチェック..." -ForegroundColor Yellow
try {
    $apiHealthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method Get -TimeoutSec 30
    Write-Host "✅ APIヘルスチェック成功" -ForegroundColor Green
    Write-Host "   Response: $($apiHealthResponse | ConvertTo-Json -Depth 2)"
} catch {
    Write-Host "❌ APIヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. フロントエンドアクセス確認..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method Get -TimeoutSec 30
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ フロントエンドアクセス成功" -ForegroundColor Green
        Write-Host "   Status Code: $($frontendResponse.StatusCode)"
    }
} catch {
    Write-Host "❌ フロントエンドアクセス失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. CORS確認（OPTIONS リクエスト）..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = $frontendUrl
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    $corsResponse = Invoke-WebRequest -Uri "$backendUrl/api/health" -Method Options -Headers $headers -TimeoutSec 30
    Write-Host "✅ CORS確認成功" -ForegroundColor Green
    Write-Host "   Status Code: $($corsResponse.StatusCode)"
    
    $corsHeaders = $corsResponse.Headers | Where-Object { $_.Key -like "*Access-Control*" }
    if ($corsHeaders) {
        Write-Host "   CORS Headers:" -ForegroundColor Cyan
        foreach ($header in $corsHeaders) {
            Write-Host "     $($header.Key): $($header.Value)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ CORS確認失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 疎通確認完了 ===" -ForegroundColor Green
Write-Host "`n次の手順:" -ForegroundColor Cyan
Write-Host "1. エラーがある場合は、Azure Portal でApp Settingsを確認" -ForegroundColor White
Write-Host "2. DATABASE_URL に正しいPostgreSQL接続文字列が設定されているか確認" -ForegroundColor White
Write-Host "3. フロントエンドのブラウザ開発者ツールでAPIリクエストログを確認" -ForegroundColor White
Write-Host "`nAzure Portal URLs:" -ForegroundColor Cyan
Write-Host "- Backend: https://portal.azure.com/#@/resource/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/emergency-backend-webapp" -ForegroundColor Gray
Write-Host "- Frontend: https://portal.azure.com/#@/resource/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/staticSites/..." -ForegroundColor Gray
