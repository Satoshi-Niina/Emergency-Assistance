# Production deployment fix script
# Fixes authentication and health check issues

Write-Host "🚀 Starting production deployment fix..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "server/production-server.js")) {
    Write-Host "❌ Error: server/production-server.js not found. Please run from project root." -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location server
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Set-Location ..

# Create a clean deployment directory
$deployDir = "deploy-production-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $deployDir -Force

# Copy necessary files
Copy-Item "server/production-server.js" "$deployDir/"
Copy-Item "server/routes/auth.js" "$deployDir/routes/" -Force
New-Item -ItemType Directory -Path "$deployDir/routes" -Force
Copy-Item "server/routes/auth.js" "$deployDir/routes/"

Copy-Item "server/package.json" "$deployDir/"
Copy-Item "server/node_modules" "$deployDir/" -Recurse -Force

# Create web.config for Azure App Service
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="production-server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^production-server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="production-server.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
    <iisnode watchedFiles="web.config;*.js"/>
  </system.webServer>
</configuration>
"@

Set-Content -Path "$deployDir/web.config" -Value $webConfig

# Create package.json for deployment
$deployPackageJson = @"
{
  "name": "emergency-assistance-production",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "production-server.js",
  "scripts": {
    "start": "node production-server.js"
  },
  "engines": {
    "node": ">=18 <23"
  }
}
"@

Set-Content -Path "$deployDir/package.json" -Value $deployPackageJson

Write-Host "✅ Deployment package created: $deployDir" -ForegroundColor Green

# Step 3: Test the deployment package locally
Write-Host "🧪 Testing deployment package locally..." -ForegroundColor Yellow
Set-Location $deployDir

# Set environment variables for testing
$env:BYPASS_DB_FOR_LOGIN = "true"
$env:JWT_SECRET = "test-secret-key-for-deployment-test"
$env:SESSION_SECRET = "test-session-secret-for-deployment-test"
$env:NODE_ENV = "production"

# Start server in background
$serverProcess = Start-Process -FilePath "node" -ArgumentList "production-server.js" -PassThru -NoNewWindow

# Wait for server to start
Start-Sleep -Seconds 5

# Test health endpoints
$healthTests = @(
    "http://localhost:8000/api/health",
    "http://localhost:8000/api/healthz", 
    "http://localhost:8000/health",
    "http://localhost:8000/healthz"
)

$allHealthy = $true
foreach ($url in $healthTests) {
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        if ($response.ok -eq $true) {
            Write-Host "✅ Health check passed: $url" -ForegroundColor Green
        } else {
            Write-Host "❌ Health check failed: $url - Response: $($response | ConvertTo-Json)" -ForegroundColor Red
            $allHealthy = $false
        }
    } catch {
        Write-Host "❌ Health check error: $url - $($_.Exception.Message)" -ForegroundColor Red
        $allHealthy = $false
    }
}

# Test auth endpoints
try {
    $handshakeResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/handshake" -Method Get -TimeoutSec 10
    if ($handshakeResponse.ok -eq $true) {
        Write-Host "✅ Auth handshake passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Auth handshake failed: $($handshakeResponse | ConvertTo-Json)" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "❌ Auth handshake error: $($_.Exception.Message)" -ForegroundColor Red
    $allHealthy = $false
}

# Test login endpoint
try {
    $loginBody = @{
        username = "test"
        password = "test"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    if ($loginResponse.success -eq $true) {
        Write-Host "✅ Auth login passed (bypass mode)" -ForegroundColor Green
    } else {
        Write-Host "❌ Auth login failed: $($loginResponse | ConvertTo-Json)" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "❌ Auth login error: $($_.Exception.Message)" -ForegroundColor Red
    $allHealthy = $false
}

# Stop test server
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue

Set-Location ..

if ($allHealthy) {
    Write-Host "🎉 All local tests passed! Ready for deployment." -ForegroundColor Green
    
    # Create deployment instructions
    $instructions = @"
# Production Deployment Instructions

## Environment Variables to Set in Azure App Service:

1. BYPASS_DB_FOR_LOGIN=true (initially, set to false after DB is confirmed working)
2. JWT_SECRET=<your-jwt-secret>
3. SESSION_SECRET=<your-session-secret>
4. DATABASE_URL=<your-postgresql-connection-string>
5. PG_SSL=prefer (will auto-fallback to disable if SSL not supported)
6. NODE_ENV=production

## Deployment Steps:

1. Zip the contents of: $deployDir
2. Deploy to Azure App Service
3. Set environment variables
4. Test endpoints:
   - /api/health, /api/healthz, /health, /healthz (should return 200 with {"ok":true})
   - /api/auth/handshake (should return 200 with {"ok":true})
   - /api/auth/login (should return 200 with {"success":true} in bypass mode)
   - /api/auth/me (should return 401 when unauthenticated)

## After Deployment:

1. Test with BYPASS_DB_FOR_LOGIN=true first
2. If successful, set BYPASS_DB_FOR_LOGIN=false and test DB connection
3. If SSL errors occur, set PG_SSL=disable

## Rollback:

If issues occur, set BYPASS_DB_FOR_LOGIN=true to restore basic functionality.
"@

    Set-Content -Path "$deployDir/DEPLOYMENT_INSTRUCTIONS.md" -Value $instructions
    
    Write-Host "📋 Deployment instructions saved to: $deployDir/DEPLOYMENT_INSTRUCTIONS.md" -ForegroundColor Cyan
    Write-Host "📦 Deployment package ready: $deployDir" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Local tests failed. Please fix issues before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Production deployment fix completed!" -ForegroundColor Green