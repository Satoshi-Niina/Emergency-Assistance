# Backend Deployment Trigger

Deployment timestamp: 2025-10-05 (Updated for GHCR fix)

This file ensures backend workflow triggers on deployment.

## Azure App Service Configuration
- App Name: emergencyassistance-sv-fbanemhrbshuf9bd
- Runtime: Docker Container
- Node.js: v20
- Startup Command: node unified-server.js

## Container Registry Fix
- Fixed GHCR permissions issue
- Simplified image naming: emergency-assistance-backend
- Added proper workflow permissions