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
exports.formatValidationError = formatValidationError;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.createSearchResult = createSearchResult;
exports.formatFileSize = formatFileSize;
exports.formatDate = formatDate;
exports.truncateString = truncateString;
exports.generateUUID = generateUUID;
exports.getFileExtension = getFileExtension;
exports.getFileTypeFromMime = getFileTypeFromMime;
exports.isImageFile = isImageFile;
exports.validatePasswordStrength = validatePasswordStrength;
exports.getSystemConfig = getSystemConfig;
exports.debounce = debounce;
exports.throttle = throttle;
exports.deepEqual = deepEqual;
exports.deepClone = deepClone;
exports.chunkArray = chunkArray;
exports.removeDuplicates = removeDuplicates;
exports.retry = retry;
/**
 * バリデーションエラーをユーザーフレンドリーなメッセージに変換
 */
function formatValidationError(error) {
    return error.errors.map(function (err) { return err.message; }).join(', ');
}
/**
 * APIレスポンスの成功レスポンスを作成
 */
function createSuccessResponse(data, message) {
    return {
        success: true,
        data: data,
        message: message
    };
}
/**
 * APIレスポンスのエラーレスポンスを作成
 */
function createErrorResponse(error, data) {
    return {
        success: false,
        error: error,
        data: data
    };
}
/**
 * 検索結果を作成
 */
function createSearchResult(items, total, page, limit) {
    return {
        items: items,
        total: total,
        page: page,
        limit: limit,
        hasMore: page * limit < total
    };
}
/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * 日付をフォーマット
 */
function formatDate(date, format) {
    if (format === void 0) { format = 'short'; }
    var d = typeof date === 'string' ? new Date(date) : date;
    switch (format) {
        case 'long':
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'iso':
            return d.toISOString();
        default:
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
    }
}
/**
 * 文字列を安全に切り詰める
 */
function truncateString(str, maxLength, suffix) {
    if (suffix === void 0) { suffix = '...'; }
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}
/**
 * UUIDを生成
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * ファイル拡張子を取得
 */
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}
/**
 * MIMEタイプからファイルタイプを判定
 */
function getFileTypeFromMime(mimeType) {
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.startsWith('video/'))
        return 'video';
    if (mimeType.startsWith('audio/'))
        return 'audio';
    return 'document';
}
/**
 * ファイルが画像かどうかを判定
 */
function isImageFile(filename) {
    var imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    var ext = getFileExtension(filename).toLowerCase();
    return imageExtensions.includes(ext);
}
/**
 * パスワードの強度をチェック
 */
function validatePasswordStrength(password) {
    var feedback = [];
    var score = 0;
    if (password.length >= 8)
        score += 1;
    else
        feedback.push('パスワードは8文字以上である必要があります');
    if (/[a-z]/.test(password))
        score += 1;
    else
        feedback.push('小文字を含める必要があります');
    if (/[A-Z]/.test(password))
        score += 1;
    else
        feedback.push('大文字を含める必要があります');
    if (/[0-9]/.test(password))
        score += 1;
    else
        feedback.push('数字を含める必要があります');
    if (/[^A-Za-z0-9]/.test(password))
        score += 1;
    else
        feedback.push('特殊文字を含めることを推奨します');
    return {
        isValid: score >= 3,
        score: score,
        feedback: feedback
    };
}
/**
 * 環境変数からシステム設定を取得
 */
function getSystemConfig() {
    return {
        version: process.env.VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
            chat: true,
            emergencyGuide: true,
            troubleshooting: true,
            knowledgeBase: true,
            voiceAssistant: process.env.ENABLE_VOICE_ASSISTANT === 'true'
        },
        limits: {
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
            maxUploadFiles: parseInt(process.env.MAX_UPLOAD_FILES || '5'),
            maxChatHistory: parseInt(process.env.MAX_CHAT_HISTORY || '100')
        }
    };
}
/**
 * デバウンス関数
 */
function debounce(func, wait) {
    var timeout;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        clearTimeout(timeout);
        timeout = setTimeout(function () { return func.apply(void 0, args); }, wait);
    };
}
/**
 * スロットル関数
 */
function throttle(func, limit) {
    var inThrottle;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!inThrottle) {
            func.apply(void 0, args);
            inThrottle = true;
            setTimeout(function () { return inThrottle = false; }, limit);
        }
    };
}
/**
 * 深いオブジェクトの比較
 */
function deepEqual(obj1, obj2) {
    if (obj1 === obj2)
        return true;
    if (obj1 == null || obj2 == null)
        return false;
    if (typeof obj1 !== typeof obj2)
        return false;
    if (typeof obj1 !== 'object')
        return false;
    var keys1 = Object.keys(obj1);
    var keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length)
        return false;
    for (var _i = 0, keys1_1 = keys1; _i < keys1_1.length; _i++) {
        var key = keys1_1[_i];
        if (!keys2.includes(key))
            return false;
        if (!deepEqual(obj1[key], obj2[key]))
            return false;
    }
    return true;
}
/**
 * オブジェクトの深いコピー
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(function (item) { return deepClone(item); });
    if (typeof obj === 'object') {
        var clonedObj = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}
/**
 * 配列を指定されたサイズのチャンクに分割
 */
function chunkArray(array, size) {
    var chunks = [];
    for (var i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * 配列から重複を除去
 */
function removeDuplicates(array, key) {
    if (key) {
        var seen_1 = new Set();
        return array.filter(function (item) {
            var value = item[key];
            if (seen_1.has(value))
                return false;
            seen_1.add(value);
            return true;
        });
    }
    return __spreadArray([], new Set(array), true);
}
/**
 * 非同期処理のリトライ機能
 */
function retry(fn_1) {
    return __awaiter(this, arguments, void 0, function (fn, maxAttempts, delay) {
        var lastError, _loop_1, attempt, state_1;
        if (maxAttempts === void 0) { maxAttempts = 3; }
        if (delay === void 0) { delay = 1000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (attempt) {
                        var _b, error_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 4]);
                                    _b = {};
                                    return [4 /*yield*/, fn()];
                                case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                case 2:
                                    error_1 = _c.sent();
                                    lastError = error_1;
                                    if (attempt === maxAttempts)
                                        return [2 /*return*/, "break"];
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay * attempt); })];
                                case 3:
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxAttempts)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    if (state_1 === "break")
                        return [3 /*break*/, 4];
                    _a.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw lastError;
            }
        });
    });
}
