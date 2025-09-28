# Manual deployment script (GitHub Actions billing limit workaround)

Write-Host "Starting manual deployment..." -ForegroundColor Green

# 1. Create server zip file
Write-Host "Creating server zip file..." -ForegroundColor Yellow
if (Test-Path "server-deploy.zip") {
    Remove-Item "server-deploy.zip"
}

# Zip server directory contents
Compress-Archive -Path "server\*" -DestinationPath "server-deploy.zip" -Force

# 2. Deploy to Azure App Service
Write-Host "Deploying to Azure App Service..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --name "Emergencyassistance-sv" `
    --resource-group "rg-Emergencyassistant-app" `
    --src "server-deploy.zip"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed!" -ForegroundColor Green
    
    # 3. Start App Service
    Write-Host "Starting App Service..." -ForegroundColor Yellow
    az webapp start --name "Emergencyassistance-sv" --resource-group "rg-Emergencyassistant-app"
    
    # 4. Health check
    Write-Host "Performing health check..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    try {
        $response = Invoke-WebRequest -Uri "https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health" -Method GET
        Write-Host "Health check successful: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "Deployment failed" -ForegroundColor Red
}

# 5. Cleanup
Write-Host "Cleaning up..." -ForegroundColor Yellow
if (Test-Path "server-deploy.zip") {
    Remove-Item "server-deploy.zip"
}

Write-Host "Manual deployment completed!" -ForegroundColor Green
