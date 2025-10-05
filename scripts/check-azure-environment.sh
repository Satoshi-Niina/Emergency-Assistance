#!/bin/bash
# Azure Environment Check Script
# Run this to get the information needed for GitHub Secrets

echo "🔍 Checking Azure Environment for Emergency Assistance..."
echo "=================================================="

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install Azure CLI first."
    exit 1
fi

# Check login status
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

echo "✅ Azure CLI is installed and logged in"
echo ""

# Get subscription information
echo "📋 Subscription Information:"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "  Subscription ID: $SUBSCRIPTION_ID"
echo "  Subscription Name: $SUBSCRIPTION_NAME"
echo ""

# Find resource groups related to emergency assistance
echo "📋 Resource Groups:"
RESOURCE_GROUPS=$(az group list --query "[?contains(name, 'emergency') || contains(name, 'Emergency')].{Name:name, Location:location}" -o table)
echo "$RESOURCE_GROUPS"
echo ""

# Check for App Services
echo "📋 App Services:"
APP_SERVICES=$(az webapp list --query "[?contains(name, 'emergency')].{Name:name, ResourceGroup:resourceGroup, State:state, DefaultHostName:defaultHostName}" -o table)
if [ -z "$APP_SERVICES" ]; then
    echo "  No App Services found with 'emergency' in the name"
else
    echo "$APP_SERVICES"
fi
echo ""

# Check for Static Web Apps
echo "📋 Static Web Apps:"
STATIC_APPS=$(az staticwebapp list --query "[].{Name:name, ResourceGroup:resourceGroup, DefaultHostname:defaultHostname}" -o table 2>/dev/null || echo "  Static Web Apps extension not installed or no static web apps found")
echo "$STATIC_APPS"
echo ""

# Generate Service Principal creation command
echo "🔐 Service Principal Creation Command:"
echo "az ad sp create-for-rbac --name \"emergency-assistance-github\" \\"
echo "  --role contributor \\"
echo "  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/emergency-assistance-rg \\"
echo "  --sdk-auth"
echo ""

echo "💡 Next Steps:"
echo "1. Run the Service Principal creation command above"
echo "2. Copy the JSON output"
echo "3. Add it as AZURE_CREDENTIALS secret in GitHub"
echo "4. GitHub URL: https://github.com/Satoshi-Niina/Emergency-Assistance/settings/secrets/actions"
echo ""

echo "✅ Environment check complete!"