"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.logSecure = exports.maskSensitiveInfo = exports.showLogConfig = exports.logError = exports.logWarn = exports.logInfo = exports.logDebug = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// 環境変数からログレベルを取得（デフォルトはERROR）
const getLogLevel = () => {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
        return LogLevel.ERROR; // 本番環境では常にERRORのみ
    }
    switch (level) {
        case 'DEBUG':
            return LogLevel.DEBUG;
        case 'INFO':
            return LogLevel.INFO;
        case 'WARN':
            return LogLevel.WARN;
        case 'ERROR':
            return LogLevel.ERROR;
        default:
            return LogLevel.WARN; // 開発環境のデフォルトはWARN（重要な情報のみ表示）
    }
};
const currentLogLevel = getLogLevel();
/**
 * デバッグレベルのログ出力
 */
const logDebug = (...args) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};
exports.logDebug = logDebug;
/**
 * 情報レベルのログ出力
 */
const logInfo = (...args) => {
    if (currentLogLevel >= LogLevel.INFO) {
        console.log('[INFO]', ...args);
    }
};
exports.logInfo = logInfo;
/**
 * 警告レベルのログ出力
 */
const logWarn = (...args) => {
    if (currentLogLevel >= LogLevel.WARN) {
        console.warn('[WARN]', ...args);
    }
};
exports.logWarn = logWarn;
/**
 * エラーレベルのログ出力
 */
const logError = (...args) => {
    if (currentLogLevel >= LogLevel.ERROR) {
        console.error('[ERROR]', ...args);
    }
};
exports.logError = logError;
/**
 * ログレベルの設定状況を表示
 */
const showLogConfig = () => {
    if (process.env.NODE_ENV === 'development') {
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        (0, exports.logInfo)(`ログレベル設定: ${levelNames[currentLogLevel]}`);
    }
};
exports.showLogConfig = showLogConfig;
/**
 * セキュリティ関連の情報をマスクする関数
 */
const maskSensitiveInfo = (message) => {
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
exports.maskSensitiveInfo = maskSensitiveInfo;
/**
 * セキュリティを考慮したログ出力関数
 */
const logSecure = (level, ...args) => {
    const maskedArgs = args.map(arg => typeof arg === 'string' ? (0, exports.maskSensitiveInfo)(arg) : arg);
    switch (level) {
        case 'debug':
            (0, exports.logDebug)(...maskedArgs);
            break;
        case 'info':
            (0, exports.logInfo)(...maskedArgs);
            break;
        case 'warn':
            (0, exports.logWarn)(...maskedArgs);
            break;
        case 'error':
            (0, exports.logError)(...maskedArgs);
            break;
    }
};
exports.logSecure = logSecure;
