# シンプルな起動スクリプト
Write-Host "🚀 シンプル起動..." -ForegroundColor Green

# 環境変数を設定
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgresql://postgres@localhost:5432/emergency_assistance?sslmode=disable"
$env:JWT_SECRET = "dev-jwt-secret-key-32-characters-long"
$env:SESSION_SECRET = "dev-session-secret-32-characters-long"
$env:FRONTEND_URL = "http://localhost:5173"
$env:TRUST_PROXY = "0"

Write-Host "🔧 バックエンドを起動..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node production-server.js" -WindowStyle Normal

Write-Host "⏳ バックエンドの起動を待機..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🎨 フロントエンドを起動..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host "⏳ フロントエンドの起動を待機..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "🌐 ブラウザを起動..." -ForegroundColor Blue
Start-Process "http://localhost:5173"

Write-Host "✅ 起動完了！" -ForegroundColor Green
Write-Host "🌐 フロントエンド: http://localhost:5173" -ForegroundColor Blue
Write-Host "🔧 バックエンド: http://localhost:8000" -ForegroundColor Blue

Read-Host "Enterキーを押して終了"
