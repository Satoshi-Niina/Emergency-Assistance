# Production Deployment Instructions

## Environment Variables to Set in Azure App Service:

1. BYPASS_DB_FOR_LOGIN=true (initially, set to false after DB is confirmed working)
2. JWT_SECRET=<your-jwt-secret>
3. SESSION_SECRET=<your-session-secret>
4. DATABASE_URL=<your-postgresql-connection-string>
5. PG_SSL=prefer (will auto-fallback to disable if SSL not supported)
6. NODE_ENV=production

## Deployment Steps:

1. Zip the contents of: deploy-production-20250924-194938
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
