# 本番環境シミュレーション用スクリプト
Write-Host "🏭 本番環境シミュレーションを開始中..." -ForegroundColor Green

# 全プロセスを停止
Write-Host "🛑 全プロセスを停止中..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*tsx*" -or $_.ProcessName -like "*func*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# データベース接続テスト
Write-Host "📊 データベース接続テスト..." -ForegroundColor Yellow
try {
    $dbTest = psql -U postgres -h localhost -d webappdb -c "SELECT COUNT(*) FROM users;" 2>$null
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

# 本番環境シミュレーション用サーバーを起動
Write-Host "🚀 本番環境シミュレーションサーバーを起動中 (ポート3003)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd $PSScriptRoot; node working-local-server-fixed.js`""

# サーバー起動を待機
Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# サーバーのヘルスチェック
Write-Host "🩺 サーバーのヘルスチェック中..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3003/api/health" -UseBasicParsing -TimeoutSec 10
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
Write-Host "✅ 本番環境シミュレーションが完了しました！" -ForegroundColor Green
Write-Host "  - バックエンド: http://localhost:3003" -ForegroundColor White
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - テストユーザー: niina / G&896845" -ForegroundColor White

Write-Host ""
Write-Host "🧪 本番環境シミュレーションテスト:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで http://localhost:5173 にアクセス" -ForegroundColor White
Write-Host "  2. ログインをテスト" -ForegroundColor White
Write-Host "  3. 全UIでデータが表示されることを確認" -ForegroundColor White
Write-Host "  4. エラーが発生しないことを確認" -ForegroundColor White

Write-Host ""
Write-Host "📝 本番環境との対応関係:" -ForegroundColor Cyan
Write-Host "  - ローカルDB → 本番Azure PostgreSQL" -ForegroundColor White
Write-Host "  - ローカルファイル → 本番Azure Blob Storage" -ForegroundColor White
Write-Host "  - ローカルサーバー → 本番Azure Functions" -ForegroundColor White
