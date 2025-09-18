# 本番用問題完全解決スクリプト
Write-Host "🔧 本番用問題を完全解決中..." -ForegroundColor Green

# 全プロセスを停止
Write-Host "🛑 全プロセスを停止中..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*func*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# データベース接続テスト
Write-Host "📊 データベース接続テスト..." -ForegroundColor Yellow
try {
    $dbTest = psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ データベース接続成功" -ForegroundColor Green
    } else {
        Write-Host "❌ データベース接続失敗" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ データベース接続エラー: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 本番用環境を構築中..." -ForegroundColor Cyan

# 本番用バックエンドサーバーを起動
Write-Host "🚀 本番用バックエンドサーバーを起動中..." -ForegroundColor Yellow
$env:NODE_ENV="production"
$env:PORT="3001"
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/emergency_assistance"
$env:SESSION_SECRET="production-secret-key-12345"
$env:ALLOW_DUMMY_LOGIN="false"
$env:FRONTEND_ORIGIN="https://witty-river-012f39e00.1.azurestaticapps.net"

cd server
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden

# 少し待ってからAPIを起動
Start-Sleep -Seconds 5

Write-Host "🚀 本番用APIを起動中..." -ForegroundColor Yellow
cd ../api
Start-Process -FilePath "func" -ArgumentList "start" -WindowStyle Hidden

Write-Host ""
Write-Host "✅ 本番用環境起動完了！" -ForegroundColor Green
Write-Host "  - バックエンド: http://localhost:3001" -ForegroundColor White
Write-Host "  - API: http://localhost:7071" -ForegroundColor White
Write-Host "  - フロントエンド: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor White

Write-Host ""
Write-Host "🔍 動作確認中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 動作確認
try {
    $backendTest = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ バックエンドサーバー: 正常" -ForegroundColor Green
} catch {
    Write-Host "❌ バックエンドサーバー: エラー" -ForegroundColor Red
}

try {
    $apiTest = Invoke-WebRequest -Uri "http://localhost:7071/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ 本番用API: 正常" -ForegroundColor Green
} catch {
    Write-Host "❌ 本番用API: エラー" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 次のステップ:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで https://witty-river-012f39e00.1.azurestaticapps.net にアクセス" -ForegroundColor White
Write-Host "  2. ログインをテスト（testuser / test123）" -ForegroundColor White
Write-Host "  3. データ読み込みを確認" -ForegroundColor White
