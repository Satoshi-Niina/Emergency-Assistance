# 本番用問題解決スクリプト
Write-Host "🔧 本番用問題を解決中..." -ForegroundColor Green

Write-Host ""
Write-Host "📋 現在の状況:" -ForegroundColor Yellow
Write-Host "  ✅ ローカル環境: 動作中" -ForegroundColor Green
Write-Host "  ❌ 本番用API: 起動失敗" -ForegroundColor Red
Write-Host "  ❌ データ読み込み: 問題あり" -ForegroundColor Red
Write-Host "  ❌ ストレージ接続: 問題あり" -ForegroundColor Red

Write-Host ""
Write-Host "🎯 解決手順:" -ForegroundColor Cyan
Write-Host "  1. 本番用APIの設定を修正" -ForegroundColor White
Write-Host "  2. データベース接続を確認" -ForegroundColor White
Write-Host "  3. ストレージ設定を確認" -ForegroundColor White
Write-Host "  4. フロントエンドの設定を本番用に更新" -ForegroundColor White

Write-Host ""
Write-Host "🔍 現在の設定を確認中..." -ForegroundColor Yellow

# データベース接続テスト
Write-Host "📊 データベース接続テスト..." -ForegroundColor Yellow
try {
    $dbTest = psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ データベース接続成功" -ForegroundColor Green
    } else {
        Write-Host "❌ データベース接続失敗" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ データベース接続エラー: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 次のステップ:" -ForegroundColor Cyan
Write-Host "  1. 本番用APIの設定を修正" -ForegroundColor White
Write-Host "  2. フロントエンドの設定を本番用に更新" -ForegroundColor White
Write-Host "  3. デプロイしてテスト" -ForegroundColor White
