#!/bin/bash

# Database Backup Script for Emergency Assistance System

set -e

# Configuration
BACKUP_DIR="./data/postgres/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="emergency_assistance_backup_${DATE}.sql"
RETENTION_DAYS=7

echo "🗄️ Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
DATABASE_NAME=${POSTGRES_DB:-emergency_assistance}

# Create backup
echo "📦 Creating backup: $BACKUP_FILE"
docker-compose exec -T postgres pg_dump \
    -U "$POSTGRES_USER" \
    -d "$DATABASE_NAME" \
    > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo "🗜️ Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Remove old backups
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "emergency_assistance_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List backups
echo "📋 Available backups:"
ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_FILE.gz" 