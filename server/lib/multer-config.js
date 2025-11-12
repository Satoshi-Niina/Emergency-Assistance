"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
// メモリストレージを使用してファイルをバッファとして保存
const storage = multer_1.default.memoryStorage();
// ファイルフィルター
const fileFilter = (req, file, cb) => {
    // 許可するMIMEタイプ
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
    ];
    const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.heic',
        '.heif',
    ];
    // MIMEタイプが空の場合、ファイル拡張子でチェック
    const originalName = file.originalname;
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const hasValidMimeType = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.includes(`.${extension}`);
    console.log('🔍 Multer ファイル形式チェック:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        extension: extension,
        hasValidMimeType: hasValidMimeType,
        hasValidExtension: hasValidExtension,
    });
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    }
    else {
        console.error('❌ Multer: 対応していないファイル形式:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: extension,
        });
        cb(new Error('対応していないファイル形式です。JPEG、PNG、GIF、WebP、HEICファイルをサポートしています。'), false);
    }
};
// multerの設定
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});
// デフォルトエクスポートも残す（後方互換性のため）
exports.default = exports.upload;
