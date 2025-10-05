# Backend Clean Docker Deploy

Deployment timestamp: 2025-10-05 (FIXED: Azure auth + clean deploy)

## Fixed Azure Authentication
- ✅ Azure CLI login with AZURE_CREDENTIALS
- 🔐 Direct container deployment (no publish profile)
- 🔄 Forced App Service restart for clean state
- 🎯 Resource group: emergency-assistance-rg

## Clean Docker Strategy
- 🧹 Docker system prune: Remove all cached layers
- 🐳 no-cache: true - Force complete rebuild
- 🚀 Container config + restart for clean deployment
- ✅ ghcr.io/satoshi-niina/emergency-assistance-backender Deploy

Deployment timestamp: 2025-10-05 (Back to Docker for Win/Linux compatibility)

## Docker Container Strategy
- ✅ Push → Docker build → GHCR → Azure App Service
- � Docker handles Windows/Linux environment differences
- 🚀 Containerized deployment for consistency
- 🎯 Node.js v20 Alpine Linux container

## Azure App Service Container
- App: emergencyassistance-sv-fbanemhrbshuf9bd
- Registry: ghcr.io/emergency-assistance-backend:latest
- Runtime: Docker Container