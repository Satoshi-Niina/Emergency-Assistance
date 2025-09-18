# 本番用ローカル環境徹底構築スクリプト
Write-Host "🏗️ 本番用ローカル環境を徹底構築中..." -ForegroundColor Green

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

# テストユーザーの確認
Write-Host "👤 テストユーザーを確認中..." -ForegroundColor Yellow
$userTest = psql -U postgres -h localhost -d emergency_assistance -c "SELECT username FROM users WHERE username='testuser';" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ テストユーザー確認完了" -ForegroundColor Green
} else {
    Write-Host "⚠️ テストユーザーが見つかりません" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 本番用ローカル環境を構築中..." -ForegroundColor Cyan

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

# 少し待ってからフロントエンドを起動
Start-Sleep -Seconds 5

Write-Host "🌐 本番用フロントエンドを起動中..." -ForegroundColor Yellow
cd ../client
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ 本番用ローカル環境構築完了！" -ForegroundColor Green
Write-Host "  - バックエンド: http://localhost:3001" -ForegroundColor White
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - テストユーザー: testuser / test123" -ForegroundColor White

Write-Host ""
Write-Host "🔍 動作確認中..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 動作確認
try {
    $backendTest = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ バックエンドサーバー: 正常" -ForegroundColor Green
} catch {
    Write-Host "❌ バックエンドサーバー: エラー" -ForegroundColor Red
}

try {
    $frontendTest = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ フロントエンド: 正常" -ForegroundColor Green
} catch {
    Write-Host "❌ フロントエンド: エラー" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 テスト手順:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで http://localhost:5173 にアクセス" -ForegroundColor White
Write-Host "  2. ログインをテスト（testuser / test123）" -ForegroundColor White
Write-Host "  3. データ読み込みを確認" -ForegroundColor White
Write-Host "  4. 全て正常に動作することを確認" -ForegroundColor White

Write-Host ""
Write-Host "📝 次のステップ:" -ForegroundColor Cyan
Write-Host "  1. ローカル環境での動作確認" -ForegroundColor White
Write-Host "  2. 問題があれば修正" -ForegroundColor White
Write-Host "  3. 完成したらデプロイ" -ForegroundColor White
