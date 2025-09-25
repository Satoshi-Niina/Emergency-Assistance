# ローカル開発環境起動スクリプト（シンプル版）
Write-Host "🚀 ローカル開発環境を起動中..." -ForegroundColor Green

# 環境変数を設定（本番サーバー用）
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgresql://postgres@localhost:5432/emergency_assistance"
$env:JWT_SECRET = "dev-jwt-secret-key-32-characters-long"
$env:SESSION_SECRET = "dev-session-secret-32-characters-long"
$env:FRONTEND_URL = "http://localhost:5173"
$env:TRUST_PROXY = "0"

Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
npm install

Write-Host "🔧 バックエンドサーバーを起動中..." -ForegroundColor Cyan
Write-Host "   使用サーバー: production-server.js" -ForegroundColor Gray
Write-Host "   ポート: 8000" -ForegroundColor Gray
Write-Host "   データベース: localhost:5432" -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node production-server.js" -WindowStyle Normal

Write-Host "⏳ バックエンドの起動を待機中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🎨 フロントエンドを起動中..." -ForegroundColor Magenta
Write-Host "   ポート: 5173" -ForegroundColor Gray
Write-Host "   API接続先: http://localhost:8000" -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host "✅ ローカル開発環境が起動しました！" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 フロントエンド: http://localhost:5173" -ForegroundColor Blue
Write-Host "🔧 バックエンド: http://localhost:8000" -ForegroundColor Blue
Write-Host "📊 ヘルスチェック: http://localhost:8000/api/health" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  データベースが起動していない場合は、PostgreSQLを起動してください" -ForegroundColor Yellow

Read-Host "Enterキーを押して終了"
