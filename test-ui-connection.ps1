# UI接続テストスクリプト
Write-Host "🧪 UI接続テストを実行中..." -ForegroundColor Green

# バックエンドサーバーのテスト
Write-Host "🔍 バックエンドサーバー (ポート3002) をテスト中..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ バックエンドサーバー: 正常 ($($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ バックエンドサーバー: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

# 機械データAPIのテスト
Write-Host "🔍 機械データAPIをテスト中..." -ForegroundColor Yellow
try {
    $machinesResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/machines" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ 機械データAPI: 正常 ($($machinesResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ 機械データAPI: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

# フロー一覧APIのテスト
Write-Host "🔍 フロー一覧APIをテスト中..." -ForegroundColor Yellow
try {
    $flowsResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/flows" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ フロー一覧API: 正常 ($($flowsResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ フロー一覧API: エラー ($($_.Exception.Message))" -ForegroundColor Red
}

# ストレージデータAPIのテスト
Write-Host "🔍 ストレージデータAPIをテスト中..." -ForegroundColor Yellow
try {
    $storageResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/storage/knowledge-base" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ ストレージデータAPI: 正常 ($($storageResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ ストレージデータAPI: エラー ($($_.Exception.Message))" -ForegroundColor Red
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
Write-Host "  - テストユーザー: niina / 正しいパスワード" -ForegroundColor White

Write-Host ""
Write-Host "🌐 ブラウザで http://localhost:5173 にアクセスしてテストしてください" -ForegroundColor Green
Write-Host "   各UIでデータが表示されることを確認してください" -ForegroundColor Green
