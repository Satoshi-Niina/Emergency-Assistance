# ローカル開発環境専用起動スクリプト
Write-Host "🚀 ローカル開発環境を起動中..." -ForegroundColor Green

# 環境変数を設定（ローカル専用）
$env:NODE_ENV = "development"
$env:PORT = "5000"
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/emergency_assistance"
$env:SESSION_SECRET = "local-development-secret-key-12345"
$env:ALLOW_DUMMY_LOGIN = "false"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
$env:VITE_API_BASE_URL = "http://localhost:5000"

Write-Host "📋 ローカル環境設定:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor White
Write-Host "  PORT: $env:PORT" -ForegroundColor White
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor White
Write-Host "  SESSION_SECRET: 設定済み" -ForegroundColor White
Write-Host "  ALLOW_DUMMY_LOGIN: $env:ALLOW_DUMMY_LOGIN" -ForegroundColor White
Write-Host "  FRONTEND_ORIGIN: $env:FRONTEND_ORIGIN" -ForegroundColor White
Write-Host "  VITE_API_BASE_URL: $env:VITE_API_BASE_URL" -ForegroundColor White

Write-Host ""
Write-Host "🔍 データベース接続をテスト中..." -ForegroundColor Yellow

# データベース接続テスト
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

Write-Host ""
Write-Host "🎯 ローカル開発環境を起動中..." -ForegroundColor Cyan
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - バックエンド: http://localhost:5000" -ForegroundColor White
Write-Host "  - データベース: 接続済み" -ForegroundColor White
Write-Host "  - 認証モード: 本格認証（ダミー無効）" -ForegroundColor White
Write-Host ""

# 全サービスを起動
npm run dev
