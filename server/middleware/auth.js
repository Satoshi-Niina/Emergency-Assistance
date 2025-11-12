"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// セーフモード判定
const isSafeMode = process.env.SAFE_MODE === 'true';
const bypassJwt = process.env.BYPASS_JWT === 'true';
// Bearer token authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        // セーフモードまたはJWTバイパス時は認証をスキップ
        if (isSafeMode || bypassJwt) {
            console.log('[auth-middleware] Safe mode: Authentication bypassed');
            req.user = { id: 'demo' };
            return next();
        }
        // JWT_SECRETの確認
        if (!process.env.JWT_SECRET) {
            console.error('[auth-middleware] JWT_SECRET not configured');
            return res.status(500).json({
                success: false,
                error: 'jwt_secret_not_configured',
                message: 'JWT設定が不完全です',
            });
        }
        // 診断ログ: 認証判定
        console.log('[auth-middleware] Auth check:', {
            hasAuthHeader: !!req.headers.authorization,
            hasSession: !!req.session?.userId,
            sessionId: req.session?.id,
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        // Check for Bearer token first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
                    clockTolerance: 120, // ±120秒の時刻ずれを許容
                });
                // 詳細なJWT検証ログ
                console.log('[auth-middleware] JWT verification success:', {
                    userId: payload.uid,
                    exp: payload.exp,
                    aud: payload.aud,
                    iss: payload.iss,
                    currentTime: Math.floor(Date.now() / 1000),
                });
                req.user = { id: payload.uid };
                return next();
            }
            catch (jwtError) {
                // 詳細なJWTエラーログ
                console.warn('[auth-middleware] JWT verification failed:', {
                    error: jwtError.name,
                    message: jwtError.message,
                    expiredAt: jwtError.expiredAt,
                    currentTime: new Date().toISOString(),
                });
                // JWT無効の場合はセッション認証にフォールバック
            }
        }
        // Fallback to session authentication
        if (req.session?.userId) {
            req.user = { id: req.session.userId };
            console.log('[auth-middleware] Session auth success:', {
                userId: req.session.userId,
            });
            return next();
        }
        // No valid authentication found
        console.log('[auth-middleware] No valid authentication found');
        return res.status(401).json({
            success: false,
            error: 'authentication_required',
            message: '認証が必要です',
            debug: {
                hasAuthHeader: !!req.headers.authorization,
                hasSession: !!req.session?.userId,
                sessionId: req.session?.id,
            },
        });
    }
    catch (error) {
        console.error('[auth-middleware] Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'authentication_error',
            message: '認証処理でエラーが発生しました',
        });
    }
};
exports.authenticateToken = authenticateToken;
