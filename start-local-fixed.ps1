# 確実に動作するローカル環境起動スクリプト
Write-Host "🔧 確実に動作するローカル環境を起動中..." -ForegroundColor Green

# 全プロセスを停止
Write-Host "🛑 全プロセスを停止中..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*func*" -or $_.ProcessName -like "*tsx*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

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
Write-Host "🚀 ローカルテストサーバーを起動中 (ポート3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd $PSScriptRoot; node local-test-server.js`""

# サーバー起動を待機
Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# サーバーのヘルスチェック
Write-Host "🩺 サーバーのヘルスチェック中..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ サーバーが正常に起動しました" -ForegroundColor Green
    Write-Host "   レスポンス: $($healthResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ サーバーの起動に失敗しました" -ForegroundColor Red
    Write-Host "   エラー: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# フロントエンドを起動
Write-Host "🌐 フロントエンドを起動中 (ポート5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd $PSScriptRoot\client; npm run dev`""

Write-Host ""
Write-Host "✅ ローカル環境の起動が完了しました！" -ForegroundColor Green
Write-Host "  - バックエンド: http://localhost:3001" -ForegroundColor White
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - テストユーザー: testuser / test123" -ForegroundColor White

Write-Host ""
Write-Host "🧪 テスト手順:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで http://localhost:5173 にアクセス" -ForegroundColor White
Write-Host "  2. ログインページで testuser / test123 を入力" -ForegroundColor White
Write-Host "  3. ログインボタンをクリック" -ForegroundColor White
Write-Host "  4. ログイン成功を確認" -ForegroundColor White