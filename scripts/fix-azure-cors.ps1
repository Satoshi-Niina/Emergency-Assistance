# Azure App Service CORS config fix script
# Emergency-Assistance project

param(
    [string]$ResourceGroup = "Emergency-Assistance_group",
    [string]$AppName = "emergency-assistance-bfckhjejb3fbf9du"
)

Write-Host "Azure App Service CORS config fix starting..." -ForegroundColor Cyan
Write-Host "App Service: $AppName" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow

# Check Azure CLI authentication
Write-Host "`nChecking Azure CLI authentication..." -ForegroundColor Cyan
try {
    $account = az account show --query "user.name" -o tsv 2>$null
    if ($LASTEXITCODE -eq 0 -and $account) {
        Write-Host "Azure CLI authenticated: $account" -ForegroundColor Green
    } else {
        throw "Azure CLI not authenticated"
    }
} catch {
    Write-Host "Please login to Azure CLI" -ForegroundColor Red
    Write-Host "Command: az login" -ForegroundColor Yellow
    exit 1
}

# Get current CORS settings
Write-Host "`nChecking current CORS settings..." -ForegroundColor Cyan
try {
    $currentCors = az webapp cors show --name $AppName --resource-group $ResourceGroup --query "allowedOrigins" -o json 2>$null
    if ($currentCors) {
        Write-Host "Current allowed origins:" -ForegroundColor Yellow
        $currentCors | ConvertFrom-Json | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    }
} catch {
    Write-Host "Failed to get current CORS settings" -ForegroundColor Yellow
}

# Apply new CORS settings
Write-Host "`nApplying new CORS settings..." -ForegroundColor Cyan

$allowedOrigins = @(
    "https://witty-river-012f39e00.1.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://localhost:5173",
    "https://127.0.0.1:5173"
)

Write-Host "Origins to allow:" -ForegroundColor Yellow
$allowedOrigins | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

try {
    # Clear existing CORS settings
    Write-Host "`nClearing existing CORS settings..." -ForegroundColor Cyan
    az webapp cors remove --name $AppName --resource-group $ResourceGroup --allowed-origins "*" 2>$null
    
    # Add new CORS settings
    Write-Host "Adding new CORS settings..." -ForegroundColor Cyan
    foreach ($origin in $allowedOrigins) {
        Write-Host "Adding origin: $origin" -ForegroundColor Gray
        az webapp cors add --name $AppName --resource-group $ResourceGroup --allowed-origins $origin 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Failed to add origin $origin" -ForegroundColor Yellow
        }
    }
    
    Write-Host "CORS settings updated successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to update CORS settings" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Verify settings
Write-Host "`nVerifying updated CORS settings..." -ForegroundColor Cyan
try {
    $newCors = az webapp cors show --name $AppName --resource-group $ResourceGroup --query "allowedOrigins" -o json 2>$null
    if ($newCors) {
        Write-Host "Updated allowed origins:" -ForegroundColor Yellow
        $newCors | ConvertFrom-Json | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
    }
} catch {
    Write-Host "Failed to verify updated CORS settings" -ForegroundColor Yellow
}

# Restart App Service
Write-Host "`nRestarting App Service to apply settings..." -ForegroundColor Cyan
try {
    az webapp restart --name $AppName --resource-group $ResourceGroup 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "App Service restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to restart App Service" -ForegroundColor Red
        Write-Host "Please restart manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to restart App Service" -ForegroundColor Red
    Write-Host "Please restart manually" -ForegroundColor Yellow
}

Write-Host "`nCORS configuration completed!" -ForegroundColor Green
Write-Host "Frontend should now be able to access backend" -ForegroundColor Cyan
Write-Host "Frontend URL: https://witty-river-012f39e00.1.azurestaticapps.net" -ForegroundColor Cyan
Write-Host "Backend URL: https://$AppName.azurewebsites.net" -ForegroundColor Cyan

Write-Host "`nSettings may take a few minutes to propagate" -ForegroundColor Yellow