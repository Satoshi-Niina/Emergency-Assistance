@echo off
echo 🚀 Emergency Assistance クイックスタート...

REM 環境変数の設定
set NODE_ENV=development
set PORT=8000
set DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
set JWT_SECRET=dev-jwt-secret-key-32-characters-long
set SESSION_SECRET=dev-session-secret-32-characters-long
set FRONTEND_URL=http://localhost:5173
set OPENAI_API_KEY=sk-proj-TP8fCh3xQCaUgXaCKuq_h8ckh8VAhfuDi-0Ln

echo 📦 依存関係をインストール中...
call npm install
cd client
call npm install
cd ..
cd server
call npm install
cd ..

echo 🎯 開発環境を起動中...

REM バックエンドを起動
start "Backend Server" cmd /k "cd server && node production-server.js"

REM 少し待機
timeout /t 3 /nobreak > nul

REM フロントエンドを起動
start "Frontend Dev Server" cmd /k "cd client && npm run dev"

REM ブラウザを開く
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo ✅ 起動完了！
echo 🌐 http://localhost:5173 でアクセスできます
pause
