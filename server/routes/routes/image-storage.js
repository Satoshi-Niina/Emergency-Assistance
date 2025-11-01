"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_js_1 = require("../db/index.js");
var schema_js_1 = require("../db/schema.js");
var drizzle_orm_1 = require("drizzle-orm");
var path_1 = require("path");
var fs_1 = require("fs");
var router = (0, express_1.Router)();
// 画像データをアップロード
// multipart/form-data対応の画像アップロード
var multer_1 = require("multer");
var upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/upload', upload.single('image'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var imagesDir, fileName, filePath, imageUrl;
    return __generator(this, function (_a) {
        try {
            if (!req.file) {
                return [2 /*return*/, res.status(400).json({ error: '画像ファイルがありません' })];
            }
            imagesDir = process.env.CHAT_IMAGES_PATH
                ? path_1.default.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
                : path_1.default.join(__dirname, '../../knowledge-base/images/chat-exports');
            if (!fs_1.default.existsSync(imagesDir)) {
                fs_1.default.mkdirSync(imagesDir, { recursive: true });
            }
            fileName = "chat_image_".concat(Date.now(), ".png");
            filePath = path_1.default.join(imagesDir, fileName);
            fs_1.default.writeFileSync(filePath, req.file.buffer);
            imageUrl = "/api/images/chat-exports/".concat(fileName);
            res.json({ success: true, url: imageUrl, fileName: fileName });
        }
        catch (error) {
            console.error('画像アップロードエラー:', error);
            res.status(500).json({ error: '画像のアップロードに失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// 画像データを取得
router.get('/:id', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, result, image, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, index_js_1.db
                        .select()
                        .from(schema_js_1.imageData)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.id, id))];
            case 1:
                result = _a.sent();
                if (result.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: '画像が見つかりません' })];
                }
                image = result[0];
                res.setHeader('Content-Type', image.mimeType);
                res.setHeader('Content-Length', image.fileSize);
                res.send(Buffer.from(image.data, 'base64'));
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('画像取得エラー:', error_1);
                res.status(500).json({ error: '画像の取得に失敗しました' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// カテゴリ別の画像一覧を取得
router.get('/category/:category', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var category, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                category = req.params.category;
                return [4 /*yield*/, index_js_1.db
                        .select({
                        id: schema_js_1.imageData.id,
                        fileName: schema_js_1.imageData.fileName,
                        originalFileName: schema_js_1.imageData.originalFileName,
                        mimeType: schema_js_1.imageData.mimeType,
                        fileSize: schema_js_1.imageData.fileSize,
                        category: schema_js_1.imageData.category,
                        description: schema_js_1.imageData.description,
                        createdAt: schema_js_1.imageData.createdAt,
                    })
                        .from(schema_js_1.imageData)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.category, category))];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('画像一覧取得エラー:', error_2);
                res.status(500).json({ error: '画像一覧の取得に失敗しました' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 画像データを削除
router.delete('/:id', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, index_js_1.db
                        .delete(schema_js_1.imageData)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.imageData.id, id))
                        .returning()];
            case 1:
                result = _a.sent();
                if (result.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: '画像が見つかりません' })];
                }
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('画像削除エラー:', error_3);
                res.status(500).json({ error: '画像の削除に失敗しました' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 画像ファイルを提供（knowledge-base/images/chat-exports/から）
router.get('/chat-exports/:filename', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var filename, imagesDir, imagePath, ext, mimeType, fileStream;
    return __generator(this, function (_a) {
        try {
            filename = req.params.filename;
            imagesDir = process.env.CHAT_IMAGES_PATH
                ? path_1.default.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
                : path_1.default.join(__dirname, '../../knowledge-base/images/chat-exports');
            imagePath = path_1.default.join(imagesDir, filename);
            // ファイルの存在確認
            if (!fs_1.default.existsSync(imagePath)) {
                return [2 /*return*/, res.status(404).json({ error: '画像ファイルが見つかりません' })];
            }
            ext = path_1.default.extname(filename).toLowerCase();
            mimeType = 'image/jpeg';
            if (ext === '.png')
                mimeType = 'image/png';
            else if (ext === '.gif')
                mimeType = 'image/gif';
            else if (ext === '.webp')
                mimeType = 'image/webp';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
            fileStream = fs_1.default.createReadStream(imagePath);
            fileStream.pipe(res);
        }
        catch (error) {
            res.status(500).json({ error: '画像ファイルの提供に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// 画像データを検索
router.get('/search/:query', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                query = req.params.query;
                return [4 /*yield*/, index_js_1.db
                        .select({
                        id: schema_js_1.imageData.id,
                        fileName: schema_js_1.imageData.fileName,
                        originalFileName: schema_js_1.imageData.originalFileName,
                        mimeType: schema_js_1.imageData.mimeType,
                        fileSize: schema_js_1.imageData.fileSize,
                        category: schema_js_1.imageData.category,
                        description: schema_js_1.imageData.description,
                        createdAt: schema_js_1.imageData.createdAt,
                    })
                        .from(schema_js_1.imageData)
                        .where((0, drizzle_orm_1.like)(schema_js_1.imageData.originalFileName, "%".concat(query, "%")))];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('画像検索エラー:', error_4);
                res.status(500).json({ error: '画像の検索に失敗しました' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
module.exports = router;
