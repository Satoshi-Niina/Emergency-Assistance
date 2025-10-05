# Azure Environment Check Script (PowerShell)
# Run this to get the information needed for GitHub Secrets

Write-Host "🔍 Checking Azure Environment for Emergency Assistance..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI is installed (Version: $($azVersion.'azure-cli'))" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    exit 1
}

# Check login status
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "✅ Logged in to Azure" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Get subscription information
Write-Host "📋 Subscription Information:" -ForegroundColor Yellow
$subscriptionId = az account show --query id -o tsv
$subscriptionName = az account show --query name -o tsv
Write-Host "  Subscription ID: $subscriptionId" -ForegroundColor White
Write-Host "  Subscription Name: $subscriptionName" -ForegroundColor White
Write-Host ""

# Find resource groups
Write-Host "📋 Resource Groups:" -ForegroundColor Yellow
$resourceGroups = az group list --query "[?contains(name, 'emergency') || contains(name, 'Emergency')].[name, location]" -o tsv
if ($resourceGroups) {
    $resourceGroups | ForEach-Object {
        $parts = $_ -split "`t"
        Write-Host "  Name: $($parts[0]), Location: $($parts[1])" -ForegroundColor White
    }
} else {
    Write-Host "  No resource groups found with 'emergency' in the name" -ForegroundColor Gray
}
Write-Host ""

# Check for App Services
Write-Host "📋 App Services:" -ForegroundColor Yellow
try {
    $appServices = az webapp list --query "[?contains(name, 'emergency')].[name, resourceGroup, state, defaultHostName]" -o tsv
    if ($appServices) {
        $appServices | ForEach-Object {
            $parts = $_ -split "`t"
            Write-Host "  Name: $($parts[0]), RG: $($parts[1]), State: $($parts[2])" -ForegroundColor White
            Write-Host "  URL: https://$($parts[3])" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No App Services found with 'emergency' in the name" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Error checking App Services" -ForegroundColor Red
}
Write-Host ""

# Generate Service Principal creation command
Write-Host "🔐 Service Principal Creation Command:" -ForegroundColor Yellow
Write-Host "az ad sp create-for-rbac --name `"emergency-assistance-github`" \`" -ForegroundColor Cyan
Write-Host "  --role contributor \`" -ForegroundColor Cyan
Write-Host "  --scopes /subscriptions/$subscriptionId/resourceGroups/emergency-assistance-rg \`" -ForegroundColor Cyan
Write-Host "  --sdk-auth" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the Service Principal creation command above" -ForegroundColor White
Write-Host "2. Copy the JSON output" -ForegroundColor White
Write-Host "3. Add it as AZURE_CREDENTIALS secret in GitHub" -ForegroundColor White
Write-Host "4. GitHub URL: https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions" -ForegroundColor White
Write-Host ""

Write-Host "✅ Environment check complete!" -ForegroundColor Green