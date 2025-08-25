#!/bin/bash

# ========================================
# Azure PostgreSQL Database Migration Script
# ========================================

set -e

echo "噫 Starting Azure PostgreSQL database migration..."

# 迺ｰ蠅・､画焚縺ｮ遒ｺ隱・
if [ -z "$DATABASE_URL" ]; then
    echo "笶・ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo "笶・ERROR: LOCAL_DATABASE_URL environment variable is required for source database"
    exit 1
fi

echo "笨・Environment variables are set"

# 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
echo "剥 Testing database connections..."

# 繝ｭ繝ｼ繧ｫ繝ｫDB謗･邯壹ユ繧ｹ繝・
if psql "$LOCAL_DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "笨・Local database connection successful"
else
    echo "笶・Failed to connect to local database"
    exit 1
fi

# Azure DB謗･邯壹ユ繧ｹ繝・
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "笨・Azure database connection successful"
else
    echo "笶・Failed to connect to Azure database"
    exit 1
fi

# 繧ｹ繧ｭ繝ｼ繝樔ｽ懈・
echo "搭 Creating schema in Azure database..."
psql "$DATABASE_URL" -f migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/0002_fix_schema_issues.sql
psql "$DATABASE_URL" -f migrations/0003_fix_schema_final.sql
psql "$DATABASE_URL" -f migrations/0004_add_users_table.sql
psql "$DATABASE_URL" -f migrations/0005_remove_flow_tables.sql

echo "笨・Schema migration completed"

# 繝・・繧ｿ繝繝ｳ繝励→繝ｪ繧ｹ繝医い
echo "逃 Dumping data from local database..."
pg_dump "$LOCAL_DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --data-only \
    --exclude-table=spatial_ref_sys \
    > /tmp/webappdb_data.sql

echo "踏 Importing data to Azure database..."
psql "$DATABASE_URL" -f /tmp/webappdb_data.sql

echo "ｧｹ Cleaning up temporary files..."
rm -f /tmp/webappdb_data.sql

echo "笨・Database migration completed successfully!"

# 譛邨よ､懆ｨｼ
echo "剥 Verifying migration..."
RECORD_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")
echo "笨・Users table has $RECORD_COUNT records"

echo "脂 Migration completed successfully!"
