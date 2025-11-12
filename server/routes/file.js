"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const url_1 = require("url");
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const router = (0, express_1.Router)();
router.post('/delete', async (_req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res
                .status(400)
                .json({ error: 'ファイルパスが指定されていません' });
        }
        // 許可ディレクトリ一覧
        const allowedDirs = [
            path.join(__dirname, '../../knowledge-base/troubleshooting'),
            path.join(__dirname, '../../knowledge-base/temp'),
            path.join(__dirname, '../../cache'),
        ];
        const normalizedPath = path.normalize(filePath);
        const absolutePath = path.join(__dirname, '../../', normalizedPath);
        const isAllowed = allowedDirs.some(dir => absolutePath.startsWith(dir));
        if (!isAllowed) {
            return res
                .status(403)
                .json({ error: '許可されていないディレクトリへのアクセスです' });
        }
        // ファイルの存在確認
        await fs_1.promises.access(absolutePath);
        // ファイルの削除
        await fs_1.promises.unlink(absolutePath);
        res.status(200).json({ message: 'ファイルを削除しました' });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'ファイルが見つかりません' });
        }
        console.error('ファイル削除エラー:', error);
        res.status(500).json({ error: 'ファイルの削除に失敗しました' });
    }
});
exports.default = router;
