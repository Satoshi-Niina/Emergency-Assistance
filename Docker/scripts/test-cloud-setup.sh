#!/bin/bash

# Emergency Assistance System Test Cloud Setup
# 評価用のクラウド環境を簡単に構築

set -e

echo "🧪 Emergency Assistance System Test Cloud Setup"
echo "================================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/postgres/test
mkdir -p logs
mkdir -p uploads
mkdir -p scripts

# Create test environment file
echo "⚙️ Creating test environment..."
cat > .env.test << EOF
# Test Environment Variables
NODE_ENV=test
POSTGRES_USER=postgres
POSTGRES_PASSWORD=testpassword123
POSTGRES_DB=emergency_assistance_test

# MinIO S3 Test Configuration
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
S3_BUCKET=test-bucket
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000

# Application Configuration
SESSION_SECRET=test-session-secret-123
OPENAI_API_KEY=test-openai-key
FRONTEND_URL=http://localhost:5002
VITE_API_BASE_URL=http://localhost:3001
LOG_LEVEL=debug
EOF

echo "✅ Test environment created"

# Create test data SQL file
echo "📝 Creating test data..."
cat > scripts/test-data.sql << EOF
-- Test data for Emergency Assistance System
-- This will be loaded into the test database

-- Create test users
INSERT INTO users (username, email, password_hash, role, created_at) VALUES
('testadmin', 'admin@test.com', '\$2b\$10\$test.hash.here', 'admin', NOW()),
('testuser', 'user@test.com', '\$2b\$10\$test.hash.here', 'user', NOW())
ON CONFLICT (username) DO NOTHING;

-- Create test emergency flows
INSERT INTO emergency_flows (title, description, steps, created_by, created_at) VALUES
('Test Emergency Flow', 'A test emergency flow for evaluation', 
 '[{"id": "1", "type": "step", "content": "Test step 1"}, {"id": "2", "type": "decision", "content": "Test decision"}]',
 1, NOW())
ON CONFLICT DO NOTHING;

-- Create test chat sessions
INSERT INTO chats (user_id, title, created_at) VALUES
(1, 'Test Chat Session', NOW()),
(2, 'Another Test Chat', NOW())
ON CONFLICT DO NOTHING;

-- Create test messages
INSERT INTO messages (chat_id, content, role, created_at) VALUES
(1, 'Hello, this is a test message', 'user', NOW()),
(1, 'This is a test response from the system', 'assistant', NOW()),
(2, 'Another test message', 'user', NOW())
ON CONFLICT DO NOTHING;

-- Create test knowledge base documents
INSERT INTO documents (title, content, category, created_by, created_at) VALUES
('Test Document 1', 'This is a test document for evaluation purposes.', 'manual', 1, NOW()),
('Test Document 2', 'Another test document with different content.', 'guide', 1, NOW())
ON CONFLICT DO NOTHING;

SELECT 'Test data loaded successfully!' as status;
EOF

echo "✅ Test data created"

# Start test services
echo "🚀 Starting test services..."
docker-compose -f docker-compose.test-cloud.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.test-cloud.yml exec server npm run db:migrate

# Load test data
echo "📊 Loading test data..."
docker-compose -f docker-compose.test-cloud.yml --profile test-data up test-data

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.test-cloud.yml ps

echo ""
echo "🎉 Test cloud environment setup completed!"
echo ""
echo "Services are running at:"
echo "  - Frontend: http://localhost:5002"
echo "  - Backend:  http://localhost:3001"
echo "  - Database: localhost:5432"
echo "  - MinIO S3: http://localhost:9000 (Console: http://localhost:9001)"
echo "  - Drizzle Studio: http://localhost:4983"
echo ""
echo "Test credentials:"
echo "  - MinIO: minioadmin / minioadmin123"
echo "  - Database: postgres / testpassword123"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.test-cloud.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.test-cloud.yml down"
echo "  - Restart services: docker-compose -f docker-compose.test-cloud.yml restart"
echo "  - Test API: curl http://localhost:3001/api/health"
echo ""
echo "Happy Testing! 🧪" 