"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var openai_1 = require("openai");
var zod_1 = require("zod");
var fs = require("fs");
var path = require("path");
var image_uploader_1 = require("../utils/image-uploader");
var crypto_1 = require("crypto");
var router = (0, express_1.Router)();
var openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
var generateFlowSchema = zod_1.z.object({
    keyword: zod_1.z.string().min(1),
});
// テンプレートスキーマを適用する関数（仮実装）
function applyTemplateSchema(data) {
    // TODO: 実際のスキーマ適用ロジックを実装
    // 例：dataに必要なフィールドが存在しない場合にデフォルト値を追加する
    if (data && data.steps) {
        data.steps = data.steps.map(function (step) {
            if (step.type === 'decision' && !step.options) {
                step.options = [
                    { text: 'はい', nextStepId: '', condition: '', isTerminal: false, conditionType: 'yes' },
                    { text: 'いいえ', nextStepId: '', condition: '', isTerminal: false, conditionType: 'no' }
                ];
            }
            return step;
        });
    }
    return data;
}
// POST /api/emergency-flow/update-step-title
router.post('/update-step-title', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, flowId, stepId_1, title, filePath, fileContent, flowData, stepIndex;
    return __generator(this, function (_b) {
        try {
            _a = req.body, flowId = _a.flowId, stepId_1 = _a.stepId, title = _a.title;
            if (!flowId || !stepId_1 || !title) {
                return [2 /*return*/, res.status(400).json({ error: 'flowId, stepId, title are required' })];
            }
            filePath = path.join(process.cwd(), 'knowledge-base', 'troubleshooting', "".concat(flowId, ".json"));
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({ error: 'フローファイルが見つかりません' })];
            }
            fileContent = fs.readFileSync(filePath, 'utf8');
            flowData = JSON.parse(fileContent);
            stepIndex = flowData.steps.findIndex(function (step) { return step.id === stepId_1; });
            if (stepIndex === -1) {
                return [2 /*return*/, res.status(404).json({ error: 'ステップが見つかりません' })];
            }
            flowData.steps[stepIndex].title = title;
            flowData.updatedAt = new Date().toISOString();
            // ファイルに書き込み
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
            res.json({ success: true, message: 'タイトルが更新されました' });
        }
        catch (error) {
            console.error('タイトル更新エラー:', error);
            res.status(500).json({ error: 'タイトル更新に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// フローデータのスキーマ定義
var flowDataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        message: zod_1.z.string(),
        type: zod_1.z.enum(['start', 'step', 'decision', 'condition', 'end']),
        imageUrl: zod_1.z.string().optional(),
        options: zod_1.z.array(zod_1.z.object({
            text: zod_1.z.string(),
            nextStepId: zod_1.z.string(),
            isTerminal: zod_1.z.boolean(),
            conditionType: zod_1.z.enum(['yes', 'no', 'other']),
            condition: zod_1.z.string().optional()
        })).optional()
    })),
    triggerKeywords: zod_1.z.array(zod_1.z.string())
});
// フロー保存エンドポイント（新規作成・更新）
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var flowData, troubleshootingDir, filePath;
    var _a;
    return __generator(this, function (_b) {
        try {
            flowData = req.body;
            console.log('🔄 フロー保存開始:', { id: flowData.id, title: flowData.title });
            // 必須フィールドの検証
            if (!flowData.title) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: 'タイトルは必須です'
                    })];
            }
            // IDが指定されていない場合は生成
            if (!flowData.id) {
                flowData.id = "flow_".concat(Date.now());
            }
            // タイムスタンプを設定
            flowData.createdAt = flowData.createdAt || new Date().toISOString();
            flowData.updatedAt = new Date().toISOString();
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(troubleshootingDir)) {
                fs.mkdirSync(troubleshootingDir, { recursive: true });
            }
            filePath = path.join(troubleshootingDir, "".concat(flowData.id, ".json"));
            // ファイルに保存
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
            console.log('✅ フロー保存成功:', {
                id: flowData.id,
                title: flowData.title,
                filePath: filePath,
                stepsCount: ((_a = flowData.steps) === null || _a === void 0 ? void 0 : _a.length) || 0
            });
            res.json({
                success: true,
                data: flowData,
                message: 'フローが正常に保存されました'
            });
        }
        catch (error) {
            console.error('❌ フロー保存エラー:', error);
            res.status(500).json({
                success: false,
                error: 'フローの保存に失敗しました',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        return [2 /*return*/];
    });
}); });
// フロー更新エンドポイント
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, flowData, troubleshootingDir, filePath;
    var _a;
    return __generator(this, function (_b) {
        try {
            id = req.params.id;
            flowData = req.body;
            console.log('🔄 フロー更新開始:', { id: id, title: flowData.title });
            // IDの一致確認
            if (id !== flowData.id) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: 'URLのIDとデータのIDが一致しません'
                    })];
            }
            // 必須フィールドの検証
            if (!flowData.title) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: 'タイトルは必須です'
                    })];
            }
            // タイムスタンプを更新
            flowData.updatedAt = new Date().toISOString();
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            // 既存ファイルの確認
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({
                        success: false,
                        error: '更新対象のフローファイルが見つかりません'
                    })];
            }
            // ファイルに保存
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
            console.log('✅ フロー更新成功:', {
                id: flowData.id,
                title: flowData.title,
                filePath: filePath,
                stepsCount: ((_a = flowData.steps) === null || _a === void 0 ? void 0 : _a.length) || 0
            });
            res.json({
                success: true,
                data: flowData,
                message: 'フローが正常に更新されました'
            });
        }
        catch (error) {
            console.error('❌ フロー更新エラー:', error);
            res.status(500).json({
                success: false,
                error: 'フローの更新に失敗しました',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        return [2 /*return*/];
    });
}); });
// フロー一覧取得エンドポイント
router.get('/list', function (req, res) {
    try {
        var troubleshootingDir_1 = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir_1)) {
            console.log('📁 troubleshootingディレクトリが存在しません。');
            return res.json([]);
        }
        var files = fs.readdirSync(troubleshootingDir_1);
        var jsonFiles = files.filter(function (file) { return file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'); });
        var fileList = jsonFiles.map(function (file) {
            try {
                var filePath = path.join(troubleshootingDir_1, file);
                var content = fs.readFileSync(filePath, 'utf8');
                var data = JSON.parse(content);
                var description = data.description || '';
                if (!description && data.steps && data.steps.length > 0) {
                    description = data.steps[0].description || data.steps[0].message || '';
                }
                return {
                    id: data.id || file.replace('.json', ''),
                    title: data.title || 'タイトルなし',
                    description: description,
                    fileName: file,
                    createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString()
                };
            }
            catch (error) {
                console.error("\u30D5\u30A1\u30A4\u30EB ".concat(file, " \u306E\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:"), error);
                return null;
            }
        }).filter(Boolean);
        res.json(fileList);
    }
    catch (error) {
        console.error('❌ ファイル一覧取得エラー:', error);
        res.status(500).json({
            error: 'ファイル一覧の取得に失敗しました',
            details: error.message
        });
    }
});
// フロー詳細取得エンドポイント
router.get('/detail/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var timestamp, randomId, id, troubleshootingDir, filePath, content, stats, data, decisionSteps, conditionSteps;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        try {
            timestamp = Date.now();
            randomId = Math.random().toString(36).substring(2);
            // キャッシュ制御ヘッダーを設定
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
                'Last-Modified': new Date().toUTCString(),
                'ETag': "\"".concat(timestamp, "-").concat(randomId, "\""),
                'X-Accel-Expires': '0',
                'X-Requested-With': 'XMLHttpRequest'
            });
            id = req.params.id;
            console.log("\uD83D\uDD04 [".concat(timestamp, "] \u30D5\u30ED\u30FC\u8A73\u7D30\u53D6\u5F97\u958B\u59CB: ID=").concat(id));
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            console.log("\uD83D\uDCC1 \u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ".concat(filePath));
            if (!fs.existsSync(filePath)) {
                console.log("\u274C \u30D5\u30A1\u30A4\u30EB\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(filePath));
                return [2 /*return*/, res.status(404).json({ error: 'フローファイルが見つかりません' })];
            }
            content = fs.readFileSync(filePath, 'utf8');
            stats = fs.statSync(filePath);
            console.log("\uD83D\uDCCA \u30D5\u30A1\u30A4\u30EB\u60C5\u5831:", {
                size: stats.size,
                modified: stats.mtime,
                exists: true
            });
            console.log("\uD83D\uDCC4 \u30D5\u30A1\u30A4\u30EB\u5185\u5BB9\u306E\u30B5\u30A4\u30BA: ".concat(content.length, "\u6587\u5B57"));
            data = JSON.parse(content);
            console.log("\u2705 \u30D5\u30A1\u30A4\u30EB\u8A73\u7D30\u8AAD\u307F\u8FBC\u307F\u6210\u529F: ".concat(id, ".json"), {
                id: data.id,
                title: data.title,
                hasSteps: !!data.steps,
                stepsCount: ((_a = data.steps) === null || _a === void 0 ? void 0 : _a.length) || 0,
                hasNodes: !!data.nodes,
                nodesCount: ((_b = data.nodes) === null || _b === void 0 ? void 0 : _b.length) || 0,
                updatedAt: data.updatedAt,
                createdAt: data.createdAt
            });
            decisionSteps = ((_c = data.steps) === null || _c === void 0 ? void 0 : _c.filter(function (step) { return step.type === 'decision'; })) || [];
            conditionSteps = ((_d = data.steps) === null || _d === void 0 ? void 0 : _d.filter(function (step) { return step.type === 'condition'; })) || [];
            console.log("\uD83D\uDD00 \u6761\u4EF6\u5206\u5C90\u30B9\u30C6\u30C3\u30D7\u306E\u78BA\u8A8D:", {
                totalSteps: ((_e = data.steps) === null || _e === void 0 ? void 0 : _e.length) || 0,
                decisionSteps: decisionSteps.length,
                conditionSteps: conditionSteps.length,
                decisionStepsDetail: decisionSteps.map(function (step) {
                    var _a;
                    return ({
                        id: step.id,
                        title: step.title,
                        optionsCount: ((_a = step.options) === null || _a === void 0 ? void 0 : _a.length) || 0
                    });
                }),
                conditionStepsDetail: conditionSteps.map(function (step) {
                    var _a;
                    return ({
                        id: step.id,
                        title: step.title,
                        conditionsCount: ((_a = step.conditions) === null || _a === void 0 ? void 0 : _a.length) || 0
                    });
                })
            });
            res.json({
                success: true,
                data: data,
                metadata: {
                    filePath: filePath,
                    fileSize: stats.size,
                    lastModified: stats.mtime,
                    requestId: "".concat(timestamp, "-").concat(randomId),
                    processedAt: new Date().toISOString()
                }
            });
            console.log("\u2705 \u5B8C\u5168\u30C7\u30FC\u30BF\u89E3\u6790\u6210\u529F:", {
                id: data.id,
                title: data.title,
                stepsCount: ((_f = data.steps) === null || _f === void 0 ? void 0 : _f.length) || 0,
                decisionStepsCount: decisionSteps.length,
                conditionStepsCount: conditionSteps.length,
                responseSize: JSON.stringify(data).length
            });
        }
        catch (error) {
            console.error('❌ フロー詳細取得エラー:', error);
            res.status(500).json({ error: 'フロー詳細の取得に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// フロー削除エンドポイント
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, troubleshootingDir, filePath;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, res.status(404).json({ error: 'フローファイルが見つかりません' })];
            }
            fs.unlinkSync(filePath);
            console.log("\uD83D\uDDD1\uFE0F \u30D5\u30ED\u30FC\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ".concat(filePath));
            res.json({ success: true, message: 'フローが削除されました' });
        }
        catch (error) {
            console.error('❌ フロー削除エラー:', error);
            res.status(500).json({ error: 'フローの削除に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// フロー直接取得エンドポイント（キャッシュ制御付き）
router.get('/get/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var timestamp, randomId, id, troubleshootingDir, filePath, content, stats, data, decisionSteps, conditionSteps;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        try {
            timestamp = Date.now();
            randomId = Math.random().toString(36).substring(2);
            // キャッシュ制御ヘッダーを設定
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
                'Last-Modified': new Date().toUTCString(),
                'ETag': "\"".concat(timestamp, "-").concat(randomId, "\""),
                'X-Accel-Expires': '0',
                'X-Requested-With': 'XMLHttpRequest'
            });
            id = req.params.id;
            console.log("\uD83D\uDD04 [".concat(timestamp, "] \u30D5\u30ED\u30FC\u76F4\u63A5\u53D6\u5F97: ID=").concat(id));
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            console.log("\uD83D\uDCC1 \u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ".concat(filePath));
            if (!fs.existsSync(filePath)) {
                console.log("\u274C \u30D5\u30A1\u30A4\u30EB\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(filePath));
                return [2 /*return*/, res.status(404).json({ error: 'フローファイルが見つかりません' })];
            }
            content = fs.readFileSync(filePath, 'utf8');
            stats = fs.statSync(filePath);
            console.log("\uD83D\uDCCA \u30D5\u30A1\u30A4\u30EB\u60C5\u5831:", {
                size: stats.size,
                modified: stats.mtime,
                exists: true,
                contentLength: content.length
            });
            data = JSON.parse(content);
            decisionSteps = ((_a = data.steps) === null || _a === void 0 ? void 0 : _a.filter(function (step) { return step.type === 'decision'; })) || [];
            conditionSteps = ((_b = data.steps) === null || _b === void 0 ? void 0 : _b.filter(function (step) { return step.type === 'condition'; })) || [];
            console.log("\uD83D\uDD00 \u6761\u4EF6\u5206\u5C90\u30B9\u30C6\u30C3\u30D7\u306E\u78BA\u8A8D:", {
                totalSteps: ((_c = data.steps) === null || _c === void 0 ? void 0 : _c.length) || 0,
                decisionSteps: decisionSteps.length,
                conditionSteps: conditionSteps.length
            });
            res.json(__assign(__assign({}, data), { metadata: {
                    filePath: filePath,
                    fileSize: stats.size,
                    lastModified: stats.mtime,
                    requestId: "".concat(timestamp, "-").concat(randomId),
                    processedAt: new Date().toISOString()
                } }));
            console.log("\u2705 \u76F4\u63A5\u30C7\u30FC\u30BF\u53D6\u5F97\u6210\u529F:", {
                id: data.id,
                title: data.title,
                stepsCount: ((_d = data.steps) === null || _d === void 0 ? void 0 : _d.length) || 0,
                decisionStepsCount: decisionSteps.length,
                conditionStepsCount: conditionSteps.length
            });
        }
        catch (error) {
            console.error('❌ フロー直接取得エラー:', error);
            res.status(500).json({ error: 'フロー直接取得に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// フロー生成エンドポイント
router.post('/generate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var keyword, troubleshootingDir, cleanFlowId, filePath, completion, generatedContent, lines, title, steps, currentStep, _i, lines_1, line, stepTitle, flowData, fileName, flowFilePath, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                keyword = generateFlowSchema.parse(req.body).keyword;
                troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
                cleanFlowId = (req.params.id || '').startsWith('ts_') ? (req.params.id || '').substring(3) : (req.params.id || '');
                filePath = path.join(process.cwd(), 'knowledge-base/troubleshooting', "".concat(cleanFlowId, ".json"));
                if (!fs.existsSync(troubleshootingDir)) {
                    fs.mkdirSync(troubleshootingDir, { recursive: true });
                }
                return [4 /*yield*/, openai.chat.completions.create({
                        model: "gpt-4",
                        messages: [
                            {
                                role: "system",
                                content: "\u3042\u306A\u305F\u306F\u5EFA\u8A2D\u6A5F\u68B0\u306E\u6545\u969C\u8A3A\u65AD\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\n\u4EE5\u4E0B\u306E\u5F62\u5F0F\u3067\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\n1. \u30BF\u30A4\u30C8\u30EB\uFF1A\u554F\u984C\u306E\u7C21\u6F54\u306A\u8AAC\u660E\n2. \u624B\u9806\uFF1A\u5177\u4F53\u7684\u306A\u5BFE\u51E6\u65B9\u6CD5\u3092\u9806\u756A\u306B\u8AAC\u660E\n\u5404\u624B\u9806\u306F\u660E\u78BA\u3067\u3001\u6280\u8853\u8005\u3067\u3082\u7D20\u4EBA\u3067\u3082\u7406\u89E3\u3067\u304D\u308B\u3088\u3046\u306B\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
                            },
                            {
                                role: "user",
                                content: "\u4EE5\u4E0B\u306E\u6545\u969C\u72B6\u6CC1\u306B\u5BFE\u3059\u308B\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A".concat(keyword)
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    })];
            case 1:
                completion = _d.sent();
                generatedContent = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                if (!generatedContent) {
                    throw new Error('フロー生成に失敗しました');
                }
                lines = generatedContent.split('\n').filter(function (line) { return line.trim(); });
                title = ((_c = lines.find(function (line) { return line.includes('タイトル：'); })) === null || _c === void 0 ? void 0 : _c.replace('タイトル：', '').trim()) || keyword;
                steps = [];
                currentStep = null;
                for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                    line = lines_1[_i];
                    if (line.includes('手順：') || line.match(/^\d+\./)) {
                        if (currentStep) {
                            steps.push(currentStep);
                        }
                        stepTitle = line.replace(/^手順：|^\d+\.\s*/, '').trim();
                        currentStep = {
                            id: "step_".concat(steps.length + 1),
                            title: stepTitle,
                            description: stepTitle,
                            message: stepTitle,
                            type: 'step',
                            imageUrl: '',
                            options: []
                        };
                    }
                    else if (currentStep && line.trim()) {
                        currentStep.description += '\n' + line.trim();
                        currentStep.message += '\n' + line.trim();
                    }
                }
                if (currentStep) {
                    steps.push(currentStep);
                }
                flowData = {
                    id: "flow_".concat(Date.now()),
                    title: title,
                    description: "\u81EA\u52D5\u751F\u6210\u3055\u308C\u305F".concat(keyword, "\u306E\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC"),
                    triggerKeywords: [keyword],
                    steps: steps,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                fileName = "".concat(flowData.id, ".json");
                flowFilePath = path.join(process.cwd(), 'knowledge-base', 'troubleshooting', "".concat(fileName, ".json"));
                fs.writeFileSync(flowFilePath, JSON.stringify(flowData, null, 2), 'utf8');
                res.json({
                    success: true,
                    data: flowData,
                    message: 'フローが正常に生成されました'
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('❌ フロー生成エラー:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'フローの生成に失敗しました',
                    details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.delete('/delete/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            // ここでデータベースからフローを削除する処理を追加
            // 例: await db.delete(flows).where(eq(flows.id, id));
            res.status(200).json({ message: 'フローを削除しました' });
        }
        catch (error) {
            console.error('フロー削除エラー:', error);
            res.status(500).json({ error: 'フローの削除に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
// 画像アップロードエンドポイント
router.post('/upload-image', image_uploader_1.upload.single('image'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allowedMimes, timestamp, originalName, extension, fileName, uploadDir, fileHash, existingFile, finalFileName, isDuplicate, filePath, imageUrl;
    return __generator(this, function (_a) {
        try {
            if (!req.file) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: '画像ファイルが提供されていません'
                    })];
            }
            allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedMimes.includes(req.file.mimetype)) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: '対応していないファイル形式です'
                    })];
            }
            // ファイルサイズチェック（5MB）
            if (req.file.size > 5 * 1024 * 1024) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: 'ファイルサイズは5MB以下にしてください'
                    })];
            }
            timestamp = Date.now();
            originalName = req.file.originalname;
            extension = originalName.split('.').pop();
            fileName = "emergency-flow-step".concat(timestamp, ".").concat(extension);
            uploadDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            fileHash = calculateFileHash(req.file.buffer);
            console.log('🔍 ファイルハッシュ計算:', { fileHash: fileHash });
            existingFile = findExistingImageByHash(uploadDir, fileHash);
            finalFileName = fileName;
            isDuplicate = false;
            if (existingFile) {
                console.log('🔄 重複画像を検出、既存ファイルを使用:', existingFile);
                finalFileName = existingFile;
                isDuplicate = true;
            }
            else {
                filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, req.file.buffer);
            }
            imageUrl = "/api/emergency-flow/image/".concat(finalFileName);
            console.log('✅ 画像アップロード成功:', {
                fileName: finalFileName,
                imageUrl: imageUrl,
                fileSize: req.file.size,
                isDuplicate: isDuplicate,
                details: {
                    originalFileName: fileName,
                    finalFileName: finalFileName,
                    finalImageUrl: imageUrl
                }
            });
            res.json({
                success: true,
                imageUrl: imageUrl,
                fileName: finalFileName,
                isDuplicate: isDuplicate
            });
        }
        catch (error) {
            console.error('❌ 画像アップロードエラー:', error);
            res.status(500).json({
                success: false,
                error: '画像のアップロードに失敗しました'
            });
        }
        return [2 /*return*/];
    });
}); });
// URI暗号化関数
/*
function encryptUri(fileName: string): string {
  console.log('🔐 暗号化開始:', { fileName });
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  console.log('🔐 暗号化キー:', { secretLength: secret.length, secretPrefix: secret.substring(0, 10) + '...' });
  
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(fileName, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('🔐 暗号化完了:', {
    originalFileName: fileName,
    encryptedFileName: encrypted,
    encryptedLength: encrypted.length
  });
  
  return encrypted;
}
*/
// URI復号化関数
/*
function decryptUri(encryptedFileName: string): string {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encryptedFileName, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
*/
// 画像配信エンドポイント（knowledge-baseから直接配信）
router.get('/image/:fileName', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fileName, uploadDir, filePath, ext, mimeTypes, contentType, fileBuffer;
    return __generator(this, function (_a) {
        try {
            fileName = req.params.fileName;
            console.log('🖼️ 画像配信リクエスト:', {
                fileName: fileName,
                userAgent: req.get('User-Agent'),
                referer: req.get('Referer'),
                timestamp: new Date().toISOString()
            });
            if (!fileName) {
                console.log('❌ ファイル名が指定されていません');
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        error: 'ファイル名が必要です'
                    })];
            }
            uploadDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
            filePath = path.join(uploadDir, fileName);
            console.log('🔍 ファイルパス確認:', {
                fileName: fileName,
                uploadDir: uploadDir,
                filePath: filePath,
                dirExists: fs.existsSync(uploadDir),
                fileExists: fs.existsSync(filePath),
                dirContents: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : 'ディレクトリが存在しません'
            });
            // ファイルの存在確認
            if (!fs.existsSync(filePath)) {
                console.error('❌ 画像ファイルが見つかりません:', {
                    fileName: fileName,
                    filePath: filePath,
                    uploadDir: uploadDir,
                    dirContents: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : 'ディレクトリが存在しません'
                });
                return [2 /*return*/, res.status(404).json({
                        success: false,
                        error: '画像ファイルが見つかりません'
                    })];
            }
            ext = path.extname(fileName).toLowerCase();
            mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };
            contentType = mimeTypes[ext] || 'application/octet-stream';
            fileBuffer = fs.readFileSync(filePath);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
            res.send(fileBuffer);
            console.log('✅ 画像配信成功:', {
                fileName: fileName,
                contentType: contentType,
                fileSize: fileBuffer.length,
                filePath: filePath
            });
        }
        catch (error) {
            console.error('❌ 画像配信エラー:', {
                error: error.message,
                stack: error.stack,
                fileName: req.params.fileName
            });
            res.status(500).json({
                success: false,
                error: '画像の配信に失敗しました'
            });
        }
        return [2 /*return*/];
    });
}); });
// ファイルのハッシュを計算する関数
function calculateFileHash(buffer) {
    return crypto_1.default.createHash('md5').update(buffer).digest('hex');
}
// 既存の画像ファイルから同じハッシュのファイルを探す関数
function findExistingImageByHash(uploadDir, fileHash) {
    try {
        var files = fs.readdirSync(uploadDir);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp')) {
                var filePath = path.join(uploadDir, file);
                var fileBuffer = fs.readFileSync(filePath);
                var existingHash = calculateFileHash(fileBuffer);
                if (existingHash === fileHash) {
                    console.log("\uD83D\uDD04 \u540C\u3058\u30CF\u30C3\u30B7\u30E5\u306E\u753B\u50CF\u3092\u767A\u898B: ".concat(file));
                    return file;
                }
            }
        }
    }
    catch (error) {
        console.error('既存ファイル検索エラー:', error);
    }
    return null;
}
// フロー取得エンドポイント（/:id）
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, troubleshootingDir, filePath, content, data;
    var _a;
    return __generator(this, function (_b) {
        try {
            id = req.params.id;
            console.log("\uD83D\uDD04 \u30D5\u30ED\u30FC\u53D6\u5F97\u958B\u59CB: ID=".concat(id));
            troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
            filePath = path.join(troubleshootingDir, "".concat(id, ".json"));
            if (!fs.existsSync(filePath)) {
                console.log("\u274C \u30D5\u30A1\u30A4\u30EB\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ".concat(filePath));
                return [2 /*return*/, res.status(404).json({ error: 'フローファイルが見つかりません' })];
            }
            content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
            console.log("\u2705 \u30D5\u30ED\u30FC\u53D6\u5F97\u6210\u529F:", {
                id: data.id,
                title: data.title,
                stepsCount: ((_a = data.steps) === null || _a === void 0 ? void 0 : _a.length) || 0
            });
            res.json(data);
        }
        catch (error) {
            console.error('❌ フロー取得エラー:', error);
            res.status(500).json({ error: 'フローの取得に失敗しました' });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
