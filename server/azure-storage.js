"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureStorage = exports.AzureStorageService = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class AzureStorageService {
    constructor() {
        Object.defineProperty(this, "blobServiceClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "containerClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "containerName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.containerName =
            process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
        }
        this.blobServiceClient =
            storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }
    async ensureContainerExists() {
        try {
            await this.containerClient.createIfNotExists({
                access: 'blob',
            });
        }
        catch (error) {
            console.error('Error creating container:', error);
            throw error;
        }
    }
    async uploadFile(filePath, blobName) {
        try {
            await this.ensureContainerExists();
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const fileBuffer = await fs_1.promises.readFile(filePath);
            await blockBlobClient.uploadData(fileBuffer);
            return blockBlobClient.url;
        }
        catch (error) {
            console.error('Error uploading file to Azure Storage:', error);
            throw error;
        }
    }
    async downloadFile(blobName, localPath) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            // ローカルディレクトリを作成
            const dir = path_1.default.dirname(localPath);
            await fs_1.promises.mkdir(dir, { recursive: true });
            await blockBlobClient.downloadToFile(localPath);
        }
        catch (error) {
            console.error('Error downloading file from Azure Storage:', error);
            throw error;
        }
    }
    async fileExists(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const exists = await blockBlobClient.exists();
            return exists;
        }
        catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    }
    async listFiles(prefix) {
        try {
            const blobs = [];
            for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
                blobs.push(blob.name);
            }
            return blobs;
        }
        catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }
    async deleteFile(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.deleteIfExists();
        }
        catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
    async readFileAsString(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const downloadResponse = await blockBlobClient.download();
            if (downloadResponse.readableStreamBody) {
                const chunks = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                return Buffer.concat(chunks).toString('utf-8');
            }
            throw new Error('No readable stream body');
        }
        catch (error) {
            console.error('Error reading file as string:', error);
            throw error;
        }
    }
    async writeStringToFile(blobName, content) {
        try {
            await this.ensureContainerExists();
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const buffer = Buffer.from(content, 'utf-8');
            await blockBlobClient.uploadData(buffer);
        }
        catch (error) {
            console.error('Error writing string to file:', error);
            throw error;
        }
    }
}
exports.AzureStorageService = AzureStorageService;
// シングルトンインスタンス（環境変数がある場合のみ）
exports.azureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING
    ? new AzureStorageService()
    : null;
