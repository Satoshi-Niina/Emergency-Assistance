import helmet from 'helmet';
import { AZURE_STORAGE_ACCOUNT_NAME } from './env.mjs';

const storageUrl = AZURE_STORAGE_ACCOUNT_NAME
  ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`
  : "https://*.blob.core.windows.net";

export const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        storageUrl
      ],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", storageUrl],
    },
  },
};

export const createSecurityMiddleware = () => helmet(helmetConfig);
