# Frontend Auto-Deploy

Deployment timestamp: 2025-10-05 (Fixed dist output)

## Azure Static Web Apps Build
- ✅ Push → Azure auto-build → Deploy
- 🚀 Vite builds to 'dist' folder (not '../server/public')
- ⚡ skip_app_build: false (let Azure handle build)
- 🎯 Fixed output_location configuration

## Azure Static Web Apps
- URL: https://witty-river-012f39e00.1.azurestaticapps.net
- Build: Azure handles npm install + vite build
- Output: client/dist/