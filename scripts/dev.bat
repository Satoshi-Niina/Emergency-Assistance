@echo off
echo 🚀 開発環境を起動します...

REM 依存関係をインストール
echo 📦 依存関係をインストール中...
cd client && npm install
cd ..\server && npm install
cd ..

REM バックグラウンドでサーバーを起動
echo 🔧 バックエンドサーバーを起動中...
start "Backend Server" cmd /c "cd server && npm run dev"

REM 少し待ってからフロントエンドを起動
timeout /t 3 /nobreak > nul

echo 🌐 フロントエンドを起動中...
cd client && npm run dev

pause
