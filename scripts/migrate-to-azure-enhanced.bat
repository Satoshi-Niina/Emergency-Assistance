@echo off
REM ========================================
REM Azure PostgreSQL Database Migration Script (Enhanced)
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

REM 既存テーブルの確認
echo 🔍 Checking existing tables in Azure database...
psql "%DATABASE_URL%" -t -c "\dt" | findstr /c:"users" >nul
if not errorlevel 1 (
    echo ⚠️  WARNING: Tables already exist in target database
    set /p CONTINUE="Continue migration? This may overwrite existing data (y/N): "
    if /i not "%CONTINUE%"=="y" (
        echo ❌ Migration cancelled by user
        exit /b 1
    )
)

REM スキーマ作成
echo 📋 Creating schema in Azure database...
echo   - Running 0001_initial_schema.sql...
psql "%DATABASE_URL%" -f migrations\0001_initial_schema.sql
if errorlevel 1 (
    echo ❌ ERROR: Failed to execute 0001_initial_schema.sql
    exit /b 1
)

echo   - Running 0002_fix_schema_issues.sql...
psql "%DATABASE_URL%" -f migrations\0002_fix_schema_issues.sql
if errorlevel 1 (
    echo ❌ ERROR: Failed to execute 0002_fix_schema_issues.sql
    exit /b 1
)

echo   - Running 0003_fix_schema_final.sql...
psql "%DATABASE_URL%" -f migrations\0003_fix_schema_final.sql
if errorlevel 1 (
    echo ❌ ERROR: Failed to execute 0003_fix_schema_final.sql
    exit /b 1
)

echo   - Running 0004_add_users_table.sql...
psql "%DATABASE_URL%" -f migrations\0004_add_users_table.sql
if errorlevel 1 (
    echo ❌ ERROR: Failed to execute 0004_add_users_table.sql
    exit /b 1
)

echo   - Running 0005_remove_flow_tables.sql...
psql "%DATABASE_URL%" -f migrations\0005_remove_flow_tables.sql
if errorlevel 1 (
    echo ❌ ERROR: Failed to execute 0005_remove_flow_tables.sql
    exit /b 1
)

echo ✅ Schema migration completed successfully

REM データ移行（オプション）
set /p MIGRATE_DATA="Migrate data from local database? (y/N): "
if /i "%MIGRATE_DATA%"=="y" (
    echo 📦 Dumping data from local database...
    pg_dump "%LOCAL_DATABASE_URL%" --no-owner --no-privileges --data-only --exclude-table=spatial_ref_sys > %TEMP%\webappdb_data.sql
    if errorlevel 1 (
        echo ❌ ERROR: Failed to dump local database
        exit /b 1
    )

    echo 📥 Importing data to Azure database...
    psql "%DATABASE_URL%" -f %TEMP%\webappdb_data.sql
    if errorlevel 1 (
        echo ❌ ERROR: Failed to import data to Azure database
        del %TEMP%\webappdb_data.sql
        exit /b 1
    )

    echo 🧹 Cleaning up temporary files...
    del %TEMP%\webappdb_data.sql

    echo ✅ Data migration completed successfully!
) else (
    echo ⏭️  Data migration skipped
)

REM 最終検証
echo 🔍 Verifying migration...
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set TABLE_COUNT=%%i
echo ✅ Created %TABLE_COUNT% tables in Azure database

REM ユーザーテーブルの確認
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM users;" 2^>nul ^|^| echo 0') do set USER_COUNT=%%i
echo ✅ Users table has %USER_COUNT% records

echo 🎉 Migration completed successfully!
echo 📝 Next steps:
echo   1. Update your application's DATABASE_URL to point to Azure
echo   2. Test your application with the new database
echo   3. Update your CI/CD pipeline if needed
