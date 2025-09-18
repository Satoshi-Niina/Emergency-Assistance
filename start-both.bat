@echo off
echo 🚀 フロントエンドとバックエンドを同時起動中...

echo 🔧 バックエンドサーバーを起動中...
start "Backend Server" cmd /k "node working-local-server-debug.js"

echo ⏳ バックエンドの起動を待機中...
timeout /t 3 /nobreak >nul

echo 🎨 フロントエンドを起動中...
start "Frontend Server" cmd /k "cd client && npm run dev"

echo ⏳ フロントエンドの起動を待機中...
timeout /t 5 /nobreak >nul

echo 🔍 接続テスト中...
curl -s http://localhost:3003/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ バックエンドサーバー: 正常動作中
) else (
    echo ❌ バックエンドサーバー: 接続失敗
)

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ フロントエンド: 正常動作中
) else (
    echo ❌ フロントエンド: 接続失敗
)

echo.
echo 🌐 アクセス先:
echo   フロントエンド: http://localhost:5173
echo   バックエンドAPI: http://localhost:3003
echo.
echo 📝 テスト手順:
echo   1. ブラウザで http://localhost:5173 にアクセス
echo   2. ログイン（niina / 正しいパスワード）
echo   3. 各UIでデータが表示されることを確認

pause
