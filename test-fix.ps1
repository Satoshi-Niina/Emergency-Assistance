# 503エラー修正後の動作確認スクリプト

Write-Host "🔍 503エラー修正後の動作確認を開始します..." -ForegroundColor Green

$baseUrl = "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net"

# 1. /healthz エンドポイントの確認
Write-Host "1️⃣ /healthz エンドポイントをテスト中..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/healthz" -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ /healthz: 200 OK" -ForegroundColor Green
        Write-Host "   レスポンス: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "❌ /healthz: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ /healthz: エラー - $($_.Exception.Message)" -ForegroundColor Red
}

# 2. /ping エンドポイントの確認
Write-Host "2️⃣ /ping エンドポイントをテスト中..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/ping" -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ /ping: 200 OK" -ForegroundColor Green
        Write-Host "   レスポンス: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "❌ /ping: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ /ping: エラー - $($_.Exception.Message)" -ForegroundColor Red
}

# 3. /api/auth/me エンドポイントの確認
Write-Host "3️⃣ /api/auth/me エンドポイントをテスト中..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -TimeoutSec 30
    Write-Host "✅ /api/auth/me: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   レスポンス: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ /api/auth/me: エラー - $($_.Exception.Message)" -ForegroundColor Red
}

# 4. CORS プリフライトリクエストの確認
Write-Host "4️⃣ CORS プリフライトリクエストをテスト中..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "https://witty-river-012f39e00.1.azurestaticapps.net"
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method OPTIONS -Headers $headers -TimeoutSec 30
    Write-Host "✅ CORS OPTIONS: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ CORS OPTIONS: エラー - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 テスト完了" -ForegroundColor Green
Write-Host "フロントエンドからの接続確認は、ブラウザのDevTools Networkタブで確認してください。" -ForegroundColor Cyan
