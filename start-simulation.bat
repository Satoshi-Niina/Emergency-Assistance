@echo off
echo 🚀 シミュレーション用サーバーを起動中...

echo 🛑 既存のプロセスを停止中...
taskkill /f /im node.exe >nul 2>&1

echo 🔧 バックエンドサーバーを起動中...
start /B node working-local-server-fixed.js

echo ⏳ バックエンドの起動を待機中...
timeout /t 3 /nobreak >nul

echo 🔍 バックエンド接続テスト...
curl -s http://localhost:3003/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ バックエンドサーバー: 正常動作中
) else (
    echo ❌ バックエンドサーバー: 接続失敗
)

echo 🎨 フロントエンドを起動中...
cd client
start npm run dev

echo ⏳ フロントエンドの起動を待機中...
timeout /t 5 /nobreak >nul

echo 🔍 フロントエンド接続テスト...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ フロントエンド: 正常動作中 (ポート5173)
) else (
    curl -s http://localhost:5002 >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ フロントエンド: 正常動作中 (ポート5002)
    ) else (
        curl -s http://localhost:5003 >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ フロントエンド: 正常動作中 (ポート5003)
        ) else (
            echo ❌ フロントエンド: 接続失敗
        )
    )
)

echo.
echo 🌐 アクセス先:
echo   フロントエンド: http://localhost:5173 (または 5002, 5003)
echo   バックエンドAPI: http://localhost:3003
echo.
echo 📝 テスト手順:
echo   1. ブラウザで上記URLにアクセス
echo   2. ログイン（niina / 正しいパスワード）
echo   3. 全UIでデータが表示されることを確認

cd ..
pause
