# Emergency Assistance クイックスタートスクリプト
# 最小限の設定でローカル環境を起動します

Write-Host "🚀 Emergency Assistance クイックスタート..." -ForegroundColor Green

# 環境変数の設定（実際の値に変更してください）
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/emergency_assistance"
$env:JWT_SECRET = "CHANGE_THIS_JWT_SECRET_TO_32_CHARACTERS_MINIMUM"
$env:SESSION_SECRET = "CHANGE_THIS_SESSION_SECRET_TO_32_CHARACTERS_MINIMUM"
$env:FRONTEND_URL = "http://localhost:5173"
$env:OPENAI_API_KEY = "sk-CHANGE_THIS_TO_YOUR_ACTUAL_OPENAI_API_KEY"

Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

Write-Host "🎯 開発環境を起動中..." -ForegroundColor Cyan

# バックエンドを起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node production-server.js"

# 少し待機
Start-Sleep -Seconds 3

# フロントエンドを起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

# ブラウザを開く
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host "✅ 起動完了！" -ForegroundColor Green
Write-Host "🌐 http://localhost:5173 でアクセスできます" -ForegroundColor Blue
