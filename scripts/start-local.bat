@echo off
chcp 65001 >nul
title Local Development Environment

echo.
echo ====================================
echo   Local Development Setup
echo ====================================
echo.

REM Step 1: Switch to local configuration
echo [CONFIG] Applying local development settings...
powershell -Command "(Get-Content 'client\public\runtime-config.js') -replace '.*API_BASE_URL.*', '    \"API_BASE_URL\": \"http://localhost:8081/api\",' | Set-Content 'client\public\runtime-config.js'"

REM Step 2: Kill old Node processes
echo [CLEANUP] Stopping old Node.js processes...
taskkill /f /im node.exe >nul 2>&1

REM Step 3: Check dependencies
echo [DEPS] Checking dependencies...
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server && npm install && cd ..
)
if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client && npm install && cd ..
)

echo.
echo [SUCCESS] Setup completed!
echo.
echo ====================================
echo   Launch Commands
echo ====================================
echo.
echo Run these in 2 separate terminals:
echo.
echo Terminal 1 - Server:
echo    cd server ^&^& npm run dev
echo.
echo Terminal 2 - Frontend:
echo    cd client ^&^& npm run dev
echo.
echo Access URLs:
echo Frontend: http://localhost:5173
echo API: http://localhost:8081/api
echo.
pause