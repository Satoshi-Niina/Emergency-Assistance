# Backend Deployment Trigger

This file is used to trigger backend deployment workflows.
Last updated: 2025-01-17 10:05:00

## Deployment Information
- Target: Azure App Service (emergencyassistance-sv-fbanemhrbshuf9bd)
- Method: Docker container deployment via Publish Profile
- Registry: GitHub Container Registry (ghcr.io)

## Recent Changes
- Reverted from Azure CLI to Publish Profile authentication
- Using azure/webapps-deploy@v2 for reliable deployment
- Clean build strategy with --no-cache flag
- Manual backend deployment trigger requested

## Configuration
- Authentication: AZURE_WEBAPP_PUBLISH_PROFILE secret
- Container Image: ghcr.io/satoshi-niina/emergency-assistance-backend:latest
- Build Context: server/
- Dockerfile: server/Dockerfile.backend

## Status
✅ Ready for deployment - パブリッシュプロファイル認証で設定済み