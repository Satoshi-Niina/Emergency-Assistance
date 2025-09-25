@echo off
echo 🚀 開発環境を起動中...

REM 環境変数を設定
set NODE_ENV=development
set PORT=8000
set DATABASE_URL=postgresql://postgres@localhost:5432/emergency_assistance
set JWT_SECRET=dev-jwt-secret-key-32-characters-long
set SESSION_SECRET=dev-session-secret-32-characters-long
set FRONTEND_URL=http://localhost:5173
set TRUST_PROXY=0

echo 📦 依存関係をインストール中...
call npm install

echo 🔧 バックエンドサーバーを起動中...
start "Backend Server" cmd /k "cd server && node production-server.js"

echo ⏳ バックエンドの起動を待機中...
timeout /t 8 /nobreak > nul

echo 🎨 フロントエンドを起動中...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo ⏳ フロントエンドの起動を待機中...
timeout /t 10 /nobreak > nul

echo 🌐 ブラウザを起動中...
start http://localhost:5173

echo ✅ 開発環境が起動しました！
echo 🌐 フロントエンド: http://localhost:5173
echo 🔧 バックエンド: http://localhost:8000
echo 📊 ヘルスチェック: http://localhost:8000/api/health

pause
