// Express Session 型拡張
import 'express-session';

interface User {
  id: string | number;
  username?: string;
  email?: string;
  role: string;
  name?: string;
  displayName?: string;
  department?: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
    user?: User;
  }
}

declare module 'express' {
  interface Request {
    user?: User;
  }
}
