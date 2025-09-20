# 本番環境デプロイメントテストスクリプト
param(
    [string]$BackendUrl = "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net"
)

Write-Host "🚀 本番環境デプロイメントテスト開始" -ForegroundColor Green
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan

# 1. ヘルスチェックテスト
Write-Host "`n1. ヘルスチェックテスト" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$BackendUrl/healthz" -Method GET -TimeoutSec 30
    Write-Host "✅ Health check: $($healthResponse.StatusCode) - $($healthResponse.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. ログインAPIテスト
Write-Host "`n2. ログインAPIテスト" -ForegroundColor Yellow
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{username="admin"; password="admin"} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -WebSession $session -TimeoutSec 30
    Write-Host "✅ Login successful: $($loginResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Cyan
    
    # Set-Cookieヘッダーを確認
    $setCookieHeaders = $loginResponse.Headers | Where-Object { $_.Key -eq "Set-Cookie" }
    if ($setCookieHeaders) {
        Write-Host "✅ Set-Cookie headers found:" -ForegroundColor Green
        $setCookieHeaders.Value | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
    } else {
        Write-Host "⚠️ No Set-Cookie headers found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. セッション維持テスト
Write-Host "`n3. セッション維持テスト（/api/auth/me）" -ForegroundColor Yellow
try {
    $meResponse = Invoke-WebRequest -Uri "$BackendUrl/api/auth/me" -Method GET -WebSession $session -TimeoutSec 30
    Write-Host "✅ /me successful: $($meResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($meResponse.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ /me failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This indicates session/cookie issues" -ForegroundColor Yellow
}

# 4. CORSヘッダー確認
Write-Host "`n4. CORSヘッダー確認" -ForegroundColor Yellow
try {
    $corsResponse = Invoke-WebRequest -Uri "$BackendUrl/api/auth/me" -Method OPTIONS -TimeoutSec 30
    Write-Host "✅ OPTIONS request successful: $($corsResponse.StatusCode)" -ForegroundColor Green
    
    $corsHeaders = @(
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials", 
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers"
    )
    
    foreach ($header in $corsHeaders) {
        $value = $corsResponse.Headers[$header]
        if ($value) {
            Write-Host "✅ $header`: $value" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $header`: Not found" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ CORS test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. 連続テスト（5回）
Write-Host "`n5. 連続テスト（5回実行）" -ForegroundColor Yellow
$successCount = 0
for ($i = 1; $i -le 5; $i++) {
    try {
        $testResponse = Invoke-WebRequest -Uri "$BackendUrl/api/auth/me" -Method GET -WebSession $session -TimeoutSec 10
        if ($testResponse.StatusCode -eq 200) {
            $successCount++
            Write-Host "✅ Test $i`: Success" -ForegroundColor Green
        } else {
            Write-Host "❌ Test $i`: Failed (Status: $($testResponse.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Test $i`: Failed ($($_.Exception.Message))" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

Write-Host "`n📊 テスト結果サマリ" -ForegroundColor Cyan
Write-Host "連続テスト成功: $successCount/5" -ForegroundColor $(if ($successCount -eq 5) { "Green" } else { "Yellow" })

if ($successCount -eq 5) {
    Write-Host "🎉 デプロイメント成功！ログイン・セッション・クッキーが正常に動作しています。" -ForegroundColor Green
} else {
    Write-Host "⚠️ 一部のテストが失敗しました。Azure ログを確認してください。" -ForegroundColor Yellow
}

Write-Host "`n🔍 追加確認事項:" -ForegroundColor Cyan
Write-Host "- Azure ログで 'Listening on 0.0.0.0:PORT' メッセージを確認"
Write-Host "- ブラウザでフロントエンドからログインをテスト"
Write-Host "- ネットワークタブでCORSヘッダーとクッキーを確認"
