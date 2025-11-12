"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Ping エンドポイント（常時200）
router.get('/', (_req, res) => {
    try {
        const isSafeMode = process.env.SAFE_MODE === 'true';
        console.log('🏓 /api/ping 呼び出し:', {
            safeMode: isSafeMode,
            timestamp: new Date().toISOString(),
        });
        res.json({
            ok: true,
            mode: isSafeMode ? 'safe' : 'normal',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
        });
    }
    catch (error) {
        console.error('❌ /api/ping エラー:', error);
        res.status(200).json({
            ok: false,
            errorId: Math.random().toString(36).substring(2, 15),
            message: 'Ping endpoint error',
            timestamp: new Date().toISOString(),
        });
    }
});
exports.default = router;
