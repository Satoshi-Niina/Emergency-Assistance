@echo off
REM Emergency Assistance Development Environment Setup
REM This script sets up the development environment for the Emergency Assistance system

echo 🚀 Setting up Emergency Assistance Development Environment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

echo 📦 Installing client dependencies...
cd client
call npm install
cd ..

echo 📦 Installing server dependencies...
cd server
call npm install
cd ..

echo 📦 Installing shared dependencies...
cd shared
call npm install
cd ..

echo 📦 Installing API dependencies...
cd api
call npm install
cd ..

echo 🔧 Checking Azure Functions Core Tools...
func --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Azure Functions Core Tools is installed
) else (
    echo ❌ Azure Functions Core Tools not found. Please install it first:
    echo    npm install -g azure-functions-core-tools@4 --unsafe-perm true
    pause
    exit /b 1
)

echo 🔧 Checking PostgreSQL connection...
echo ⚠️  Make sure PostgreSQL is running on localhost:5432
echo    Database: emergency_assistance
echo    Username: postgres
echo    Password: password

echo 🎯 Development environment setup complete!
echo.
echo Available commands:
echo   npm run dev        - Start client and server
echo   npm run dev:api    - Start Azure Functions API
echo   npm run watch      - Start all services (client, server, API)
echo   npm run build      - Build all components
echo.
echo To start development:
echo   1. Start PostgreSQL service
echo   2. Run: npm run watch
echo   3. Open http://localhost:5173 for client
echo   4. API will be available at http://localhost:7071

pause
