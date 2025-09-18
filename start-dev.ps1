# 開発環境起動スクリプト
Write-Host "🚀 Emergency Assistance 開発環境を起動中..." -ForegroundColor Green

# 環境変数を設定
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/emergency_assistance"
$env:SESSION_SECRET = "your-super-secret-session-key-change-in-production-12345"
$env:ALLOW_DUMMY_LOGIN = "true"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
$env:PORT = "3001"

Write-Host "📋 設定された環境変数:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor White
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor White
Write-Host "  SESSION_SECRET: 設定済み" -ForegroundColor White
Write-Host "  ALLOW_DUMMY_LOGIN: $env:ALLOW_DUMMY_LOGIN" -ForegroundColor White
Write-Host "  FRONTEND_ORIGIN: $env:FRONTEND_ORIGIN" -ForegroundColor White
Write-Host "  PORT: $env:PORT" -ForegroundColor White

Write-Host ""
Write-Host "🎯 全サービスを起動中..." -ForegroundColor Cyan
Write-Host "  - フロントエンド: http://localhost:5173" -ForegroundColor White
Write-Host "  - バックエンド: http://localhost:3001" -ForegroundColor White
Write-Host "  - Azure Functions API: http://localhost:7071" -ForegroundColor White
Write-Host ""

# 全サービスを起動
npm run watch
