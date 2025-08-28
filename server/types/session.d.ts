
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
    user?: {
      id: string;
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
        id: string;
        username: string;
        displayName: string;
        role: string;
      };
    }
  }
}
