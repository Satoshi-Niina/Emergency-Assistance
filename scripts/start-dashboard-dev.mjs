import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
process.env.NODE_ENV = 'development';
process.env.EMERGENCY_API_PORT ||= '3003';
process.env.CLIENT_PORT ||= '3006';

// Local SSO uses only the dashboard signing configuration, not its database or port settings.
const dashboardEnvPath = path.resolve(root, '..', '00_DashboodUI', '.env');
if (fs.existsSync(dashboardEnvPath)) {
  const dashboardEnv = dotenv.parse(fs.readFileSync(dashboardEnvPath));
  process.env.SHARED_SSO_SECRET ||= dashboardEnv.SHARED_SSO_SECRET || '';
  process.env.DASHBOARD_JWT_ISSUER ||= dashboardEnv.JWT_ISSUER || 'dashboard-auth';
  process.env.DASHBOARD_JWT_AUDIENCE ||= dashboardEnv.JWT_AUDIENCE || 'dashboard-apps';
}

if (!process.env.SHARED_SSO_SECRET) {
  throw new Error('SHARED_SSO_SECRET is required for dashboard SSO');
}

await import('../server/unified-hot-reload-server.js');
