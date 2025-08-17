#!/bin/bash

# ========================================
# Azure PostgreSQL Database Migration Script
# ========================================

set -e

echo "🚀 Starting Azure PostgreSQL database migration..."

# 環境変数の確認
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "❌ ERROR: LOCAL_DATABASE_URL environment variable is required for source database"
    exit 1
fi

echo "✅ Environment variables are set"

# データベース接続テスト
echo "🔍 Testing database connections..."

# ローカルDB接続テスト
if psql "$LOCAL_DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Local database connection successful"
else
    echo "❌ Failed to connect to local database"
    exit 1
fi

# Azure DB接続テスト
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Azure database connection successful"
else
    echo "❌ Failed to connect to Azure database"
    exit 1
fi

# スキーマ作成
echo "📋 Creating schema in Azure database..."
psql "$DATABASE_URL" -f migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/0002_fix_schema_issues.sql
psql "$DATABASE_URL" -f migrations/0003_fix_schema_final.sql
psql "$DATABASE_URL" -f migrations/0004_add_users_table.sql
psql "$DATABASE_URL" -f migrations/0005_remove_flow_tables.sql

echo "✅ Schema migration completed"

# データダンプとリストア
echo "📦 Dumping data from local database..."
pg_dump "$LOCAL_DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --data-only \
    --exclude-table=spatial_ref_sys \
    > /tmp/webappdb_data.sql

echo "📥 Importing data to Azure database..."
psql "$DATABASE_URL" -f /tmp/webappdb_data.sql

echo "🧹 Cleaning up temporary files..."
rm -f /tmp/webappdb_data.sql

echo "✅ Database migration completed successfully!"

# 最終検証
echo "🔍 Verifying migration..."
RECORD_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")
echo "✅ Users table has $RECORD_COUNT records"

echo "🎉 Migration completed successfully!"
