# Azure PostgreSQL Database Initialization Script
# Database connection information
$serverName = "emergencyassistance-db.postgres.database.azure.com"
$databaseName = "emergency_assistance"
$username = "satoshi_niina"
$port = "5432"

Write-Host "Starting Azure PostgreSQL database initialization..." -ForegroundColor Green

# Build PostgreSQL connection command
$env:PGPASSWORD = "Takabeni"  # Set password in environment variable (security best practice)

# Check if psql command is available
if (-not (Get-Command "psql" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: psql command not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "   Installation guide: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Testing database connection..." -ForegroundColor Cyan

# Connection test
$connectionTest = psql -h $serverName -p $port -U $username -d $databaseName -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database connection failed:" -ForegroundColor Red
    Write-Host $connectionTest -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Database connection successful" -ForegroundColor Green

# SQL script path
$scriptPath = Join-Path $PSScriptRoot "init-azure-database.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: SQL script not found: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Executing SQL script..." -ForegroundColor Cyan

# Execute SQL script
$result = psql -h $serverName -p $port -U $username -d $databaseName -f $scriptPath 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SQL script execution failed:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: SQL script execution completed" -ForegroundColor Green
Write-Host $result -ForegroundColor White

Write-Host ""
Write-Host "Database initialization completed successfully!" -ForegroundColor Green
Write-Host "   - Sample data inserted into machine_types table"
Write-Host "   - Sample data inserted into machines table"
Write-Host "   - Related data verification completed"

# Cleanup
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Next steps:"
Write-Host "   1. Restart App Service"
Write-Host "   2. Verify machine/model list displays in frontend"
Write-Host "   3. Verify data displays in settings UI"
