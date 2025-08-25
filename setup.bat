@echo off
setlocal enabledelayedexpansion

echo 噫 Emergency Assistance System Setup
echo =====================================

REM Check prerequisites
echo 搭 Checking prerequisites...

node --version >nul 2>&1
if errorlevel 1 (
    echo 笶・Node.js is not installed. Please install Node.js 18.0.0 or higher.
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo 笶・npm is not installed. Please install npm 8.0.0 or higher.
    pause
    exit /b 1
)

git --version >nul 2>&1
if errorlevel 1 (
    echo 笶・Git is not installed. Please install Git.
    pause
    exit /b 1
)

echo 笨・Prerequisites check passed

REM Install dependencies
echo 逃 Installing dependencies...
call npm run install:all

REM Environment setup
echo 笞呻ｸ・Setting up environment...

if not exist .env (
    echo 統 Creating .env file from template...
    copy env.example .env
    echo 笞・・ Please edit .env file with your configuration:
    echo    - DATABASE_URL: PostgreSQL connection string
    echo    - SESSION_SECRET: Random secret for sessions
    echo    - OPENAI_API_KEY: Your OpenAI API key
    echo.
    echo Press Enter when you've configured .env file...
    pause
) else (
    echo 笨・.env file already exists
)

REM Database setup
echo 淀・・Setting up database...

REM Check if DATABASE_URL is set
findstr /C:"DATABASE_URL=" .env >nul
if errorlevel 1 (
    echo 笞・・ Please configure DATABASE_URL in .env file before running database migrations
    echo    Example: DATABASE_URL=postgresql://username:password@localhost:5432/emergency_assistance
    echo.
    echo Press Enter when you've configured DATABASE_URL...
    pause
)

REM Run migrations
echo 売 Running database migrations...
call npm run db:migrate

echo.
echo 脂 Setup completed successfully!
echo.
echo Next steps:
echo 1. Start development server: npm run dev
echo 2. Open http://localhost:5002 in your browser
echo 3. (Optional) Seed initial data: npm run db:seed
echo.
echo Happy coding! 噫
pause 