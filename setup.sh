#!/bin/bash

# Emergency Assistance System Setup Script
# This script automates the initial setup process

set -e

echo "🚀 Emergency Assistance System Setup"
echo "====================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm 8.0.0 or higher."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18.0.0 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Environment setup
echo "⚙️ Setting up environment..."

if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - DATABASE_URL: PostgreSQL connection string"
    echo "   - SESSION_SECRET: Random secret for sessions"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
    echo ""
    echo "Press Enter when you've configured .env file..."
    read -r
else
    echo "✅ .env file already exists"
fi

# Database setup
echo "🗄️ Setting up database..."

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env || grep -q "DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance" .env; then
    echo "⚠️  Please configure DATABASE_URL in .env file before running database migrations"
    echo "   Example: DATABASE_URL=postgresql://username:password@localhost:5432/emergency_assistance"
    echo ""
    echo "Press Enter when you've configured DATABASE_URL..."
    read -r
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Open http://localhost:5002 in your browser"
echo "3. (Optional) Seed initial data: npm run db:seed"
echo ""
echo "Happy coding! 🚀" 