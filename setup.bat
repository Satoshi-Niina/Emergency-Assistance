@echo off
setlocal enabledelayedexpansion

echo 🚀 Emergency Assistance System Setup
echo =====================================

REM Check prerequisites
echo 📋 Checking prerequisites...

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18.0.0 or higher.
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm 8.0.0 or higher.
    pause
    exit /b 1
)

git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies
echo 📦 Installing dependencies...
call npm run install:all

REM Environment setup
echo ⚙️ Setting up environment...

if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file with your configuration:
    echo    - DATABASE_URL: PostgreSQL connection string
    echo    - SESSION_SECRET: Random secret for sessions
    echo    - OPENAI_API_KEY: Your OpenAI API key
    echo.
    echo Press Enter when you've configured .env file...
    pause
) else (
    echo ✅ .env file already exists
)

REM Database setup
echo 🗄️ Setting up database...

REM Check if DATABASE_URL is set
findstr /C:"DATABASE_URL=" .env >nul
if errorlevel 1 (
    echo ⚠️  Please configure DATABASE_URL in .env file before running database migrations
    echo    Example: DATABASE_URL=postgresql://username:password@localhost:5432/emergency_assistance
    echo.
    echo Press Enter when you've configured DATABASE_URL...
    pause
)

REM Run migrations
echo 🔄 Running database migrations...
call npm run db:migrate

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Start development server: npm run dev
echo 2. Open http://localhost:5002 in your browser
echo 3. (Optional) Seed initial data: npm run db:seed
echo.
echo Happy coding! 🚀
pause 