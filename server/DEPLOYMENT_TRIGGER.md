# Backend Deployment Trigger

Deployment timestamp: 2025-10-05 (Switched to Zip Deploy)

This file ensures backend workflow triggers on deployment.

## Azure App Service Configuration
- App Name: emergencyassistance-sv-fbanemhrbshuf9bd
- Runtime: Node.js v20
- Startup Command: node unified-server.js
- Deployment Method: Zip Deploy (no Docker)

## Deployment Strategy Change
- Removed Docker containerization to avoid GHCR issues
- Using direct Node.js deployment with zip package
- Faster deployment and more reliable
- Azure App Service native Node.js runtime