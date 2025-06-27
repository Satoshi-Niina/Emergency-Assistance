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
require("dotenv/config");
var path = require("path");
var url_1 = require("url");
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);
// 複数の場所から.envファイルを読み込み
dotenv_1.default.config({ path: path.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv_1.default.config({ path: path.resolve(__dirname, '.env') });
// 環境変数の読み込み確認
console.log("[DEBUG] Environment variables loaded:", {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
    PWD: process.cwd(),
    __dirname: __dirname
});
console.log("[INFO] Backend server starting...");
var app = (0, express_1.default)();
var PORT = Number(process.env.PORT) || 3001;
var isProduction = process.env.NODE_ENV === 'production';
// CORS設定
var corsOptions = {
    origin: isProduction
        ? [process.env.FRONTEND_URL || 'http://localhost:5000']
        : ['http://localhost:5000', 'http://localhost:5173', 'https://*.replit.dev'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use((0, cors_1.default)(corsOptions));
// セキュリティヘッダー
app.use(function (req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '10mb' }));
// ヘルスチェックエンドポイント
app.get('/api/health', function (req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        processId: process.pid,
        version: process.env.npm_package_version || '1.0.0'
    });
});
// 本番環境での静的ファイル配信
if (isProduction) {
    // クライアントのビルドファイルを配信
    app.use(express_1.default.static(path.join(__dirname, '../client/dist')));
    // SPAのルーティング対応
    app.get('*', function (req, res) {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(__dirname, '../client/dist/index.html'));
        }
    });
}
// エラーハンドラー
app.use(function (err, _req, res, _next) {
    console.error('Server error:', err);
    res.status(500).json(__assign({ message: isProduction ? 'Internal Server Error' : err.message }, (isProduction ? {} : { stack: err.stack })));
});
// サーバー起動
var server = app.listen(PORT, '0.0.0.0', function () {
    console.log('🚀 ===== BACKEND SERVER READY =====');
    console.log("\u2705 \u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u30B5\u30FC\u30D0\u30FC\u8D77\u52D5: http://0.0.0.0:".concat(PORT));
    console.log("\uD83C\uDF10 \u74B0\u5883: ".concat(process.env.NODE_ENV || 'development'));
    console.log("\uD83D\uDCE1 \u30D8\u30EB\u30B9\u30C1\u30A7\u30C3\u30AF: /api/health");
    if (isProduction) {
        console.log("\uD83C\uDFAF \u672C\u756A\u30E2\u30FC\u30C9: \u9759\u7684\u30D5\u30A1\u30A4\u30EB\u914D\u4FE1\u6709\u52B9");
    }
    console.log('🚀 ===== BACKEND SERVER READY =====');
});
server.on('error', function (err) {
    console.error('❌ サーバーエラー:', err);
    if (err.code === 'EADDRINUSE') {
        console.log('🔄 ポート競合発生、プロセスを終了します');
        process.exit(1);
    }
});
// ルート登録を即座に実行
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var knowledgeBaseAzure, azureError_1, isDev, registerRoutes, _a, setupAuth, _b, routeError_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 14, , 15]);
                console.log('📡 ルート登録開始...');
                if (!(process.env.NODE_ENV === 'production' && process.env.AZURE_STORAGE_CONNECTION_STRING)) return [3 /*break*/, 5];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                console.log('🚀 Azure Storage統合を初期化中...');
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./lib/knowledge-base-azure.js'); })];
            case 2:
                knowledgeBaseAzure = (_c.sent()).knowledgeBaseAzure;
                return [4 /*yield*/, knowledgeBaseAzure.initialize()];
            case 3:
                _c.sent();
                console.log('✅ Azure Storage統合初期化完了');
                return [3 /*break*/, 5];
            case 4:
                azureError_1 = _c.sent();
                console.error('❌ Azure Storage統合初期化エラー:', azureError_1);
                console.log('⚠️ Azure Storage統合なしで続行します');
                return [3 /*break*/, 5];
            case 5:
                isDev = process.env.NODE_ENV !== "production";
                if (!isDev) return [3 /*break*/, 7];
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./routes'); })];
            case 6:
                _a = _c.sent();
                return [3 /*break*/, 9];
            case 7: return [4 /*yield*/, Promise.resolve().then(function () { return require('./routes'); })];
            case 8:
                _a = _c.sent();
                _c.label = 9;
            case 9:
                registerRoutes = (_a).registerRoutes;
                if (!isDev) return [3 /*break*/, 11];
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./auth'); })];
            case 10:
                _b = _c.sent();
                return [3 /*break*/, 13];
            case 11: return [4 /*yield*/, Promise.resolve().then(function () { return require('./auth'); })];
            case 12:
                _b = _c.sent();
                _c.label = 13;
            case 13:
                setupAuth = (_b).setupAuth;
                // 認証とルートを登録
                setupAuth(app);
                registerRoutes(app);
                console.log('✅ 認証とルートの登録完了');
                // 静的ファイル設定（ルート登録後に設定）
                try {
                    app.use('/images', express_1.default.static(path.join(process.cwd(), 'public', 'images')));
                    app.use('/knowledge-base/images', express_1.default.static(path.join(process.cwd(), 'knowledge-base', 'images')));
                    app.use('/knowledge-base/data', express_1.default.static(path.join(process.cwd(), 'knowledge-base', 'data')));
                    console.log('✅ 静的ファイル設定完了');
                }
                catch (staticError) {
                    console.error('❌ 静的ファイル設定エラー:', staticError);
                }
                return [3 /*break*/, 15];
            case 14:
                routeError_1 = _c.sent();
                console.error('❌ ルート登録エラー:', routeError_1);
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); })();
// グレースフルシャットダウン
var gracefulShutdown = function () {
    console.log('🔄 Graceful shutdown initiated...');
    server.close(function () {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
"// Some new code" 
