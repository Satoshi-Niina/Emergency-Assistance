
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string | number;
    userRole?: string;
    user?: {
      id: string | number;
      username: string;
      displayName: string;
      role: string;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | number;
        username: string;
        displayName: string;
        role: string;
      };
    }
  }
}
