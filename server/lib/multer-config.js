"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
var multer_1 = require("multer");
// メモリストレージを使用してファイルをバッファとして保存
var storage = multer_1.default.memoryStorage();
// ファイルフィルター
var fileFilter = function (req, file, cb) {
    var _a;
    // 許可するMIMEタイプ
    var allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    var allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    // MIMEタイプが空の場合、ファイル拡張子でチェック
    var originalName = file.originalname;
    var extension = ((_a = originalName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    var hasValidMimeType = allowedMimes.includes(file.mimetype);
    var hasValidExtension = allowedExtensions.includes(".".concat(extension));
    console.log('🔍 Multer ファイル形式チェック:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        extension: extension,
        hasValidMimeType: hasValidMimeType,
        hasValidExtension: hasValidExtension
    });
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    }
    else {
        console.error('❌ Multer: 対応していないファイル形式:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: extension
        });
        cb(new Error('対応していないファイル形式です。JPEG、PNG、GIF、WebP、HEICファイルをサポートしています。'), false);
    }
};
// multerの設定
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
// デフォルトエクスポートも残す（後方互換性のため）
exports.default = exports.upload;
