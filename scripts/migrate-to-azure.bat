@echo off
REM ========================================
REM Azure PostgreSQL Database Migration Script (Windows)
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

REM 繧ｹ繧ｭ繝ｼ繝樔ｽ懈・
echo 搭 Creating schema in Azure database...
psql "%DATABASE_URL%" -f migrations\0001_initial_schema.sql
psql "%DATABASE_URL%" -f migrations\0002_fix_schema_issues.sql
psql "%DATABASE_URL%" -f migrations\0003_fix_schema_final.sql
psql "%DATABASE_URL%" -f migrations\0004_add_users_table.sql
psql "%DATABASE_URL%" -f migrations\0005_remove_flow_tables.sql

echo 笨・Schema migration completed

REM 繝・・繧ｿ繝繝ｳ繝励→繝ｪ繧ｹ繝医い
echo 逃 Dumping data from local database...
pg_dump "%LOCAL_DATABASE_URL%" --no-owner --no-privileges --data-only --exclude-table=spatial_ref_sys > %TEMP%\webappdb_data.sql

echo 踏 Importing data to Azure database...
psql "%DATABASE_URL%" -f %TEMP%\webappdb_data.sql

echo ｧｹ Cleaning up temporary files...
del %TEMP%\webappdb_data.sql

echo 笨・Database migration completed successfully!

REM 譛邨よ､懆ｨｼ
echo 剥 Verifying migration...
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM users;"') do set RECORD_COUNT=%%i
echo 笨・Users table has %RECORD_COUNT% records

echo 脂 Migration completed successfully!
