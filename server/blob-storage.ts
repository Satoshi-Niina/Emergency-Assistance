import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

/**
 * Azure Blob Storage ドライバー
 * ファイルシステムの代替としてBlob Storageを使用
 */
export class BlobStorageDriver {
  private containerClient: ContainerClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.BLOB_CONTAINER_NAME || 'knowledge-base';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = blobServiceClient.getContainerClient(this.containerName);
    } catch (error) {
      console.error('❌ Azure Blob Storage初期化エラー:', error);
      throw error;
    }
  }

  /**
   * コンテナを初期化（存在しない場合は作成）
   */
  async initialize(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists({
        access: 'container'
      });
      console.log(`✅ Blob container '${this.containerName}' initialized`);
    } catch (error) {
      console.error('❌ Blob container初期化エラー:', error);
      throw error;
    }
  }

  /**
   * ファイルを読み取り
   * @param key ファイルキー（パス）
   * @returns ファイル内容
   */
  async read(key: string): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error(`Failed to download blob: ${key}`);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks).toString('utf-8');
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new Error(`File not found: ${key}`);
      }
      console.error(`❌ Blob読み取りエラー (${key}):`, error);
      throw error;
    }
  }

  /**
   * ファイルを書き込み
   * @param key ファイルキー（パス）
   * @param data 書き込むデータ
   */
  async write(key: string, data: string | Buffer): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const content = typeof data === 'string' ? data : data.toString('utf-8');
      
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(key)
        }
      });
      
      console.log(`✅ Blob uploaded: ${key}`);
    } catch (error) {
      console.error(`❌ Blob書き込みエラー (${key}):`, error);
      throw error;
    }
  }

  /**
   * ファイル一覧を取得
   * @param prefix プレフィックス（ディレクトリパス相当）
   * @returns ファイルキーの配列
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      
      for await (const blob of this.containerClient.listBlobsFlat({
        prefix: prefix
      })) {
        files.push(blob.name);
      }
      
      return files;
    } catch (error) {
      console.error(`❌ Blob一覧取得エラー (prefix: ${prefix}):`, error);
      throw error;
    }
  }

  /**
   * ファイルが存在するかチェック
   * @param key ファイルキー
   * @returns 存在する場合はtrue
   */
  async exists(key: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * ファイルを削除
   * @param key ファイルキー
   */
  async delete(key: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      await blockBlobClient.deleteIfExists();
      console.log(`✅ Blob deleted: ${key}`);
    } catch (error) {
      console.error(`❌ Blob削除エラー (${key}):`, error);
      throw error;
    }
  }

  /**
   * URLからBlob名を生成
   * @param filePath ファイルパス
   * @returns Blob名（URL安全）
   */
  static generateBlobKey(filePath: string): string {
    return filePath
      .replace(/\\/g, '/')  // Windowsパス区切りを統一
      .replace(/^\/+/, '') // 先頭のスラッシュを除去
      .replace(/\/+/g, '/'); // 連続するスラッシュを1つに
  }

  /**
   * Content-Typeを推定
   * @param key ファイルキー
   * @returns Content-Type
   */
  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'json':
        return 'application/json';
      case 'txt':
        return 'text/plain';
      case 'md':
        return 'text/markdown';
      case 'html':
        return 'text/html';
      case 'css':
        return 'text/css';
      case 'js':
        return 'application/javascript';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}

// シングルトンインスタンス
let storageInstance: BlobStorageDriver | null = null;

/**
 * Storage ドライバーのシングルトンインスタンスを取得
 */
export function getStorageDriver(): BlobStorageDriver {
  if (!storageInstance) {
    storageInstance = new BlobStorageDriver();
  }
  return storageInstance;
}

/**
 * Storage を初期化（アプリケーション起動時に呼び出し）
 */
export async function initializeStorage(): Promise<void> {
  const driver = getStorageDriver();
  await driver.initialize();
}

// レガシー関数のエクスポート（既存コードとの互換性のため）
export const blobStorage = {
  read: async (key: string) => getStorageDriver().read(key),
  write: async (key: string, data: string | Buffer) => getStorageDriver().write(key, data),
  list: async (prefix?: string) => getStorageDriver().list(prefix),
  exists: async (key: string) => getStorageDriver().exists(key),
  delete: async (key: string) => getStorageDriver().delete(key)
};

export default blobStorage;
