import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// Azure Blob Storage関連（本番環境用）
interface AzureBlobConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
  connectionString?: string;
}

export interface StorageConfig {
  type: 'local' | 'azure';
  localPath?: string;
  azure?: AzureBlobConfig;
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

    // ローカルストレージのディレクトリを作成
    if (config.type === 'local' && config.localPath) {
      this.ensureDirectoryExists(config.localPath);
    }
  }

  /**
   * ディレクトリが存在しない場合は作成
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ ディレクトリ作成: ${dirPath}`);
    }
  }

  /**
   * Base64画像をファイルとして保存
   */
  async saveBase64Image(
    base64Data: string,
    filename?: string
  ): Promise<UploadResult> {
    try {
      // Base64データからヘッダーを除去
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Image, 'base64');

      // ファイル名を生成
      const fileExtension = this.getFileExtensionFromBase64(base64Data);
      const finalFilename = filename || `${uuidv4()}.${fileExtension}`;

      if (this.config.type === 'local') {
        return await this.saveToLocal(buffer, finalFilename);
      } else if (this.config.type === 'azure') {
        return await this.saveToAzure(buffer, finalFilename);
      } else {
        throw new Error('ストレージタイプが設定されていません');
      }
    } catch (error) {
      console.error('❌ 画像保存エラー:', error);
      throw error;
    }
  }

  /**
   * ローカルストレージに保存
   */
  private async saveToLocal(
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    if (!this.config.localPath) {
      throw new Error('ローカルストレージパスが設定されていません');
    }

    const filePath = path.join(this.config.localPath, filename);

    // ファイルを保存
    fs.writeFileSync(filePath, buffer);

    const stats = fs.statSync(filePath);
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
  private async saveToAzure(
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    if (!this.config.azure) {
      throw new Error('Azure設定がありません');
    }

    try {
      // Azure Blob Storage SDKを動的インポート
      const { BlobServiceClient } = await import('@azure/storage-blob');

      const { accountName, accountKey, containerName } = this.config.azure;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
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
    } catch (error) {
      console.error('❌ Azure Blob保存エラー:', error);
      throw error;
    }
  }

  /**
   * ファイルを削除
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      if (this.config.type === 'local') {
        return await this.deleteFromLocal(filename);
      } else if (this.config.type === 'azure') {
        return await this.deleteFromAzure(filename);
      }
      return false;
    } catch (error) {
      console.error('❌ ファイル削除エラー:', error);
      return false;
    }
  }

  /**
   * ローカルファイルを削除
   */
  private async deleteFromLocal(filename: string): Promise<boolean> {
    if (!this.config.localPath) {
      return false;
    }

    const filePath = path.join(this.config.localPath, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ ローカルファイル削除: ${filePath}`);
      return true;
    }

    return false;
  }

  /**
   * Azure Blobファイルを削除
   */
  private async deleteFromAzure(filename: string): Promise<boolean> {
    if (!this.config.azure) {
      return false;
    }

    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');

      const { accountName, accountKey, containerName } = this.config.azure;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
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
    const extension = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
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
  async fileExists(filename: string): Promise<boolean> {
    try {
      if (this.config.type === 'local') {
        if (!this.config.localPath) return false;
        const filePath = path.join(this.config.localPath, filename);
        return fs.existsSync(filePath);
      } else if (this.config.type === 'azure') {
        // Azure Blobの存在確認
        const { BlobServiceClient } = await import('@azure/storage-blob');

        const { accountName, accountKey, containerName } = this.config.azure!;
        const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

        const blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        const containerClient =
          blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(filename);

        const exists = await blockBlobClient.exists();
        return exists;
      }
      return false;
    } catch (error) {
      console.error('❌ ファイル存在確認エラー:', error);
      return false;
    }
  }

  /**
   * ストレージ情報を取得
   */
  getStorageInfo(): { type: string; path?: string; isProduction: boolean } {
    return {
      type: this.config.type,
      path: this.config.localPath,
      isProduction: this.isProduction,
    };
  }
}

// ESモジュール用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// デフォルト設定
const defaultConfig: StorageConfig = {
  type: process.env.NODE_ENV === 'production' ? 'azure' : 'local',
  localPath:
    process.env.LOCAL_STORAGE_PATH || path.join(__dirname, '../uploads/images'),
  azure:
    process.env.NODE_ENV === 'production'
      ? {
          accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
          accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
          containerName:
            process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge',
        }
      : undefined,
};

// シングルトンインスタンス
export const storageService = new StorageService(defaultConfig);
