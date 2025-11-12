"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBase = exports.KnowledgeBaseService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
class KnowledgeBaseService {
    constructor() {
        Object.defineProperty(this, "localBasePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: './knowledge-base'
        });
        Object.defineProperty(this, "azureBasePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'knowledge-base'
        });
        Object.defineProperty(this, "azureStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "useAzureStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // 開発環境ではローカル、本番環境ではAzure Storageを使用
        this.useAzureStorage =
            process.env.NODE_ENV === 'production' &&
                !!process.env.AZURE_STORAGE_CONNECTION_STRING;
        // Azure Storageが必要な場合のみインポート
        if (this.useAzureStorage) {
            this.initializeAzureStorage();
        }
    }
    async initializeAzureStorage() {
        try {
            const { azureStorage } = await import('./azure-storage.js');
            this.azureStorage = azureStorage;
        }
        catch (error) {
            console.error('Failed to initialize Azure Storage:', error);
            this.useAzureStorage = false;
        }
    }
    async readFile(relativePath) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path_1.default.posix.join(this.azureBasePath, relativePath);
            return await this.azureStorage.readFileAsString(azurePath);
        }
        else {
            const localPath = path_1.default.join(this.localBasePath, relativePath);
            return await fs_1.promises.readFile(localPath, 'utf-8');
        }
    }
    async writeFile(relativePath, content) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path_1.default.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.writeStringToFile(azurePath, content);
        }
        else {
            const localPath = path_1.default.join(this.localBasePath, relativePath);
            // ディレクトリを作成
            await fs_1.promises.mkdir(path_1.default.dirname(localPath), { recursive: true });
            await fs_1.promises.writeFile(localPath, content, 'utf-8');
        }
    }
    async fileExists(relativePath) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path_1.default.posix.join(this.azureBasePath, relativePath);
            return await this.azureStorage.fileExists(azurePath);
        }
        else {
            const localPath = path_1.default.join(this.localBasePath, relativePath);
            try {
                await fs_1.promises.access(localPath);
                return true;
            }
            catch {
                return false;
            }
        }
    }
    async listFiles(relativePath) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = relativePath
                ? path_1.default.posix.join(this.azureBasePath, relativePath)
                : this.azureBasePath;
            const files = await this.azureStorage.listFiles(azurePath);
            // プレフィックスを除去して相対パスを返す
            return files.map(file => file.replace(this.azureBasePath + '/', ''));
        }
        else {
            const localPath = relativePath
                ? path_1.default.join(this.localBasePath, relativePath)
                : this.localBasePath;
            const files = await fs_1.promises.readdir(localPath, { recursive: true });
            return files.filter(file => typeof file === 'string');
        }
    }
    async uploadFile(localFilePath, relativePath) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path_1.default.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.uploadFile(localFilePath, azurePath);
        }
        else {
            const targetPath = path_1.default.join(this.localBasePath, relativePath);
            await fs_1.promises.mkdir(path_1.default.dirname(targetPath), { recursive: true });
            await fs_1.promises.copyFile(localFilePath, targetPath);
        }
    }
    async deleteFile(relativePath) {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path_1.default.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.deleteFile(azurePath);
        }
        else {
            const localPath = path_1.default.join(this.localBasePath, relativePath);
            await fs_1.promises.unlink(localPath);
        }
    }
    // JSONファイルの読み書き用のヘルパーメソッド
    async readJSON(relativePath) {
        const content = await this.readFile(relativePath);
        return JSON.parse(content);
    }
    async writeJSON(relativePath, data) {
        const content = JSON.stringify(data, null, 2);
        await this.writeFile(relativePath, content);
    }
}
exports.KnowledgeBaseService = KnowledgeBaseService;
// シングルトンインスタンス
exports.knowledgeBase = new KnowledgeBaseService();
