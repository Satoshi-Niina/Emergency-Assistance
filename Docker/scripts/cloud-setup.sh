#!/bin/bash

# Emergency Assistance System Cloud Setup Script
# This script sets up the application to run from cloud storage

set -e

echo "☁️ Emergency Assistance System Cloud Setup"
echo "==========================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI is not installed. Please install AWS CLI for S3 access."
    echo "   Visit: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/postgres/backup
mkdir -p logs
mkdir -p uploads
mkdir -p backups
mkdir -p ssl

# Environment setup
echo "⚙️ Setting up cloud environment..."

if [ ! -f .env ]; then
    echo "📝 Creating .env file from cloud template..."
    cp env.cloud.example .env
    echo "⚠️  Please edit .env file with your cloud configuration:"
    echo "   - AWS_ACCESS_KEY_ID: Your AWS access key"
    echo "   - AWS_SECRET_ACCESS_KEY: Your AWS secret key"
    echo "   - S3_BUCKET: Your S3 bucket name"
    echo "   - POSTGRES_PASSWORD: Database password"
    echo "   - SESSION_SECRET: Random secret for sessions"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
    echo ""
    echo "Press Enter when you've configured .env file..."
    read -r
else
    echo "✅ .env file already exists"
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check AWS credentials
if command -v aws &> /dev/null; then
    echo "🔐 Checking AWS credentials..."
    if aws sts get-caller-identity &> /dev/null; then
        echo "✅ AWS credentials are valid"
    else
        echo "❌ AWS credentials are invalid. Please configure AWS CLI."
        echo "   Run: aws configure"
        exit 1
    fi
fi

# Create S3 bucket if it doesn't exist
if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
    echo "🪣 Checking S3 bucket..."
    if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        echo "✅ S3 bucket exists: $S3_BUCKET"
    else
        echo "📦 Creating S3 bucket: $S3_BUCKET"
        aws s3 mb "s3://$S3_BUCKET" --region "${S3_REGION:-us-east-1}"
        echo "✅ S3 bucket created successfully"
    fi
    
    # Create bucket structure
    echo "📁 Creating S3 bucket structure..."
    aws s3api put-object --bucket "$S3_BUCKET" --key "uploads/"
    aws s3api put-object --bucket "$S3_BUCKET" --key "backups/"
    aws s3api put-object --bucket "$S3_BUCKET" --key "logs/"
    echo "✅ S3 bucket structure created"
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.cloud.yml build

# Start services
echo "🚀 Starting cloud services..."
docker-compose -f docker-compose.cloud.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.cloud.yml exec server npm run db:migrate

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.cloud.yml ps

echo ""
echo "🎉 Cloud setup completed successfully!"
echo ""
echo "Services are running at:"
echo "  - Frontend: http://localhost:5002"
echo "  - Backend:  http://localhost:3001"
echo "  - Database: localhost:5432"
echo ""
echo "Cloud storage:"
echo "  - S3 Bucket: $S3_BUCKET"
echo "  - Region: ${S3_REGION:-us-east-1}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.cloud.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.cloud.yml down"
echo "  - Restart services: docker-compose -f docker-compose.cloud.yml restart"
echo "  - Cloud backup: docker-compose -f docker-compose.cloud.yml --profile backup up cloud-backup"
echo ""
echo "Happy Cloud! ☁️" 