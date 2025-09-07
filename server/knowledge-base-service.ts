import path from 'path';
import { promises as fs } from 'fs';
import { getStorageDriver } from './blob-storage.js';

// Azure Storage型定義（互換性重視）
interface AzureStorageService {
    readFileAsString(path: string): Promise<string>;
    writeStringToFile(path: string, content: string): Promise<void>;
    fileExists(path: string): Promise<boolean>;
    listFiles(path: string): Promise<string[]>;
    uploadFile(localPath: string, remotePath: string): Promise<string | void>; // 戻り値の柔軟性
    deleteFile(path: string): Promise<void>;
}

export class KnowledgeBaseService {
    private readonly localBasePath = './knowledge-base';
    private readonly azureBasePath = 'knowledge-base';
    private azureStorage: AzureStorageService | null = null;

    constructor() {
        // 開発環境ではローカル、本番環境ではAzure Storageを使用
        this.useAzureStorage = process.env.NODE_ENV === 'production' && 
                              !!process.env.AZURE_STORAGE_CONNECTION_STRING;
        
        console.log('🔧 KnowledgeBaseService初期化:', {
            useAzureStorage: this.useAzureStorage,
            nodeEnv: process.env.NODE_ENV,
            hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING
        });

        // Azure Storageが必要な場合のみインポート
        if (this.useAzureStorage) {
            this.initializeAzureStorage();
        }
    }

    private useAzureStorage: boolean;

    private async initializeAzureStorage() {
        try {
            const { azureStorage } = await import('./azure-storage.js');
            this.azureStorage = azureStorage;
        } catch (error) {
            console.error('Failed to initialize Azure Storage:', error);
            this.useAzureStorage = false;
        }
    }

    async readFile(relativePath: string): Promise<string> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path.posix.join(this.azureBasePath, relativePath);
            return await this.azureStorage.readFileAsString(azurePath);
        } else {
            const localPath = path.join(this.localBasePath, relativePath);
            return await fs.readFile(localPath, 'utf-8');
        }
    }

    async writeFile(relativePath: string, content: string): Promise<void> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.writeStringToFile(azurePath, content);
        } else {
            // ローカル開発環境のみ - ディレクトリ作成せずBlob Storage Driverを使用
            try {
                const storage = getStorageDriver();
                const key = path.posix.join(this.azureBasePath, relativePath);
                await storage.write(key, content);
            } catch (error) {
                // フォールバック: ローカルファイルシステム（開発環境のみ）
                const localPath = path.join(this.localBasePath, relativePath);
                const fs = await import('fs/promises');
                await fs.mkdir(path.dirname(localPath), { recursive: true });
                await fs.writeFile(localPath, content, 'utf-8');
            }
        }
    }

    async fileExists(relativePath: string): Promise<boolean> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path.posix.join(this.azureBasePath, relativePath);
            return await this.azureStorage.fileExists(azurePath);
        } else {
            const localPath = path.join(this.localBasePath, relativePath);
            try {
                await fs.access(localPath);
                return true;
            } catch {
                return false;
            }
        }
    }

    async listFiles(relativePath?: string): Promise<string[]> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = relativePath ? 
                path.posix.join(this.azureBasePath, relativePath) : 
                this.azureBasePath;
            const files = await this.azureStorage.listFiles(azurePath);
            // プレフィックスを除去して相対パスを返す
            return files.map(file => file.replace(this.azureBasePath + '/', ''));
        } else {
            const localPath = relativePath ? 
                path.join(this.localBasePath, relativePath) : 
                this.localBasePath;
            const files = await fs.readdir(localPath, { recursive: true });
            return files.filter(file => typeof file === 'string') as string[];
        }
    }

    async uploadFile(localFilePath: string, relativePath: string): Promise<void> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.uploadFile(localFilePath, azurePath);
        } else {
            // Blob Storage Driver経由でアップロード（ディレクトリ作成不要）
            try {
                const storage = getStorageDriver();
                const key = path.posix.join(this.azureBasePath, relativePath);
                const fs = await import('fs/promises');
                const fileContent = await fs.readFile(localFilePath);
                await storage.write(key, fileContent);
            } catch (error) {
                // フォールバック: ローカルファイルコピー（開発環境のみ）
                const targetPath = path.join(this.localBasePath, relativePath);
                const fs = await import('fs/promises');
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(localFilePath, targetPath);
            }
        }
    }

    async deleteFile(relativePath: string): Promise<void> {
        if (this.useAzureStorage && this.azureStorage) {
            const azurePath = path.posix.join(this.azureBasePath, relativePath);
            await this.azureStorage.deleteFile(azurePath);
        } else {
            const localPath = path.join(this.localBasePath, relativePath);
            await fs.unlink(localPath);
        }
    }

    // JSONファイルの読み書き用のヘルパーメソッド
    async readJSON(relativePath: string): Promise<unknown> {
        const content = await this.readFile(relativePath);
        return JSON.parse(content);
    }

    async writeJSON(relativePath: string, data: unknown): Promise<void> {
        const content = JSON.stringify(data, null, 2);
        await this.writeFile(relativePath, content);
    }
}

// シングルトンインスタンス
export const knowledgeBase = new KnowledgeBaseService();
