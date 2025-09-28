import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// セキュリティヘッダーの設定
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// レート制限設定
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエストまで
  message: {
    success: false,
    error:
      'リクエスト数が上限に達しました。しばらく待ってから再試行してください。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 厳しいレート制限（認証関連）
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 10リクエストまで
  message: {
    success: false,
    error:
      '認証関連のリクエスト数が上限に達しました。15分後に再試行してください。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// IPアドレス取得
export const getClientIP = (req: Request): string => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    'unknown'
  );
};

// セキュリティログ
export const logSecurityEvent = (event: string, details: any, req: Request) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    details: {
      ...details,
      // 機密情報は除外
      password: '[REDACTED]',
      token: '[REDACTED]',
    },
  };

  console.log(`🔒 SECURITY: ${event}`, logData);
};

// 入力検証ミドルウェア
export const validateInput = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logSecurityEvent(
        'VALIDATION_ERROR',
        {
          errors: errors.array(),
          body: req.body,
        },
        req
      );

      return res.status(400).json({
        success: false,
        error: '入力データが無効です',
        details: errors.array(),
      });
    }

    next();
  };
};

// 認証チェックミドルウェア
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.userId) {
    logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      {
        url: req.originalUrl,
        method: req.method,
      },
      req
    );

    return res.status(401).json({
      success: false,
      error: '認証が必要です',
    });
  }

  next();
};

// 管理者権限チェックミドルウェア
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.userId) {
    logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      {
        url: req.originalUrl,
        method: req.method,
      },
      req
    );

    return res.status(401).json({
      success: false,
      error: '認証が必要です',
    });
  }

  if (req.session.userRole !== 'admin') {
    logSecurityEvent(
      'INSUFFICIENT_PRIVILEGES',
      {
        userId: req.session.userId,
        role: req.session.userRole,
        url: req.originalUrl,
      },
      req
    );

    return res.status(403).json({
      success: false,
      error: '管理者権限が必要です',
    });
  }

  next();
};

// セッション有効性チェック
export const validateSession = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session?.userId) {
    // セッションの有効期限チェック（24時間）
    const sessionAge = Date.now() - (req.session.loginTime || 0);
    const maxAge = 24 * 60 * 60 * 1000; // 24時間

    if (sessionAge > maxAge) {
      logSecurityEvent(
        'SESSION_EXPIRED',
        {
          userId: req.session.userId,
          sessionAge,
        },
        req
      );

      req.session.destroy(() => {
        return res.status(401).json({
          success: false,
          error: 'セッションが期限切れです。再ログインしてください。',
        });
      });
      return;
    }
  }

  next();
};

// リクエストサイズ制限
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');

    if (contentLength > maxSize) {
      logSecurityEvent(
        'REQUEST_TOO_LARGE',
        {
          contentLength,
          maxSize,
          url: req.originalUrl,
        },
        req
      );

      return res.status(413).json({
        success: false,
        error: 'リクエストサイズが大きすぎます',
      });
    }

    next();
  };
};

// CORS設定の強化
export const secureCORS = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5002',
    'http://localhost:5003',
    'http://localhost:5173',
    'https://witty-river-012f39e00.1.azurestaticapps.net',
  ];

  // FRONTEND_URL環境変数があれば追加
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Pragma, Expires'
  );
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};
