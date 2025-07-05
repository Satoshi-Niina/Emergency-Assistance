"use strict";
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
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
// 環境変数からログレベルを取得（デフォルトはERROR）
var getLogLevel = function () {
    var _a;
    var level = (_a = process.env.LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    var isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
        return LogLevel.ERROR; // 本番環境では常にERRORのみ
    }
    switch (level) {
        case 'DEBUG': return LogLevel.DEBUG;
        case 'INFO': return LogLevel.INFO;
        case 'WARN': return LogLevel.WARN;
        case 'ERROR': return LogLevel.ERROR;
        default: return LogLevel.WARN; // 開発環境のデフォルトはWARN（重要な情報のみ表示）
    }
};
var currentLogLevel = getLogLevel();
/**
 * デバッグレベルのログ出力
 */
var logDebug = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (currentLogLevel >= LogLevel.DEBUG) {
        console.log.apply(console, __spreadArray(['[DEBUG]'], args, false));
    }
};
var logDebug = logDebug;
/**
 * 情報レベルのログ出力
 */
var logInfo = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (currentLogLevel >= LogLevel.INFO) {
        console.log.apply(console, __spreadArray(['[INFO]'], args, false));
    }
};
var logInfo = logInfo;
/**
 * 警告レベルのログ出力
 */
var logWarn = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (currentLogLevel >= LogLevel.WARN) {
        console.warn.apply(console, __spreadArray(['[WARN]'], args, false));
    }
};
var logWarn = logWarn;
/**
 * エラーレベルのログ出力
 */
var logError = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (currentLogLevel >= LogLevel.ERROR) {
        console.error.apply(console, __spreadArray(['[ERROR]'], args, false));
    }
};
var logError = logError;
/**
 * ログレベルの設定状況を表示
 */
var showLogConfig = function () {
    if (process.env.NODE_ENV === 'development') {
        var levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        logInfo("\u30ED\u30B0\u30EC\u30D9\u30EB\u8A2D\u5B9A: ".concat(levelNames[currentLogLevel]));
    }
};
var showLogConfig = showLogConfig;
/**
 * セキュリティ関連の情報をマスクする関数
 */
var maskSensitiveInfo = function (message) {
    if (process.env.NODE_ENV === 'production') {
        return message
            .replace(/password[=:]\s*[^\s,}]+/gi, 'password=***')
            .replace(/token[=:]\s*[^\s,}]+/gi, 'token=***')
            .replace(/key[=:]\s*[^\s,}]+/gi, 'key=***')
            .replace(/secret[=:]\s*[^\s,}]+/gi, 'secret=***')
            .replace(/api[_-]?key[=:]\s*[^\s,}]+/gi, 'api_key=***');
    }
    return message;
};
var maskSensitiveInfo = maskSensitiveInfo;
/**
 * セキュリティを考慮したログ出力関数
 */
var logSecure = function (level) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var maskedArgs = args.map(function (arg) {
        return typeof arg === 'string' ? maskSensitiveInfo(arg) : arg;
    });
    switch (level) {
        case 'debug':
            logDebug.apply(void 0, maskedArgs);
            break;
        case 'info':
            logInfo.apply(void 0, maskedArgs);
            break;
        case 'warn':
            logWarn.apply(void 0, maskedArgs);
            break;
        case 'error':
            logError.apply(void 0, maskedArgs);
            break;
    }
};
var logSecure = logSecure;
export { logDebug, logInfo, logWarn, logError, showLogConfig, maskSensitiveInfo, logSecure, LogLevel };
