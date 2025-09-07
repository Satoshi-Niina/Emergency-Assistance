// Azure Blob Storage専用サービス（FS依存排除版）
import { v4 as uuidv4 } from 'uuid';

// Azure Blob Storage設定
interface AzureBlobConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
  connectionString?: string;
}

export interface StorageConfig {
  type: 'azure';
  azure: AzureBlobConfig;
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
}

export class StorageService {
  private config: StorageConfig;
  private isProduction: boolean;

  constructor(config: StorageConfig) {
    this.config = config;
    this.isProduction = process.env.NODE_ENV === 'production';
    console.log('🔧 StorageService initialized:', { type: this.config.type, isProduction: this.isProduction });
  }

  /**
   * Base64画像をファイルとして保存（Azure Blobのみ）
   */
  async saveBase64Image(base64Data: string, filename?: string): Promise<UploadResult> {
    try {
      // Base64データからヘッダーを除去
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Image, 'base64');
      
      // ファイル名を生成
      const fileExtension = this.getFileExtensionFromBase64(base64Data);
      const finalFilename = filename || `${uuidv4()}.${fileExtension}`;
      
      return await this.saveToAzure(buffer, finalFilename);
    } catch (error) {
      console.error('❌ 画像保存エラー:', error);
      throw error;
    }
  }

  /**
   * Azure Blob Storageに保存
   */
  private async saveToAzure(buffer: Buffer, filename: string): Promise<UploadResult> {
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
          blobContentType: this.getContentTypeFromFilename(filename)
        }
      });
      
      const url = blockBlobClient.url;
      
      console.log(`✅ Azure Blob保存完了: ${url}`);
      
      return {
        url,
        path: url,
        filename,
        size: buffer.length
      };
    } catch (error) {
      console.error('❌ Azure Blob保存エラー:', error);
      throw error;
    }
  }

  /**
   * Azure Blobファイルを削除
   */
  async deleteFile(filename: string): Promise<boolean> {
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
    } catch (error) {
      console.error('❌ Azure Blob削除エラー:', error);
      return false;
    }
  }

  /**
   * Base64データからファイル拡張子を取得
   */
  private getFileExtensionFromBase64(base64Data: string): string {
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
  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    return contentTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Azure Blobの存在確認
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const { accountName, accountKey, containerName } = this.config.azure;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      const exists = await blockBlobClient.exists();
      return exists;
    } catch (error) {
      console.error('❌ ファイル存在確認エラー:', error);
      return false;
    }
  }

  /**
   * ストレージ情報を取得
   */
  getStorageInfo(): { type: string; isProduction: boolean } {
    return {
      type: this.config.type,
      isProduction: this.isProduction
    };
  }
}

// デフォルト設定（Azure Blob Storageのみ）
const defaultConfig: StorageConfig = {
  type: 'azure',
  azure: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance-images'
  }
};

// シングルトンインスタンス
export const storageService = new StorageService(defaultConfig); 