import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { promises as fs } from 'fs';
import path from 'path';

export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private containerClient: ContainerClient;
    private containerName: string;

    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge-base';

        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
        }

        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }

    async ensureContainerExists(): Promise<void> {
        try {
            await this.containerClient.createIfNotExists({
                access: 'blob'
            });
        } catch (error) {
            console.error('Error creating container:', error);
            throw error;
        }
    }

    async uploadFile(filePath: string, blobName: string): Promise<string> {
        try {
            await this.ensureContainerExists();
            
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const fileBuffer = await fs.readFile(filePath);
            
            await blockBlobClient.uploadData(fileBuffer);

            return blockBlobClient.url;
        } catch (error) {
            console.error('Error uploading file to Azure Storage:', error);
            throw error;
        }
    }

    async downloadFile(blobName: string, localPath: string): Promise<void> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            
            // 繝ｭ繝ｼ繧ｫ繝ｫ繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
            const dir = path.dirname(localPath);
            await fs.mkdir(dir, { recursive: true });
            
            await blockBlobClient.downloadToFile(localPath);
        } catch (error) {
            console.error('Error downloading file from Azure Storage:', error);
            throw error;
        }
    }

    async fileExists(blobName: string): Promise<boolean> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const exists = await blockBlobClient.exists();
            return exists;
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    }

    async listFiles(prefix?: string): Promise<string[]> {
        try {
            const blobs: string[] = [];
            
            for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
                blobs.push(blob.name);
            }
            
            return blobs;
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }

    async deleteFile(blobName: string): Promise<void> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.deleteIfExists();
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    async readFileAsString(blobName: string): Promise<string> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const downloadResponse = await blockBlobClient.download();
            
            if (downloadResponse.readableStreamBody) {
                const chunks: Buffer[] = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                return Buffer.concat(chunks).toString('utf-8');
            }
            
            throw new Error('No readable stream body');
        } catch (error) {
            console.error('Error reading file as string:', error);
            throw error;
        }
    }

    async writeStringToFile(blobName: string, content: string): Promise<void> {
        try {
            await this.ensureContainerExists();
            
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const buffer = Buffer.from(content, 'utf-8');
            
            await blockBlobClient.uploadData(buffer);
        } catch (error) {
            console.error('Error writing string to file:', error);
            throw error;
        }
    }
}

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ・育腸蠅・､画焚縺後≠繧句ｴ蜷医・縺ｿ・・
export const azureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING 
    ? new AzureStorageService() 
    : null;
