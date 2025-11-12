"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFileManager = exports.ExportFileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
class ExportFileManager {
    constructor(baseDir = path.join(__dirname, '../../knowledge-base/exports')) {
        Object.defineProperty(this, "baseDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseDir = baseDir;
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    /**
     * チャットエクスポートデータをファイルに保存
     */
    saveChatExport(chatId, data, timestamp) {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }
        const fileName = `export_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);
        try {
            // ダブルクオーテーションを英数小文字に統一してJSONファイルを保存
            const jsonString = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonString, 'utf8');
            console.log(`チャットエクスポート保存: ${filePath}`);
            return filePath;
        }
        catch (error) {
            console.error('エクスポートファイル保存エラー:', error);
            throw error;
        }
    }
    /**
     * 最新のチャットエクスポートファイルを読み込み
     */
    loadLatestChatExport(chatId) {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        if (!fs.existsSync(chatDir)) {
            return null;
        }
        try {
            const files = fs
                .readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();
            if (files.length === 0) {
                return null;
            }
            const latestFile = path.join(chatDir, files[0]);
            const data = fs.readFileSync(latestFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('エクスポートファイル読み込みエラー:', error);
            return null;
        }
    }
    /**
     * チャットの全エクスポートファイル一覧を取得
     */
    getChatExportFiles(chatId) {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        if (!fs.existsSync(chatDir)) {
            return [];
        }
        try {
            return fs
                .readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(chatDir, file));
        }
        catch (error) {
            console.error('エクスポートファイル一覧取得エラー:', error);
            return [];
        }
    }
    /**
     * 古いエクスポートファイルを削除
     */
    cleanupOldExports(chatId, keepCount = 5) {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        if (!fs.existsSync(chatDir)) {
            return;
        }
        try {
            const files = fs
                .readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();
            // 指定数より多い場合は古いファイルを削除
            if (files.length > keepCount) {
                const filesToDelete = files.slice(keepCount);
                for (const file of filesToDelete) {
                    const filePath = path.join(chatDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`古いエクスポートファイル削除: ${filePath}`);
                }
            }
        }
        catch (error) {
            console.error('古いエクスポートファイル削除エラー:', error);
        }
    }
    /**
     * フォーマット済みエクスポートデータを保存
     */
    saveFormattedExport(chatId, formattedData) {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }
        const fileName = `formatted_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);
        try {
            // ダブルクオーテーションを英数小文字に統一してフォーマット済みエクスポートを保存
            const jsonString = JSON.stringify(formattedData, null, 2);
            fs.writeFileSync(filePath, jsonString, 'utf8');
            console.log(`フォーマット済みエクスポート保存: ${filePath}`);
            return filePath;
        }
        catch (error) {
            console.error('フォーマット済みエクスポートファイル保存エラー:', error);
            throw error;
        }
    }
}
exports.ExportFileManager = ExportFileManager;
// デフォルトインスタンス
exports.exportFileManager = new ExportFileManager();
