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
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName && accountKey) {
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      // Managed Identityを使用（Azure App Service上で動作）
      const credential = new DefaultAzureCredential();
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName || 'your-storage-account'}.blob.core.windows.net`,
        credential
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  // コンテナの初期化
  async initializeContainer(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists();
      console.log(`✅ Azure Storage container '${this.containerName}' initialized`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure Storage container:', error);
      throw error;
    }
  }

  // ファイルをアップロード
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
      console.log(`✅ File uploaded: ${blobName} -> ${url}`);
      return url;
    } catch (error) {
      console.error(`❌ Failed to upload file ${blobName}:`, error);
      throw error;
    }
  }

  // ファイルをダウンロード
  async downloadFile(blobName: string, localPath: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download();
      
      // ディレクトリを作成
      await fs.ensureDir(path.dirname(localPath));
      
      // ファイルに書き込み
      const writeStream = fs.createWriteStream(localPath);
      downloadResponse.readableStreamBody?.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Failed to download file ${blobName}:`, error);
      throw error;
    }
  }

  // ファイルの存在確認
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ファイルを削除
  async deleteFile(blobName: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      console.log(`✅ File deleted: ${blobName}`);
    } catch (error) {
      console.error(`❌ Failed to delete file ${blobName}:`, error);
      throw error;
    }
  }

  // ディレクトリ内のファイル一覧を取得
  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const listOptions = prefix ? { prefix } : {};
      
      for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
        files.push(blob.name);
      }
      
      return files;
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      throw error;
    }
  }

  // ファイルのURLを取得
  getFileUrl(blobName: string): string {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  // ローカルディレクトリ全体をアップロード
  async uploadDirectory(localDir: string, remotePrefix: string = ''): Promise<void> {
    try {
      const files = await this.getAllFiles(localDir);
      
      for (const file of files) {
        const relativePath = path.relative(localDir, file);
        const blobName = remotePrefix ? `${remotePrefix}/${relativePath}` : relativePath;
        await this.uploadFile(file, blobName);
      }
      
      console.log(`✅ Directory uploaded: ${localDir} -> ${remotePrefix}`);
    } catch (error) {
      console.error(`❌ Failed to upload directory ${localDir}:`, error);
      throw error;
    }
  }

  // ディレクトリ全体をダウンロード
  async downloadDirectory(remotePrefix: string, localDir: string): Promise<void> {
    try {
      const files = await this.listFiles(remotePrefix);
      
      for (const blobName of files) {
        const relativePath = blobName.replace(remotePrefix + '/', '');
        const localPath = path.join(localDir, relativePath);
        await this.downloadFile(blobName, localPath);
      }
      
      console.log(`✅ Directory downloaded: ${remotePrefix} -> ${localDir}`);
    } catch (error) {
      console.error(`❌ Failed to download directory ${remotePrefix}:`, error);
      throw error;
    }
  }

  // 再帰的にファイル一覧を取得
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

  // コンテンツタイプを取得
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

// シングルトンインスタンス
export const azureStorage = new AzureStorageService(); 