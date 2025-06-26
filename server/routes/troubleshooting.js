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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.troubleshootingRouter = void 0;
var express_1 = require("express");
var path = require("path");
var fs = require("fs");
var router = (0, express_1.Router)();
// 汎用ロギング関数
function logDebug(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (process.env.NODE_ENV !== 'production') {
        console.debug.apply(console, __spreadArray([message], args, false));
    }
}
function logInfo(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    console.info.apply(console, __spreadArray([message], args, false));
}
function logWarn(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    console.warn.apply(console, __spreadArray([message], args, false));
}
function logError(message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    console.error.apply(console, __spreadArray([message], args, false));
}
// トラブルシューティングリスト取得
router.get('/list', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var troubleshootingDir, files, troubleshootingList, _i, files_1, file, filePath, content, data;
    return __generator(this, function (_a) {
        try {
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(troubleshootingDir)) {
                return [2 /*return*/, res.json([])];
            }
            files = fs.readdirSync(troubleshootingDir).filter(function (file) { return file.endsWith('.json'); });
            troubleshootingList = [];
            for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                file = files_1[_i];
                try {
                    filePath = path.join(troubleshootingDir, file);
                    content = fs.readFileSync(filePath, 'utf8');
                    data = JSON.parse(content);
                    troubleshootingList.push(data);
                }
                catch (error) {
                    logError("Error reading file ".concat(file, ":"), error);
                }
            }
            res.json(troubleshootingList);
        }
        catch (error) {
            logError('Error in troubleshooting list:', error);
            res.status(500).json({ error: 'Failed to load troubleshooting data' });
        }
        return [2 /*return*/];
    });
}); });
// トラブルシューティング詳細取得
router.get('/detail/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, troubleshootingDir, filePath, content, data;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({ error: 'Troubleshooting flow not found' })];
            }
            content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
            res.json(data);
        }
        catch (error) {
            logError('Error in troubleshooting detail:', error);
            res.status(500).json({ error: 'Failed to load troubleshooting detail' });
        }
        return [2 /*return*/];
    });
}); });
// トラブルシューティング作成
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var troubleshootingData, troubleshootingDir, id, filePath;
    return __generator(this, function (_a) {
        try {
            troubleshootingData = req.body;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(troubleshootingDir)) {
                fs.mkdirSync(troubleshootingDir, { recursive: true });
            }
            id = troubleshootingData.id || "ts_".concat(Date.now());
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            // ファイルが既に存在する場合は上書き
            fs.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));
            res.status(201).json({
                success: true,
                id: id,
                message: 'Troubleshooting flow created successfully'
            });
        }
        catch (error) {
            logError('Error in troubleshooting create:', error);
            res.status(500).json({ error: 'Failed to create troubleshooting flow' });
        }
        return [2 /*return*/];
    });
}); });
// トラブルシューティング更新
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, troubleshootingData, troubleshootingDir, filePath;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            troubleshootingData = req.body;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({ error: 'Troubleshooting flow not found' })];
            }
            fs.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));
            res.json({
                success: true,
                message: 'Troubleshooting flow updated successfully'
            });
        }
        catch (error) {
            logError('Error in troubleshooting update:', error);
            res.status(500).json({ error: 'Failed to update troubleshooting flow' });
        }
        return [2 /*return*/];
    });
}); });
// トラブルシューティング削除
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, troubleshootingDir, filePath;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({ error: 'Troubleshooting flow not found' })];
            }
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'Troubleshooting flow deleted successfully'
            });
        }
        catch (error) {
            logError('Error in troubleshooting delete:', error);
            res.status(500).json({ error: 'Failed to delete troubleshooting flow' });
        }
        return [2 /*return*/];
    });
}); });
// トラブルシューティング検索
router.post('/search', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, troubleshootingDir, files, searchResults, _i, files_2, file, filePath, content, data, searchText;
    return __generator(this, function (_a) {
        try {
            query = req.body.query;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(troubleshootingDir)) {
                return [2 /*return*/, res.json([])];
            }
            files = fs.readdirSync(troubleshootingDir).filter(function (file) { return file.endsWith('.json'); });
            searchResults = [];
            for (_i = 0, files_2 = files; _i < files_2.length; _i++) {
                file = files_2[_i];
                try {
                    filePath = path.join(troubleshootingDir, file);
                    content = fs.readFileSync(filePath, 'utf8');
                    data = JSON.parse(content);
                    searchText = "".concat(data.title || '', " ").concat(data.description || '', " ").concat(data.keyword || '').toLowerCase();
                    if (searchText.includes(query.toLowerCase())) {
                        searchResults.push(data);
                    }
                }
                catch (error) {
                    logError("Error reading file ".concat(file, ":"), error);
                }
            }
            res.json(searchResults);
        }
        catch (error) {
            logError('Error in troubleshooting search:', error);
            res.status(500).json({ error: 'Failed to search troubleshooting flows' });
        }
        return [2 /*return*/];
    });
}); });
exports.troubleshootingRouter = router;
