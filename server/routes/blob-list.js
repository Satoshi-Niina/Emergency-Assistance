"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const azure_storage_1 = require("../azure-storage");
const router = express_1.default.Router();
/**
 * GET /api/blob/list?container=knowledge
 * Azure BLOBストレージのファイル一覧を取得
 */
router.get('/list', async (_req, res) => {
    try {
        const container = req.query.container || 'knowledge';
        if (!azure_storage_1.azureStorage) {
            return res
                .status(500)
                .json({ success: false, error: 'Azure Storage未設定' });
        }
        // prefix指定も可能
        let prefix = undefined;
        if (typeof req.query.prefix === 'string') {
            prefix = req.query.prefix;
        }
        const files = await azure_storage_1.azureStorage.listFiles(prefix);
        res.json({ success: true, data: files, total: files.length });
    }
    catch (error) {
        console.error('❌ BLOBファイル一覧取得エラー:', error);
        res
            .status(500)
            .json({
            success: false,
            error: 'BLOBファイル一覧取得失敗',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
