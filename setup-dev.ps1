# Emergency Assistance Development Environment Setup
# This script sets up the development environment for the Emergency Assistance system

Write-Host "🚀 Setting up Emergency Assistance Development Environment..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
cd client
npm install
cd ..

Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
cd server
npm install
cd ..

Write-Host "📦 Installing shared dependencies..." -ForegroundColor Yellow
cd shared
npm install
cd ..

Write-Host "📦 Installing API dependencies..." -ForegroundColor Yellow
cd api
npm install
cd ..

Write-Host "🔧 Checking Azure Functions Core Tools..." -ForegroundColor Yellow
$funcVersion = func --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Azure Functions Core Tools version: $funcVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Azure Functions Core Tools not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g azure-functions-core-tools@4 --unsafe-perm true" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Checking PostgreSQL connection..." -ForegroundColor Yellow
# You may need to start PostgreSQL service
Write-Host "⚠️  Make sure PostgreSQL is running on localhost:5432" -ForegroundColor Yellow
Write-Host "   Database: emergency_assistance" -ForegroundColor Yellow
Write-Host "   Username: postgres" -ForegroundColor Yellow
Write-Host "   Password: password" -ForegroundColor Yellow

Write-Host "🎯 Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  npm run dev        - Start client and server" -ForegroundColor White
Write-Host "  npm run dev:api    - Start Azure Functions API" -ForegroundColor White
Write-Host "  npm run watch      - Start all services (client, server, API)" -ForegroundColor White
Write-Host "  npm run build      - Build all components" -ForegroundColor White
Write-Host ""
Write-Host "To start development:" -ForegroundColor Cyan
Write-Host "  1. Start PostgreSQL service" -ForegroundColor White
Write-Host "  2. Run: npm run watch" -ForegroundColor White
Write-Host "  3. Open http://localhost:5173 for client" -ForegroundColor White
Write-Host "  4. API will be available at http://localhost:7071" -ForegroundColor White
