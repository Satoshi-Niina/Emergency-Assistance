# Emergency Assistance API テストスクリプト

Write-Host "🔍 Emergency Assistance API テスト開始" -ForegroundColor Green

# API URL設定
$baseUrl = "https://emergency-backend-app.azurewebsites.net"
$healthUrl = "$baseUrl/api/health"
$loginUrl = "$baseUrl/api/auth/login"

Write-Host "📡 API Base URL: $baseUrl" -ForegroundColor Cyan

# 1. ヘルスチェック
Write-Host "`n1️⃣ ヘルスチェック実行..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 30
    Write-Host "✅ ヘルスチェック成功:" -ForegroundColor Green
    Write-Host ($healthResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "❌ ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. ログインテスト
Write-Host "`n2️⃣ ログインテスト実行..." -ForegroundColor Yellow

$loginData = @{
    username = "niina"
    password = "Test896845"
} | ConvertTo-Json

Write-Host "📤 送信データ: $loginData" -ForegroundColor Cyan

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 30
    Write-Host "✅ ログイン成功:" -ForegroundColor Green
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "❌ ログイン失敗: $($_.Exception.Message)" -ForegroundColor Red
    
    # エラーの詳細を表示
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "HTTP Status: $statusCode - $statusDescription" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "エラーレスポンス読み取り失敗" -ForegroundColor Red
        }
    }
}

# 3. 追加のテストユーザーでテスト
Write-Host "`n3️⃣ 追加ユーザーテスト (admin/admin123)..." -ForegroundColor Yellow

$adminLoginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $adminLoginData -ContentType "application/json" -TimeoutSec 30
    Write-Host "✅ Admin ログイン成功:" -ForegroundColor Green
    Write-Host ($adminResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "❌ Admin ログイン失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🏁 テスト完了" -ForegroundColor Green
