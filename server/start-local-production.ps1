# ローカル本番シミュレーション起動スクリプト
Write-Host "🚀 Starting local production simulation..." -ForegroundColor Green

# 環境変数を設定
$env:NODE_ENV = "production"
$env:LOCAL_PRODUCTION = "true"
$env:PORT = "3000"
$env:SESSION_SECRET = "emergency-assistance-secret-key-for-local-production-testing"
$env:FRONTEND_URL = "https://witty-river-012f39e00.1.azurestaticapps.net"

Write-Host "🔧 Environment variables set:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  LOCAL_PRODUCTION: $env:LOCAL_PRODUCTION"
Write-Host "  PORT: $env:PORT"
Write-Host "  SESSION_SECRET: [HIDDEN]"
Write-Host "  FRONTEND_URL: $env:FRONTEND_URL"

Write-Host "`n🌐 Server will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000"
Write-Host "  https://localhost:3000 (if SSL configured)"

Write-Host "`n📋 Test endpoints:" -ForegroundColor Cyan
Write-Host "  GET  http://localhost:3000/healthz"
Write-Host "  POST http://localhost:3000/api/auth/login"
Write-Host "  GET  http://localhost:3000/api/auth/me"

Write-Host "`n🔐 Test credentials:" -ForegroundColor Cyan
Write-Host "  Username: admin"
Write-Host "  Password: admin"

Write-Host "`nStarting server..." -ForegroundColor Green
node server.cjs
