"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCORS = exports.requestSizeLimit = exports.validateSession = exports.requireAdmin = exports.requireAuth = exports.validateInput = exports.logSecurityEvent = exports.getClientIP = exports.strictLimiter = exports.generalLimiter = exports.securityHeaders = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const express_validator_1 = require("express-validator");
// セキュリティヘッダーの設定
exports.securityHeaders = (0, helmet_1.default)({
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
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 100リクエストまで
    message: {
        success: false,
        error: 'リクエスト数が上限に達しました。しばらく待ってから再試行してください。',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// 厳しいレート制限（認証関連）
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分
    max: 10, // 10リクエストまで
    message: {
        success: false,
        error: '認証関連のリクエスト数が上限に達しました。15分後に再試行してください。',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// IPアドレス取得
const getClientIP = (req) => {
    return (req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        'unknown');
};
exports.getClientIP = getClientIP;
// セキュリティログ
const logSecurityEvent = (event, details, req) => {
    const logData = {
        event,
        timestamp: new Date().toISOString(),
        ip: (0, exports.getClientIP)(req),
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
exports.logSecurityEvent = logSecurityEvent;
// 入力検証ミドルウェア
const validateInput = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            (0, exports.logSecurityEvent)('VALIDATION_ERROR', {
                errors: errors.array(),
                body: req.body,
            }, req);
            return res.status(400).json({
                success: false,
                error: '入力データが無効です',
                details: errors.array(),
            });
        }
        next();
    };
};
exports.validateInput = validateInput;
// 認証チェックミドルウェア
const requireAuth = (req, res, next) => {
    if (!req.session?.userId) {
        (0, exports.logSecurityEvent)('UNAUTHORIZED_ACCESS', {
            url: req.originalUrl,
            method: req.method,
        }, req);
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        });
    }
    next();
};
exports.requireAuth = requireAuth;
// 管理者権限チェックミドルウェア
const requireAdmin = (req, res, next) => {
    if (!req.session?.userId) {
        (0, exports.logSecurityEvent)('UNAUTHORIZED_ACCESS', {
            url: req.originalUrl,
            method: req.method,
        }, req);
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        });
    }
    if (req.session.userRole !== 'admin') {
        (0, exports.logSecurityEvent)('INSUFFICIENT_PRIVILEGES', {
            userId: req.session.userId,
            role: req.session.userRole,
            url: req.originalUrl,
        }, req);
        return res.status(403).json({
            success: false,
            error: '管理者権限が必要です',
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// セッション有効性チェック
const validateSession = (req, res, next) => {
    if (req.session?.userId) {
        // セッションの有効期限チェック（24時間）
        const sessionAge = Date.now() - (req.session.loginTime || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24時間
        if (sessionAge > maxAge) {
            (0, exports.logSecurityEvent)('SESSION_EXPIRED', {
                userId: req.session.userId,
                sessionAge,
            }, req);
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
exports.validateSession = validateSession;
// リクエストサイズ制限
const requestSizeLimit = (maxSize) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || '0');
        if (contentLength > maxSize) {
            (0, exports.logSecurityEvent)('REQUEST_TOO_LARGE', {
                contentLength,
                maxSize,
                url: req.originalUrl,
            }, req);
            return res.status(413).json({
                success: false,
                error: 'リクエストサイズが大きすぎます',
            });
        }
        next();
    };
};
exports.requestSizeLimit = requestSizeLimit;
// CORS設定の強化
const secureCORS = (req, res, next) => {
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Pragma, Expires');
    res.header('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
};
exports.secureCORS = secureCORS;
