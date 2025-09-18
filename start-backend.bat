@echo off
REM バックエンドサーバー起動スクリプト（本格版）
echo 🚀 Emergency Assistance バックエンドサーバーを起動中...

REM 環境変数を設定（本格版）
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
set SESSION_SECRET=your-super-secret-session-key-change-in-production-12345
set ALLOW_DUMMY_LOGIN=false
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
echo 🔍 データベース接続をテスト中...

REM データベース接続テスト
psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ データベース接続成功
) else (
    echo ❌ データベース接続失敗
    echo PostgreSQLが起動していることを確認してください
    pause
    exit /b 1
)

echo.
echo 🎯 バックエンドサーバーを起動中...
echo   - サーバーURL: http://localhost:%PORT%
echo   - データベース: 接続済み
echo   - 認証モード: 本格認証（ダミー無効）
echo.

REM サーバーディレクトリに移動して起動
cd server
call npm run dev
