# フロントエンド・バックエンド同時起動 + ブラウザ自動起動スクリプト
Write-Host "🚀 開発環境を起動中..." -ForegroundColor Green

# 環境変数を設定
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgresql://postgres@localhost:5432/emergency_assistance?sslmode=disable"
$env:JWT_SECRET = "dev-jwt-secret-key-32-characters-long"
$env:SESSION_SECRET = "dev-session-secret-32-characters-long"
$env:FRONTEND_URL = "http://localhost:5174"
$env:TRUST_PROXY = "0"

Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
npm install

Write-Host "🔧 バックエンドサーバーを起動中..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node production-server.js" -WindowStyle Normal

Write-Host "⏳ バックエンドの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "🎨 フロントエンドを起動中..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host "⏳ フロントエンドの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🌐 ブラウザを起動中..." -ForegroundColor Blue
Start-Process "http://localhost:5174"

Write-Host "✅ 開発環境が起動しました！" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 フロントエンド: http://localhost:5174" -ForegroundColor Blue
Write-Host "🔧 バックエンド: http://localhost:8000" -ForegroundColor Blue
Write-Host "📊 ヘルスチェック: http://localhost:8000/api/health" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  データベースが起動していない場合は、PostgreSQLを起動してください" -ForegroundColor Yellow

Read-Host "Enterキーを押して終了"
