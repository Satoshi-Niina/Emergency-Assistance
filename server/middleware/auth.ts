import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

// Bearer token authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { uid: string };
        req.user = { id: payload.uid };
        return next();
      } catch (jwtError) {
        // JWT invalid, continue to session check
        console.log('JWT verification failed, checking session:', jwtError);
      }
    }
    
    // Fallback to session authentication
    if (req.session?.userId) {
      req.user = { id: req.session.userId };
      return next();
    }
    
    // No valid authentication found
    return res.status(401).json({ 
      success: false, 
      error: '認証されていません' 
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '認証エラーが発生しました' 
    });
  }
};