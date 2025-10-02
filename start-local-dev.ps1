# ローカル開発環境の起動スクリプト
# 本番環境との完全分離

Write-Host "🚀 Starting Local Development Environment..." -ForegroundColor Green

# 環境変数の確認
Write-Host "📊 Environment Check:" -ForegroundColor Blue
Write-Host "  - NODE_ENV: $($env:NODE_ENV ?? 'development')" -ForegroundColor Gray
Write-Host "  - PORT: $($env:PORT ?? '8000')" -ForegroundColor Gray
Write-Host "  - FRONTEND_URL: $($env:FRONTEND_URL ?? 'http://localhost:5173')" -ForegroundColor Gray

# ローカル環境変数ファイルの確認
if (Test-Path "local.env") {
    Write-Host "✅ Found local.env file" -ForegroundColor Green
} else {
    Write-Host "⚠️ local.env file not found, using system environment variables" -ForegroundColor Yellow
}

# ローカルサーバーを起動
Write-Host "🔧 Starting local development server..." -ForegroundColor Blue
node server/local-server.js