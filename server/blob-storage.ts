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
   * ファイルを読み取り（テキスト形式）
   * @param key ファイルキー（パス）
   * @returns ファイル内容（UTF-8文字列）
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
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      return buffer.toString('utf-8');
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new Error(`File not found: ${key}`);
      }
      console.error(`❌ Blob読み取りエラー (${key}):`, error);
      throw error;
    }
  }

  /**
   * ファイルを読み取り（バイナリ形式）
   * @param key ファイルキー（パス）
   * @returns ファイル内容（Buffer）
   */
  async readBuffer(key: string): Promise<Buffer> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error(`Failed to download blob: ${key}`);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new Error(`File not found: ${key}`);
      }
      console.error(`❌ Blob読み取りエラー (${key}):`, error);
      throw error;
    }
  }

  /**
   * データ型をチェックするタイプガード
   * @param data チェックするデータ
   * @returns ArrayBufferViewかどうか
   */
  private isArrayBufferView(data: unknown): data is ArrayBufferView {
    return data != null && typeof data === 'object' && 'buffer' in data && 'byteOffset' in data && 'byteLength' in data;
  }

  /**
   * ファイルを書き込み
   * @param key ファイルキー（パス）
   * @param data 書き込むデータ
   */
  async write(key: string, data: string | Buffer | ArrayBuffer | ArrayBufferView): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      
      // データを Buffer に正規化
      let buf: Buffer;
      if (typeof data === 'string') {
        buf = Buffer.from(data, 'utf-8');
      } else if (Buffer.isBuffer(data)) {
        buf = data;
      } else if (data instanceof ArrayBuffer) {
        buf = Buffer.from(data);
      } else if (this.isArrayBufferView(data)) {
        // ArrayBufferView の場合（TypedArray, DataView など）
        buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else {
        // フォールバック: 文字列に変換
        buf = Buffer.from(String(data), 'utf-8');
      }
      
      // Content-Type を取得
      const contentType = this.getContentType(key);
      
      // uploadData を使用してBuffer を直接アップロード
      await blockBlobClient.uploadData(buf, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
      });
      
      console.log(`✅ Blob uploaded: ${key} (${buf.length} bytes, ${contentType})`);
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
  readBuffer: async (key: string) => getStorageDriver().readBuffer(key),
  write: async (key: string, data: string | Buffer | ArrayBuffer | ArrayBufferView) => getStorageDriver().write(key, data),
  list: async (prefix?: string) => getStorageDriver().list(prefix),
  exists: async (key: string) => getStorageDriver().exists(key),
  delete: async (key: string) => getStorageDriver().delete(key)
};

export default blobStorage;
