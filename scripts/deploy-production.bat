@echo off
title Azure本番デプロイ準備

echo.
echo ====================================
echo   ☁️ Azure本番デプロイ準備
echo ====================================
echo.

REM Step 1: 本番設定に変更
echo 🔧 本番環境設定を適用中...
powershell -Command "$content = @'
// Azure本番環境設定 - 自動判定
window.CONFIG = (() => {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
        return {
            \"API_BASE_URL\": \"http://localhost:8081/api\"
        };
    } else {
        return {
            \"API_BASE_URL\": \"/api\"
        };
    }
})();
'@; $content | Set-Content 'client\public\runtime-config.js'"

echo.
echo ✅ 本番設定完了！
echo.
echo ====================================
echo   📤 デプロイ手順
echo ====================================
echo.
echo 1. コミット ^& プッシュ:
echo    git add .
echo    git commit -m "Production deployment ready"
echo    git push origin main
echo.
echo 2. GitHub Actionsで自動デプロイされます
echo.
echo 3. デプロイ確認:
echo    🔗 https://witty-river-012f39e00.1.azurestaticapps.net
echo.
pause