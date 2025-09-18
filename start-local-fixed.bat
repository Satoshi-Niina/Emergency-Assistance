@echo off
echo 🔧 確実に動作するローカル環境を起動中...

echo 🛑 全プロセスを停止中...
taskkill /f /im node.exe 2>nul
taskkill /f /im tsx.exe 2>nul
timeout /t 3 /nobreak >nul

echo 📊 データベース接続テスト...
psql -U postgres -h localhost -d emergency_assistance -c "SELECT COUNT(*) FROM users;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ データベース接続成功
) else (
    echo ❌ データベース接続失敗
    pause
    exit /b 1
)

echo 👤 テストユーザーを確認中...
psql -U postgres -h localhost -d emergency_assistance -c "SELECT username FROM users WHERE username='testuser';" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ テストユーザー確認完了
) else (
    echo ⚠️ テストユーザーが見つかりません
)

echo.
echo 🚀 ローカルテストサーバーを起動中 (ポート3001)...
start "Backend Server" cmd /k "node local-test-server.js"

echo ⏳ サーバー起動を待機中...
timeout /t 5 /nobreak >nul

echo 🩺 サーバーのヘルスチェック中...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ サーバーが正常に起動しました
) else (
    echo ❌ サーバーの起動に失敗しました
    pause
    exit /b 1
)

echo 🌐 フロントエンドを起動中 (ポート5173)...
start "Frontend" cmd /k "cd client && npm run dev"

echo.
echo ✅ ローカル環境の起動が完了しました！
echo   - バックエンド: http://localhost:3001
echo   - フロントエンド: http://localhost:5173
echo   - テストユーザー: testuser / test123
echo.
echo 🧪 テスト手順:
echo   1. ブラウザで http://localhost:5173 にアクセス
echo   2. ログインページで testuser / test123 を入力
echo   3. ログインボタンをクリック
echo   4. ログイン成功を確認
echo.
pause
