# ホットリロード統合開発サーバー起動スクリプト (PowerShell)
# 元ファイルを直接修正・確認できる開発環境

Write-Host "🔥 Emergency Assistance ホットリロード開発環境を起動中..." -ForegroundColor Cyan
Write-Host "📝 特徴:" -ForegroundColor Yellow
Write-Host "  - 元ファイルを直接修正・確認" -ForegroundColor White
Write-Host "  - ビルド不要、即座に反映" -ForegroundColor White
Write-Host "  - フロントエンド・バックエンド統合" -ForegroundColor White
Write-Host "  - Docker不要" -ForegroundColor White
Write-Host "  - 本番環境と同じAPIエンドポイント" -ForegroundColor White

# 環境変数の設定
$env:NODE_ENV = "development"
$env:PORT = "8080"
$env:CLIENT_PORT = "5173"
$env:DATABASE_URL = "postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb"
$env:JWT_SECRET = "dev-secret-key-32-characters-long"
$env:SESSION_SECRET = "dev-session-secret-32-characters-long"
$env:FRONTEND_URL = "http://localhost:8080"
$env:BYPASS_DB_FOR_LOGIN = "true"
$env:OPENAI_API_KEY = "sk-CHANGE_THIS_TO_YOUR_ACTUAL_OPENAI_API_KEY"
$env:CORS_ALLOW_ORIGINS = "http://localhost:8080,http://localhost:5173"

Write-Host "⚙️ 環境変数設定完了" -ForegroundColor Green

# 統合ホットリロードサーバーを起動
Write-Host "🚀 統合ホットリロードサーバーを起動中..." -ForegroundColor Cyan

node server/unified-hot-reload-server.js

Write-Host "✅ ホットリロード開発環境が起動しました！" -ForegroundColor Green
Write-Host "🌐 アクセス: http://localhost:8080" -ForegroundColor Blue
Write-Host "🔗 API: http://localhost:8080/api" -ForegroundColor Blue
Write-Host "🔥 ホットリロード: 有効" -ForegroundColor Yellow
Write-Host "📝 ファイルを編集すると即座に反映されます" -ForegroundColor Yellow
Write-Host "💡 停止するには Ctrl+C を押してください" -ForegroundColor Gray
