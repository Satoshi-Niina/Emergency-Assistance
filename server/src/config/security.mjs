import helmet from 'helmet';

export const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": [
        "'self'",
        "data:",
        "blob:"
      ],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'"],
    },
  },
};

export const createSecurityMiddleware = () => helmet(helmetConfig);
