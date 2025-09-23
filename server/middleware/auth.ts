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
    // 診断ログ: 認証判定
    console.log('[auth-middleware] Auth check:', {
      hasAuthHeader: !!req.headers.authorization,
      hasSession: !!req.session?.userId,
      sessionId: req.session?.id,
      path: req.path
    });
    
    // Check for Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { uid: string };
        req.user = { id: payload.uid };
        console.log('[auth-middleware] Bearer auth success:', { userId: payload.uid });
        return next();
      } catch (jwtError) {
        // JWT invalid, continue to session check
        console.log('[auth-middleware] JWT verification failed:', jwtError.message);
      }
    }
    
    // Fallback to session authentication
    if (req.session?.userId) {
      req.user = { id: req.session.userId };
      console.log('[auth-middleware] Session auth success:', { userId: req.session.userId });
      return next();
    }
    
    // No valid authentication found
    console.log('[auth-middleware] No valid authentication found');
    return res.status(401).json({ 
      success: false, 
      error: '認証されていません',
      debug: {
        hasAuthHeader: !!req.headers.authorization,
        hasSession: !!req.session?.userId,
        sessionId: req.session?.id
      }
    });
  } catch (error) {
    console.error('[auth-middleware] Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '認証エラーが発生しました' 
    });
  }
};