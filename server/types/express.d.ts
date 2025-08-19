// Express Request型の拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        displayName: string;
        role: string;
        department?: string;
        description?: string;
        created_at: Date;
      };
    }
  }
}

export {};
