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
var fs_1 = require("fs");
var path_1 = require("path");
var migrateData = function () { return __awaiter(void 0, void 0, void 0, function () {
    var oldBaseDir, newBaseDir, dirs, oldJsonDir, newJsonDir, files, _i, files_1, file, oldPath, newPath, oldImageDir, newImageDir, files, _a, files_2, file, oldPath, newPath, oldTroubleshootingDir, files, _b, files_3, file, oldPath, newPath;
    return __generator(this, function (_c) {
        oldBaseDir = path_1.default.join(process.cwd(), 'knowledge-base');
        newBaseDir = path_1.default.join(process.cwd(), 'knowledge-base', 'processed');
        dirs = [
            path_1.default.join(newBaseDir, 'text'),
            path_1.default.join(newBaseDir, 'images'),
            path_1.default.join(newBaseDir, 'metadata'),
            path_1.default.join(newBaseDir, 'emergency-guides'),
            path_1.default.join(newBaseDir, 'temp')
        ];
        dirs.forEach(function (dir) {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
        oldJsonDir = path_1.default.join(oldBaseDir, 'json');
        newJsonDir = path_1.default.join(newBaseDir, 'emergency-guides');
        if (fs_1.default.existsSync(oldJsonDir)) {
            files = fs_1.default.readdirSync(oldJsonDir);
            for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                file = files_1[_i];
                if (file.endsWith('.json')) {
                    oldPath = path_1.default.join(oldJsonDir, file);
                    newPath = path_1.default.join(newJsonDir, file);
                    fs_1.default.copyFileSync(oldPath, newPath);
                }
            }
        }
        oldImageDir = path_1.default.join(oldBaseDir, 'images');
        newImageDir = path_1.default.join(newBaseDir, 'images');
        if (fs_1.default.existsSync(oldImageDir)) {
            files = fs_1.default.readdirSync(oldImageDir);
            for (_a = 0, files_2 = files; _a < files_2.length; _a++) {
                file = files_2[_a];
                oldPath = path_1.default.join(oldImageDir, file);
                newPath = path_1.default.join(newImageDir, file);
                fs_1.default.copyFileSync(oldPath, newPath);
            }
        }
        oldTroubleshootingDir = path_1.default.join(oldBaseDir, 'troubleshooting');
        if (fs_1.default.existsSync(oldTroubleshootingDir)) {
            files = fs_1.default.readdirSync(oldTroubleshootingDir);
            for (_b = 0, files_3 = files; _b < files_3.length; _b++) {
                file = files_3[_b];
                if (file.endsWith('.json')) {
                    oldPath = path_1.default.join(oldTroubleshootingDir, file);
                    newPath = path_1.default.join(newJsonDir, "ts_".concat(file));
                    fs_1.default.copyFileSync(oldPath, newPath);
                }
            }
        }
        console.log('データの移行が完了しました');
        return [2 /*return*/];
    });
}); };
migrateData().catch(console.error);
