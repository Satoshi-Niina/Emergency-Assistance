"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * エクスポートデータをファイルシステムに保存するための管理クラス
 * 将来的にAzureなどのクラウドストレージに切り替える際の抽象化レイヤー
 */
var ExportFileManager = /** @class */ (function () {
    function ExportFileManager(baseDir) {
        if (baseDir === void 0) { baseDir = 'knowledge-base/exports'; }
        this.baseDir = baseDir;
        this.ensureDirectoryExists();
    }
    /**
     * エクスポートディレクトリが存在することを確認
     */
    ExportFileManager.prototype.ensureDirectoryExists = function () {
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
            console.log("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(this.baseDir));
        }
    };
    /**
     * チャットIDに基づくサブディレクトリを作成
     * @param chatId チャットID
     */
    ExportFileManager.prototype.ensureChatDirectoryExists = function (chatId) {
        var chatDir = path_1.default.join(this.baseDir, "chat_".concat(chatId));
        if (!fs_1.default.existsSync(chatDir)) {
            fs_1.default.mkdirSync(chatDir, { recursive: true });
        }
        return chatDir;
    };
    /**
     * フォーマット済みデータをJSONファイルとして保存
     * @param chatId チャットID
     * @param data 保存するデータ
     * @returns 保存したファイルのパス
     */
    ExportFileManager.prototype.saveFormattedExport = function (chatId, data) {
        var chatDir = this.ensureChatDirectoryExists(chatId);
        var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        var fileName = "export_".concat(timestamp, ".json");
        var filePath = path_1.default.join(chatDir, fileName);
        try {
            fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(filePath));
            return filePath;
        }
        catch (error) {
            console.error("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error));
            throw error;
        }
    };
    /**
     * 指定したチャットIDの最新のエクスポートデータを取得
     * @param chatId チャットID
     * @returns 最新のエクスポートデータ、存在しない場合はnull
     */
    ExportFileManager.prototype.getLatestExport = function (chatId) {
        var chatDir = path_1.default.join(this.baseDir, "chat_".concat(chatId));
        if (!fs_1.default.existsSync(chatDir)) {
            return null;
        }
        try {
            // エクスポートファイルを日付順にソート
            var files = fs_1.default.readdirSync(chatDir)
                .filter(function (file) { return file.startsWith('export_') && file.endsWith('.json'); })
                .sort()
                .reverse();
            if (files.length === 0) {
                return null;
            }
            var latestFile = path_1.default.join(chatDir, files[0]);
            var data = fs_1.default.readFileSync(latestFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error("\u6700\u65B0\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error));
            return null;
        }
    };
    /**
     * 指定したチャットIDのすべてのエクスポートファイルを一覧表示
     * @param chatId チャットID
     * @returns ファイルパスの配列
     */
    ExportFileManager.prototype.listExportFiles = function (chatId) {
        var chatDir = path_1.default.join(this.baseDir, "chat_".concat(chatId));
        if (!fs_1.default.existsSync(chatDir)) {
            return [];
        }
        try {
            return fs_1.default.readdirSync(chatDir)
                .filter(function (file) { return file.startsWith('export_') && file.endsWith('.json'); })
                .map(function (file) { return path_1.default.join(chatDir, file); });
        }
        catch (error) {
            console.error("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30D5\u30A1\u30A4\u30EB\u306E\u4E00\u89A7\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error));
            return [];
        }
    };
    return ExportFileManager;
}());
export const ExportFileManager: any = ExportFileManager;
// シングルトンインスタンスをエクスポート
export const exportFileManager: any = new ExportFileManager();
