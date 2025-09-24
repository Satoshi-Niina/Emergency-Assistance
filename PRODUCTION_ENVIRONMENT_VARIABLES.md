# Production Environment Variables

## Required Environment Variables for Azure App Service:

### Core Authentication
- `JWT_SECRET`: Your JWT signing secret (required)
- `SESSION_SECRET`: Your session secret (required)

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string (required for DB authentication)
- `PG_SSL`: SSL mode for PostgreSQL connection
  - `prefer` (default): Try SSL first, fallback to non-SSL if not supported
  - `require`: Require SSL connection
  - `disable`: Disable SSL connection

### Authentication Mode
- `BYPASS_DB_FOR_LOGIN`: Authentication bypass mode
  - `true`: Skip database authentication, use demo login (for testing)
  - `false` or unset: Use database authentication

### Environment
- `NODE_ENV`: Set to `production`

## Recommended Initial Setup:

1. **First Deployment (Safe Mode)**:
   ```
   BYPASS_DB_FOR_LOGIN=true
   JWT_SECRET=<your-secure-jwt-secret>
   SESSION_SECRET=<your-secure-session-secret>
   NODE_ENV=production
   ```

2. **After Confirming Basic Functionality**:
   ```
   BYPASS_DB_FOR_LOGIN=false
   DATABASE_URL=<your-postgresql-connection-string>
   PG_SSL=prefer
   JWT_SECRET=<your-secure-jwt-secret>
   SESSION_SECRET=<your-secure-session-secret>
   NODE_ENV=production
   ```

3. **If SSL Issues Occur**:
   ```
   PG_SSL=disable
   ```

## Testing Checklist:

### Health Endpoints (should all return 200 with {"ok":true}):
- `/api/health`
- `/api/healthz`
- `/health`
- `/healthz`

### Authentication Endpoints:
- `/api/auth/handshake` → 200 with {"ok":true}
- `/api/auth/me` (unauthenticated) → 401
- `/api/auth/login` → 200 with {"success":true}

### CORS Headers (when called from SWA):
- `Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net`
- `Access-Control-Allow-Credentials: true`

## Rollback Procedure:

If issues occur, set `BYPASS_DB_FOR_LOGIN=true` to restore basic functionality without database dependency.
