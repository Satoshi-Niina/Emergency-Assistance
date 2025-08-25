import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs-extra';
import * as path from 'path';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge-base';

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName && accountKey) {
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      // Managed Identity繧剃ｽｿ逕ｨ・・zure App Service荳翫〒蜍穂ｽ懶ｼ・
      const credential = new DefaultAzureCredential();
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName || 'your-storage-account'}.blob.core.windows.net`,
        credential
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  // 繧ｳ繝ｳ繝・リ縺ｮ蛻晄悄蛹・
  async initializeContainer(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists();
      console.log(`笨・Azure Storage container '${this.containerName}' initialized`);
    } catch (error) {
      console.error('笶・Failed to initialize Azure Storage container:', error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ繧偵い繝・・繝ｭ繝ｼ繝・
  async uploadFile(localPath: string, blobName: string): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const fileBuffer = await fs.readFile(localPath);
      
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(blobName)
        }
      });

      const url = blockBlobClient.url;
      console.log(`笨・File uploaded: ${blobName} -> ${url}`);
      return url;
    } catch (error) {
      console.error(`笶・Failed to upload file ${blobName}:`, error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝・
  async downloadFile(blobName: string, localPath: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download();
      
      // 繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
      await fs.ensureDir(path.dirname(localPath));
      
      // 繝輔ぃ繧､繝ｫ縺ｫ譖ｸ縺崎ｾｼ縺ｿ
      const writeStream = fs.createWriteStream(localPath);
      downloadResponse.readableStreamBody?.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error(`笶・Failed to download file ${blobName}:`, error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 繝輔ぃ繧､繝ｫ繧貞炎髯､
  async deleteFile(blobName: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      console.log(`笨・File deleted: ${blobName}`);
    } catch (error) {
      console.error(`笶・Failed to delete file ${blobName}:`, error);
      throw error;
    }
  }

  // 繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const listOptions = prefix ? { prefix } : {};
      
      for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
        files.push(blob.name);
      }
      
      return files;
    } catch (error) {
      console.error('笶・Failed to list files:', error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ縺ｮURL繧貞叙蠕・
  getFileUrl(blobName: string): string {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  // 繝ｭ繝ｼ繧ｫ繝ｫ繝・ぅ繝ｬ繧ｯ繝医Μ蜈ｨ菴薙ｒ繧｢繝・・繝ｭ繝ｼ繝・
  async uploadDirectory(localDir: string, remotePrefix: string = ''): Promise<void> {
    try {
      const files = await this.getAllFiles(localDir);
      
      for (const file of files) {
        const relativePath = path.relative(localDir, file);
        const blobName = remotePrefix ? `${remotePrefix}/${relativePath}` : relativePath;
        await this.uploadFile(file, blobName);
      }
      
      console.log(`笨・Directory uploaded: ${localDir} -> ${remotePrefix}`);
    } catch (error) {
      console.error(`笶・Failed to upload directory ${localDir}:`, error);
      throw error;
    }
  }

  // 繝・ぅ繝ｬ繧ｯ繝医Μ蜈ｨ菴薙ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
  async downloadDirectory(remotePrefix: string, localDir: string): Promise<void> {
    try {
      const files = await this.listFiles(remotePrefix);
      
      for (const blobName of files) {
        const relativePath = blobName.replace(remotePrefix + '/', '');
        const localPath = path.join(localDir, relativePath);
        await this.downloadFile(blobName, localPath);
      }
      
      console.log(`笨・Directory downloaded: ${remotePrefix} -> ${localDir}`);
    } catch (error) {
      console.error(`笶・Failed to download directory ${remotePrefix}:`, error);
      throw error;
    }
  }

  // 蜀榊ｸｰ逧・↓繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // 繧ｳ繝ｳ繝・Φ繝・ち繧､繝励ｒ蜿門ｾ・
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const azureStorage = new AzureStorageService(); 