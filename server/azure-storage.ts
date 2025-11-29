import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { promises as fs } from 'fs';
import path from 'path';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName =
      process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

    if (!connectionString) {
      throw new Error(
        'AZURE_STORAGE_CONNECTION_STRING environment variable is required'
      );
    }

    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName
    );
  }

  async ensureContainerExists(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists({
        access: 'blob',
      });
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  async uploadFile(filePath: string, blobName: string): Promise<string> {
    try {
      await this.ensureContainerExists();

      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
      const fileBuffer = await fs.readFile(filePath);

      await blockBlobClient.uploadData(fileBuffer);

      console.log('✅ Azure Blob uploaded:', fullBlobName);
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading file to Azure Storage:', error);
      throw error;
    }
  }

  async downloadFile(blobName: string, localPath: string): Promise<void> {
    try {
      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);

      // ローカルディレクトリを作成
      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true });

      await blockBlobClient.downloadToFile(localPath);
      console.log('✅ Azure Blob downloaded:', fullBlobName);
    } catch (error) {
      console.error('Error downloading file from Azure Storage:', error);
      throw error;
    }
  }

  async fileExists(blobName: string): Promise<boolean> {
    try {
      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
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
      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
      await blockBlobClient.deleteIfExists();
      console.log('✅ Azure Blob deleted:', fullBlobName);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async readFileAsString(blobName: string): Promise<string> {
    try {
      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
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

      // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
      const fullBlobName = blobName.startsWith('knowledge-base/')
        ? blobName
        : `knowledge-base/${blobName}`;

      const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
      const buffer = Buffer.from(content, 'utf-8');

      await blockBlobClient.uploadData(buffer);
      console.log('✅ Azure Blob written:', fullBlobName);
    } catch (error) {
      console.error('Error writing string to file:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス（環境変数がある場合のみ）
export const azureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING
  ? new AzureStorageService()
  : null;
