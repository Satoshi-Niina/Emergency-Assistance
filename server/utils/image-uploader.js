"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
var multer_1 = require("multer");
// メモリストレージを使用してファイルをバッファとして保存
var storage = multer_1.default.memoryStorage();
// ファイルフィルター
var fileFilter = function (req, file, cb) {
    // 画像ファイルのみ許可
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('画像ファイルのみアップロード可能です'), false);
    }
};
// multer設定
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB制限
    },
});
