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
exports.createApp = createApp;

require("dotenv/config");
var path = require("path");
var url_1 = require("url");
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var express_session_1 = require("express-session");
var memorystore_1 = require("memorystore");

var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);

dotenv_1.default.config({ path: path.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv_1.default.config({ path: path.resolve(__dirname, '.env') });

function createApp() {
    return __awaiter(this, void 0, void 0, function () {
        var app, isProduction, corsOptions, MemoryStoreSession;
        return __generator(this, function (_a) {
            console.log("[INFO] Creating Express application...");
            app = (0, express_1.default)();
            isProduction = process.env.NODE_ENV === 'production';

            corsOptions = {
                origin: isProduction
                    ? [process.env.FRONTEND_URL || 'http://localhost:5000']
                    : ['http://localhost:5000', 'http://localhost:5173', 'https://*.replit.dev'],
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
            };
            app.use((0, cors_1.default)(corsOptions));

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

            MemoryStoreSession = (0, memorystore_1.default)(express_session_1.default);
            app.use((0, express_session_1.default)({
                secret: process.env.SESSION_SECRET || 'emergency-recovery-secret-key',
                resave: false,
                saveUninitialized: false,
                store: new MemoryStoreSession({ checkPeriod: 86400000 }),
                cookie: {
                    secure: isProduction,
                    httpOnly: true,
                    maxAge: 86400000,
                    sameSite: isProduction ? 'strict' : 'lax'
                }
            }));

            app.get('/api/health', function (req, res) {
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development',
                    processId: process.pid,
                    version: process.env.npm_package_version || '1.0.0'
                });
            });

            if (isProduction) {
                app.use(express_1.default.static(path.join(__dirname, '../client/dist')));
                app.get('*', function (req, res) {
                    if (!req.path.startsWith('/api/')) {
                        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
                    }
                });
            }

            try {
                app.use('/images', express_1.default.static(path.join(process.cwd(), 'public', 'images')));
                app.use('/knowledge-base/images', express_1.default.static(path.join(process.cwd(), 'knowledge-base', 'images')));
                app.use('/knowledge-base/data', express_1.default.static(path.join(process.cwd(), 'knowledge-base', 'data')));
                console.log('✅ 静的ファイル設定完了');
            } catch (staticError) {
                console.error('❌ 静的ファイル設定エラー:', staticError);
            }

            app.use(function (err, _req, res, _next) {
                console.error('Server error:', err);
                res.status(500).json(__assign(
                    { message: isProduction ? 'Internal Server Error' : err.message },
                    (isProduction ? {} : { stack: err.stack })
                ));
            });

            return [2 /*return*/, app];
        });
    });
}

// ✅ 起動処理
const port = process.env.PORT || 3000;
createApp().then(app => {
    app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('❌ Failed to start server:', err);
});
