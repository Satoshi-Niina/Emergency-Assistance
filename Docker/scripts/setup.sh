#!/bin/bash

# Emergency Assistance System Docker Setup Script
# This script automates the Docker environment setup process

set -e

echo "🐳 Emergency Assistance System Docker Setup"
echo "============================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/postgres/init
mkdir -p data/postgres/backup
mkdir -p logs
mkdir -p uploads
mkdir -p backups
mkdir -p ssl

# Environment setup
echo "⚙️ Setting up environment..."

if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - POSTGRES_PASSWORD: Database password"
    echo "   - SESSION_SECRET: Random secret for sessions"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
    echo "   - FRONTEND_URL: Frontend URL"
    echo "   - VITE_API_BASE_URL: Backend API URL"
    echo ""
    echo "Press Enter when you've configured .env file..."
    read -r
else
    echo "✅ .env file already exists"
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec server npm run db:migrate

# Check service status
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Docker setup completed successfully!"
echo ""
echo "Services are running at:"
echo "  - Frontend: http://localhost:5002"
echo "  - Backend:  http://localhost:3001"
echo "  - Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Database studio: docker-compose --profile studio up studio"
echo ""
echo "Happy Docker! 🐳" 