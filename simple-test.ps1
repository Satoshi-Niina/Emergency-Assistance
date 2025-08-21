# Emergency Assistance API Test Script

Write-Host "API Test Start" -ForegroundColor Green

# API URLs
$baseUrl = "https://emergency-backend-app.azurewebsites.net"
$healthUrl = "$baseUrl/api/health"
$loginUrl = "$baseUrl/api/auth/login"

Write-Host "API Base URL: $baseUrl" -ForegroundColor Cyan

# 1. Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 30
    Write-Host "Health Check Success:" -ForegroundColor Green
    Write-Host ($healthResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Login Test
Write-Host "2. Login Test..." -ForegroundColor Yellow

$loginData = @{
    username = "niina"
    password = "Test896845"
} | ConvertTo-Json

Write-Host "Login Data: $loginData" -ForegroundColor Cyan

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 30
    Write-Host "Login Success:" -ForegroundColor Green
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "HTTP Status: $statusCode - $statusDescription" -ForegroundColor Red
    }
}

# 3. Admin Login Test
Write-Host "3. Admin Login Test..." -ForegroundColor Yellow

$adminLoginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $adminLoginData -ContentType "application/json" -TimeoutSec 30
    Write-Host "Admin Login Success:" -ForegroundColor Green
    Write-Host ($adminResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "Admin Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test Complete" -ForegroundColor Green
