
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
    loginTime?: number;
    user?: {
      id: string;
      username: string;
      display_name: string;
      role: string;
    };
  }
}
