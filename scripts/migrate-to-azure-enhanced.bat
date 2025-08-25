@echo off
REM ========================================
REM Azure PostgreSQL Database Migration Script (Enhanced)
REM ========================================

echo 噫 Starting Azure PostgreSQL database migration...

REM 迺ｰ蠅・､画焚縺ｮ遒ｺ隱・
if "%DATABASE_URL%"=="" (
    echo 笶・ERROR: DATABASE_URL environment variable is required
    exit /b 1
)

if "%LOCAL_DATABASE_URL%"=="" (
    echo 笶・ERROR: LOCAL_DATABASE_URL environment variable is required for source database
    exit /b 1
)

echo 笨・Environment variables are set

REM 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
echo 剥 Testing database connections...

REM 繝ｭ繝ｼ繧ｫ繝ｫDB謗･邯壹ユ繧ｹ繝・
psql "%LOCAL_DATABASE_URL%" -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo 笶・Failed to connect to local database
    exit /b 1
)
echo 笨・Local database connection successful

REM Azure DB謗･邯壹ユ繧ｹ繝・
psql "%DATABASE_URL%" -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo 笶・Failed to connect to Azure database
    exit /b 1
)
echo 笨・Azure database connection successful

REM 譌｢蟄倥ユ繝ｼ繝悶Ν縺ｮ遒ｺ隱・
echo 剥 Checking existing tables in Azure database...
psql "%DATABASE_URL%" -t -c "\dt" | findstr /c:"users" >nul
if not errorlevel 1 (
    echo 笞・・ WARNING: Tables already exist in target database
    set /p CONTINUE="Continue migration? This may overwrite existing data (y/N): "
    if /i not "%CONTINUE%"=="y" (
        echo 笶・Migration cancelled by user
        exit /b 1
    )
)

REM 繧ｹ繧ｭ繝ｼ繝樔ｽ懈・
echo 搭 Creating schema in Azure database...
echo   - Running 0001_initial_schema.sql...
psql "%DATABASE_URL%" -f migrations\0001_initial_schema.sql
if errorlevel 1 (
    echo 笶・ERROR: Failed to execute 0001_initial_schema.sql
    exit /b 1
)

echo   - Running 0002_fix_schema_issues.sql...
psql "%DATABASE_URL%" -f migrations\0002_fix_schema_issues.sql
if errorlevel 1 (
    echo 笶・ERROR: Failed to execute 0002_fix_schema_issues.sql
    exit /b 1
)

echo   - Running 0003_fix_schema_final.sql...
psql "%DATABASE_URL%" -f migrations\0003_fix_schema_final.sql
if errorlevel 1 (
    echo 笶・ERROR: Failed to execute 0003_fix_schema_final.sql
    exit /b 1
)

echo   - Running 0004_add_users_table.sql...
psql "%DATABASE_URL%" -f migrations\0004_add_users_table.sql
if errorlevel 1 (
    echo 笶・ERROR: Failed to execute 0004_add_users_table.sql
    exit /b 1
)

echo   - Running 0005_remove_flow_tables.sql...
psql "%DATABASE_URL%" -f migrations\0005_remove_flow_tables.sql
if errorlevel 1 (
    echo 笶・ERROR: Failed to execute 0005_remove_flow_tables.sql
    exit /b 1
)

echo 笨・Schema migration completed successfully

REM 繝・・繧ｿ遘ｻ陦鯉ｼ医が繝励す繝ｧ繝ｳ・・
set /p MIGRATE_DATA="Migrate data from local database? (y/N): "
if /i "%MIGRATE_DATA%"=="y" (
    echo 逃 Dumping data from local database...
    pg_dump "%LOCAL_DATABASE_URL%" --no-owner --no-privileges --data-only --exclude-table=spatial_ref_sys > %TEMP%\webappdb_data.sql
    if errorlevel 1 (
        echo 笶・ERROR: Failed to dump local database
        exit /b 1
    )

    echo 踏 Importing data to Azure database...
    psql "%DATABASE_URL%" -f %TEMP%\webappdb_data.sql
    if errorlevel 1 (
        echo 笶・ERROR: Failed to import data to Azure database
        del %TEMP%\webappdb_data.sql
        exit /b 1
    )

    echo ｧｹ Cleaning up temporary files...
    del %TEMP%\webappdb_data.sql

    echo 笨・Data migration completed successfully!
) else (
    echo 竢ｭ・・ Data migration skipped
)

REM 譛邨よ､懆ｨｼ
echo 剥 Verifying migration...
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set TABLE_COUNT=%%i
echo 笨・Created %TABLE_COUNT% tables in Azure database

REM 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繝悶Ν縺ｮ遒ｺ隱・
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM users;" 2^>nul ^|^| echo 0') do set USER_COUNT=%%i
echo 笨・Users table has %USER_COUNT% records

echo 脂 Migration completed successfully!
echo 統 Next steps:
echo   1. Update your application's DATABASE_URL to point to Azure
echo   2. Test your application with the new database
echo   3. Update your CI/CD pipeline if needed
