# Azure Emergency Assistance System - Diagnostic Script
# Ensure UTF-8 encoding for console input/output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Emergency Assistance System - Azure Diagnostic Script" -ForegroundColor Green

$API_BASE = "https://emergency-backend-webapp.azurewebsites.net"
$FRONTEND_URL = "Azure Static Web Apps"

Write-Host ""
Write-Host "System Configuration:" -ForegroundColor Yellow
Write-Host "   Frontend: $FRONTEND_URL"
Write-Host "   Backend API: $API_BASE"
Write-Host "   Time: $(Get-Date)"

Write-Host ""
Write-Host "Running System Diagnostics..." -ForegroundColor Yellow

# 1. Basic API Health Check
Write-Host ""
Write-Host "1. API Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/health" -Method Get -TimeoutSec 30
    Write-Host "   API Status: $($response.status)" -ForegroundColor Green
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor Green
} catch {
    Write-Host "   API Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Database Connection Check
Write-Host ""
Write-Host "2. Database Connection Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/health/db" -Method Get -TimeoutSec 30
    Write-Host "   Database Status: $($response.status)" -ForegroundColor Green
    Write-Host "   Database: $($response.database)" -ForegroundColor Green
} catch {
    Write-Host "   Database Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Possible cause: Database connection string, auth, network" -ForegroundColor Yellow
}

# 3. GPT/OpenAI Connection Check
Write-Host ""
Write-Host "3. GPT Connection Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/health/gpt" -Method Get -TimeoutSec 30
    Write-Host "   GPT Status: $($response.status)" -ForegroundColor Green
    Write-Host "   API Key: $($response.apiKeyPrefix)" -ForegroundColor Green
} catch {
    Write-Host "   GPT Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Possible cause: OPENAI_API_KEY not set or invalid" -ForegroundColor Yellow
}

# 4. Login Test
Write-Host ""
Write-Host "4. Login Test..." -ForegroundColor Cyan
Write-Host "   Testing default admin credentials..." -ForegroundColor Gray

$loginData = @{
    username = "admin"
    password = "password"
} | ConvertTo-Json

try {
    $headers = @{
        'Content-Type' = 'application/json'
        'Accept' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method Post -Body $loginData -Headers $headers -TimeoutSec 30
    Write-Host "   Login Successful!" -ForegroundColor Green
    Write-Host "   User: $($response.user.display_name)" -ForegroundColor Green
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Green
} catch {
    Write-Host "   Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 401) {
            Write-Host "   Possible cause: Wrong credentials or user table not initialized" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "   Possible cause: Server error, database connection problem" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Default Login Credentials:" -ForegroundColor Yellow
Write-Host "   Admin:" -ForegroundColor Cyan
Write-Host "      Username: admin" -ForegroundColor White
Write-Host "      Password: password" -ForegroundColor White
Write-Host "   Employee:" -ForegroundColor Cyan
Write-Host "      Username: employee1" -ForegroundColor White
Write-Host "      Password: password" -ForegroundColor White

Write-Host ""
Write-Host "Diagnostic Complete!" -ForegroundColor Green
