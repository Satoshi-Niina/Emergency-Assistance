@echo off
REM ========================================
REM Azure PostgreSQL Database Migration Script (Windows)
REM ========================================

echo 🚀 Starting Azure PostgreSQL database migration...

REM 環境変数の確認
if "%DATABASE_URL%"=="" (
    echo ❌ ERROR: DATABASE_URL environment variable is required
    exit /b 1
)

if "%LOCAL_DATABASE_URL%"=="" (
    echo ❌ ERROR: LOCAL_DATABASE_URL environment variable is required for source database
    exit /b 1
)

echo ✅ Environment variables are set

REM データベース接続テスト
echo 🔍 Testing database connections...

REM ローカルDB接続テスト
psql "%LOCAL_DATABASE_URL%" -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to connect to local database
    exit /b 1
)
echo ✅ Local database connection successful

REM Azure DB接続テスト
psql "%DATABASE_URL%" -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to connect to Azure database
    exit /b 1
)
echo ✅ Azure database connection successful

REM スキーマ作成
echo 📋 Creating schema in Azure database...
psql "%DATABASE_URL%" -f migrations\0001_initial_schema.sql
psql "%DATABASE_URL%" -f migrations\0002_fix_schema_issues.sql
psql "%DATABASE_URL%" -f migrations\0003_fix_schema_final.sql
psql "%DATABASE_URL%" -f migrations\0004_add_users_table.sql
psql "%DATABASE_URL%" -f migrations\0005_remove_flow_tables.sql

echo ✅ Schema migration completed

REM データダンプとリストア
echo 📦 Dumping data from local database...
pg_dump "%LOCAL_DATABASE_URL%" --no-owner --no-privileges --data-only --exclude-table=spatial_ref_sys > %TEMP%\webappdb_data.sql

echo 📥 Importing data to Azure database...
psql "%DATABASE_URL%" -f %TEMP%\webappdb_data.sql

echo 🧹 Cleaning up temporary files...
del %TEMP%\webappdb_data.sql

echo ✅ Database migration completed successfully!

REM 最終検証
echo 🔍 Verifying migration...
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM users;"') do set RECORD_COUNT=%%i
echo ✅ Users table has %RECORD_COUNT% records

echo 🎉 Migration completed successfully!
