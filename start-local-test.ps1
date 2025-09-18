# 確実に動作するローカル開発環境起動スクリプト
Write-Host "🚀 確実に動作するローカル開発環境を起動中..." -ForegroundColor Green

# 全プロセスを停止
Write-Host "🛑 既存のプロセスを停止中..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# データベース接続テスト
Write-Host "🔍 データベース接続をテスト中..." -ForegroundColor Yellow
try {
    $dbTest = psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ データベース接続成功" -ForegroundColor Green
    } else {
        Write-Host "❌ データベース接続失敗" -ForegroundColor Red
        Write-Host "PostgreSQLが起動していることを確認してください" -ForegroundColor Yellow
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
Write-Host "🎯 ローカル開発環境を起動中..." -ForegroundColor Cyan
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - バックエンド: http://localhost:9000" -ForegroundColor White
Write-Host "  - テストユーザー: testuser / test123" -ForegroundColor White
Write-Host ""

# シンプルサーバーを起動
Write-Host "🚀 シンプルサーバーを起動中..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-local-server.js" -WindowStyle Hidden

# 少し待ってからフロントエンドを起動
Start-Sleep -Seconds 3

Write-Host "🌐 フロントエンドを起動中..." -ForegroundColor Yellow
cd client
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ 起動完了！" -ForegroundColor Green
Write-Host "ブラウザで http://localhost:5173 にアクセスしてください" -ForegroundColor White
Write-Host "ログイン情報: testuser / test123" -ForegroundColor White
