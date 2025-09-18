@echo off
REM 開発環境起動スクリプト
echo 🚀 Emergency Assistance 開発環境を起動中...

REM 環境変数を設定
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
set SESSION_SECRET=your-super-secret-session-key-change-in-production-12345
set ALLOW_DUMMY_LOGIN=true
set FRONTEND_ORIGIN=http://localhost:5173
set PORT=3001

echo 📋 設定された環境変数:
echo   NODE_ENV: %NODE_ENV%
echo   DATABASE_URL: %DATABASE_URL%
echo   SESSION_SECRET: 設定済み
echo   ALLOW_DUMMY_LOGIN: %ALLOW_DUMMY_LOGIN%
echo   FRONTEND_ORIGIN: %FRONTEND_ORIGIN%
echo   PORT: %PORT%

echo.
echo 🎯 全サービスを起動中...
echo   - フロントエンド: http://localhost:5173
echo   - バックエンド: http://localhost:3001
echo   - Azure Functions API: http://localhost:7071
echo.

REM 全サービスを起動
call npm run watch
