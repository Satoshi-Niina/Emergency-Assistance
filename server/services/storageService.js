"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const url_1 = require("url");
class StorageService {
    constructor(config) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isProduction", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.config = config;
        this.isProduction = process.env.NODE_ENV === 'production';
        // ローカルストレージのディレクトリを作成
        if (config.type === 'local' && config.localPath) {
            this.ensureDirectoryExists(config.localPath);
        }
    }
    /**
     * ディレクトリが存在しない場合は作成
     */
    ensureDirectoryExists(dirPath) {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ ディレクトリ作成: ${dirPath}`);
        }
    }
    /**
     * Base64画像をファイルとして保存
     */
    async saveBase64Image(base64Data, filename) {
        try {
            // Base64データからヘッダーを除去
            const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(base64Image, 'base64');
            // ファイル名を生成
            const fileExtension = this.getFileExtensionFromBase64(base64Data);
            const finalFilename = filename || `${(0, uuid_1.v4)()}.${fileExtension}`;
            if (this.config.type === 'local') {
                return await this.saveToLocal(buffer, finalFilename);
            }
            else if (this.config.type === 'azure') {
                return await this.saveToAzure(buffer, finalFilename);
            }
            else {
                throw new Error('ストレージタイプが設定されていません');
            }
        }
        catch (error) {
            console.error('❌ 画像保存エラー:', error);
            throw error;
        }
    }
    /**
     * ローカルストレージに保存
     */
    async saveToLocal(buffer, filename) {
        if (!this.config.localPath) {
            throw new Error('ローカルストレージパスが設定されていません');
        }
        const filePath = path_1.default.join(this.config.localPath, filename);
        // ファイルを保存
        fs_1.default.writeFileSync(filePath, buffer);
        const stats = fs_1.default.statSync(filePath);
        const url = `/uploads/images/${filename}`; // Webサーバーからの相対パス
        console.log(`✅ ローカル保存完了: ${filePath}`);
        return {
            url,
            path: filePath,
            filename,
            size: stats.size,
        };
    }
    /**
     * Azure Blob Storageに保存
     */
    async saveToAzure(buffer, filename) {
        if (!this.config.azure) {
            throw new Error('Azure設定がありません');
        }
        try {
            // Azure Blob Storage SDKを動的インポート
            const { BlobServiceClient } = await import('@azure/storage-blob');
            const { accountName, accountKey, containerName } = this.config.azure;
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            // ファイルをアップロード
            await blockBlobClient.upload(buffer, buffer.length, {
                blobHTTPHeaders: {
                    blobContentType: this.getContentTypeFromFilename(filename),
                },
            });
            const url = blockBlobClient.url;
            console.log(`✅ Azure Blob保存完了: ${url}`);
            return {
                url,
                path: url,
                filename,
                size: buffer.length,
            };
        }
        catch (error) {
            console.error('❌ Azure Blob保存エラー:', error);
            throw error;
        }
    }
    /**
     * ファイルを削除
     */
    async deleteFile(filename) {
        try {
            if (this.config.type === 'local') {
                return await this.deleteFromLocal(filename);
            }
            else if (this.config.type === 'azure') {
                return await this.deleteFromAzure(filename);
            }
            return false;
        }
        catch (error) {
            console.error('❌ ファイル削除エラー:', error);
            return false;
        }
    }
    /**
     * ローカルファイルを削除
     */
    async deleteFromLocal(filename) {
        if (!this.config.localPath) {
            return false;
        }
        const filePath = path_1.default.join(this.config.localPath, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`✅ ローカルファイル削除: ${filePath}`);
            return true;
        }
        return false;
    }
    /**
     * Azure Blobファイルを削除
     */
    async deleteFromAzure(filename) {
        if (!this.config.azure) {
            return false;
        }
        try {
            const { BlobServiceClient } = await import('@azure/storage-blob');
            const { accountName, accountKey, containerName } = this.config.azure;
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            await blockBlobClient.delete();
            console.log(`✅ Azure Blob削除: ${filename}`);
            return true;
        }
        catch (error) {
            console.error('❌ Azure Blob削除エラー:', error);
            return false;
        }
    }
    /**
     * Base64データからファイル拡張子を取得
     */
    getFileExtensionFromBase64(base64Data) {
        const match = base64Data.match(/^data:image\/([a-z]+);base64,/);
        if (match) {
            const extension = match[1];
            return extension === 'jpeg' ? 'jpg' : extension;
        }
        return 'png'; // デフォルト
    }
    /**
     * ファイル名からContent-Typeを取得
     */
    getContentTypeFromFilename(filename) {
        const extension = path_1.default.extname(filename).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        return contentTypes[extension] || 'application/octet-stream';
    }
    /**
     * ファイルの存在確認
     */
    async fileExists(filename) {
        try {
            if (this.config.type === 'local') {
                if (!this.config.localPath)
                    return false;
                const filePath = path_1.default.join(this.config.localPath, filename);
                return fs_1.default.existsSync(filePath);
            }
            else if (this.config.type === 'azure') {
                // Azure Blobの存在確認
                const { BlobServiceClient } = await import('@azure/storage-blob');
                const { accountName, accountKey, containerName } = this.config.azure;
                const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
                const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                const containerClient = blobServiceClient.getContainerClient(containerName);
                const blockBlobClient = containerClient.getBlockBlobClient(filename);
                const exists = await blockBlobClient.exists();
                return exists;
            }
            return false;
        }
        catch (error) {
            console.error('❌ ファイル存在確認エラー:', error);
            return false;
        }
    }
    /**
     * ストレージ情報を取得
     */
    getStorageInfo() {
        return {
            type: this.config.type,
            path: this.config.localPath,
            isProduction: this.isProduction,
        };
    }
}
exports.StorageService = StorageService;
// ESモジュール用の__dirname代替
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// デフォルト設定
const defaultConfig = {
    type: process.env.NODE_ENV === 'production' ? 'azure' : 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || path_1.default.join(__dirname, '../uploads/images'),
    azure: process.env.NODE_ENV === 'production'
        ? {
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
            accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
            containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge',
        }
        : undefined,
};
// シングルトンインスタンス
exports.storageService = new StorageService(defaultConfig);
