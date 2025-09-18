@echo off
echo 🏭 本番環境シミュレーションを開始中...

echo 🛑 全プロセスを停止中...
taskkill /f /im node.exe 2>nul
taskkill /f /im tsx.exe 2>nul
timeout /t 3 /nobreak >nul

echo 📊 データベース接続テスト...
psql -U postgres -h localhost -d webappdb -c "SELECT COUNT(*) FROM users;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ データベース接続成功
) else (
    echo ❌ データベース接続失敗
    pause
    exit /b 1
)

echo 🚀 本番環境シミュレーションサーバーを起動中 (ポート3003)...
start "Production Simulation Server" cmd /k "node working-local-server-fixed.js"

echo ⏳ サーバー起動を待機中...
timeout /t 5 /nobreak >nul

echo 🩺 サーバーのヘルスチェック中...
curl -s http://localhost:3003/api/health >nul 2>&1
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
echo ✅ 本番環境シミュレーションが完了しました！
echo   - バックエンド: http://localhost:3003
echo   - フロントエンド: http://localhost:5173
echo   - テストユーザー: niina / 正しいパスワード
echo.
echo 🧪 本番環境シミュレーションテスト:
echo   1. ブラウザで http://localhost:5173 にアクセス
echo   2. ログインをテスト
echo   3. 全UIでデータが表示されることを確認
echo   4. エラーが発生しないことを確認
echo.
echo 📝 本番環境との対応関係:
echo   - ローカルDB → 本番Azure PostgreSQL
echo   - ローカルファイル → 本番Azure Blob Storage
echo   - ローカルサーバー → 本番Azure Functions
echo.
pause
