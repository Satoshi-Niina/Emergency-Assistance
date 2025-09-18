# 最終確認テストスクリプト
Write-Host "🧪 最終確認テストを実行中..." -ForegroundColor Green

# バックエンドサーバーのテスト
Write-Host "🔍 バックエンドサーバー (ポート3002) をテスト中..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ バックエンドサーバー: 正常 ($($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ バックエンドサーバー: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

# ログインAPIのテスト
Write-Host "🔍 ログインAPIをテスト中..." -ForegroundColor Yellow
try {
    $loginBody = @{username='testuser'; password='test123'} | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ ログインAPI: 正常 ($($loginResponse.StatusCode))" -ForegroundColor Green
    Write-Host "   レスポンス: $($loginResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ ログインAPI: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

# フロントエンドのテスト
Write-Host "🔍 フロントエンド (ポート5173) をテスト中..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ フロントエンド: 正常 ($($frontendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ フロントエンド: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 テスト結果:" -ForegroundColor Cyan
Write-Host "  - バックエンド: http://localhost:3002" -ForegroundColor White
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - テストユーザー: testuser / test123" -ForegroundColor White

Write-Host ""
Write-Host "🌐 ブラウザで http://localhost:5173 にアクセスしてログインテストを実行してください" -ForegroundColor Green
