# Backend Docker Deploy

Deployment timestamp: 2025-10-05 (Fixed GHCR naming)

## Docker Container Strategy  
- ✅ Push → Docker build → GHCR → Azure App Service
- 🐳 Docker handles Windows/Linux environment differences
- 🚀 Fixed GHCR image naming: satoshi-niina/emergency-assistance-backend
- 🎯 Node.js v20 Alpine with full dependencies for team compatibility

## Azure App Service Container
- App: emergencyassistance-sv-fbanemhrbshuf9bd
- Registry: ghcr.io/satoshi-niina/emergency-assistance-backend:latest
- Runtime: Docker Container (Linux)er Deploy

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