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
        fileSize: 10 * 1024 * 1024, // 10MB制限に増加
    },
});
