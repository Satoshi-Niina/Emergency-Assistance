# デプロイ前ローカルテスト用スクリプト
Write-Host "🧪 デプロイ前ローカルテスト環境を起動中..." -ForegroundColor Green

# 全プロセスを停止
Write-Host "🛑 既存プロセスを停止中..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*func*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

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
Write-Host "🚀 デプロイ前ローカルテスト環境を起動中..." -ForegroundColor Cyan
Write-Host "  - バックエンド: ポート3001" -ForegroundColor White
Write-Host "  - フロントエンド: ポート5173" -ForegroundColor White
Write-Host "  - テストユーザー: testuser / test123" -ForegroundColor White

# デプロイ前テスト環境を起動
npm run dev:pre-deploy

Write-Host ""
Write-Host "✅ デプロイ前ローカルテスト環境が起動しました！" -ForegroundColor Green
Write-Host "ブラウザで http://localhost:5173 にアクセスしてテストしてください。" -ForegroundColor Green
