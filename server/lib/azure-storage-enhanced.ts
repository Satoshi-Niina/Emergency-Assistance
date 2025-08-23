import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from '@azure/storage-blob';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';

interface StorageConfig {
  accountName: string;
  accountKey?: string;
  connectionString?: string;
  containerName: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface UploadOptions {
  overwrite?: boolean;
  createPath?: boolean;
  metadata?: Record<string, string>;
}

interface DownloadOptions {
  createLocalPath?: boolean;
  validateChecksum?: boolean;
}

/**
 * Enhanced Azure Blob Storage Service with reliability features
 * 信頼性の高いAzure Blob Storageサービス
 */
export class EnhancedAzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private config: Required<StorageConfig>;

  constructor(config: StorageConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    } as Required<StorageConfig>;

    // Initialize BlobServiceClient
    if (this.config.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
    } else if (this.config.accountKey) {
      const credential = new StorageSharedKeyCredential(this.config.accountName, this.config.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.config.accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      // Use DefaultAzureCredential for managed identity
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.config.accountName}.blob.core.windows.net`
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.config.containerName);
  }

  /**
   * Ensure container exists with proper error handling
   * コンテナの存在確認とエラーハンドリング
   */
  async ensureContainer(): Promise<boolean> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        console.log(`📦 Creating container: ${this.config.containerName}`);
        await this.containerClient.create({
          access: 'blob', // or 'container' for public access
        });
        console.log(`✅ Container created: ${this.config.containerName}`);
      }
      return true;
    } catch (error: any) {
      console.error('❌ Container initialization failed:', error.message);
      throw new Error(`Container initialization failed: ${error.message}`);
    }
  }

  /**
   * Retry wrapper for operations
   * 操作のリトライラッパー
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ ${operationName} attempt ${attempt}/${this.config.maxRetries} failed:`, error.message);
        
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * attempt;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${operationName} failed after ${this.config.maxRetries} attempts: ${lastError!.message}`);
  }

  /**
   * Normalize blob path for consistency
   * Blobパスの正規化
   */
  private normalizeBlobPath(blobPath: string): string {
    return blobPath
      .replace(/\\/g, '/') // Windows backslashes to forward slashes
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+/g, '/'); // Remove duplicate slashes
  }

  /**
   * Upload file with enhanced reliability
   * 信頼性の高いファイルアップロード
   */
  async uploadFile(
    localFilePath: string, 
    blobPath: string, 
    options: UploadOptions = {}
  ): Promise<{ success: boolean; url: string; etag?: string }> {
    await this.ensureContainer();
    
    const normalizedPath = this.normalizeBlobPath(blobPath);
    
    return this.withRetry(async () => {
      try {
        // Check if file exists locally
        await fs.access(localFilePath);
        const stats = await fs.stat(localFilePath);
        
        const blockBlobClient = this.containerClient.getBlockBlobClient(normalizedPath);
        
        // Check if blob exists and overwrite is disabled
        if (!options.overwrite) {
          const exists = await blockBlobClient.exists();
          if (exists) {
            throw new Error(`Blob already exists: ${normalizedPath} (set overwrite: true to replace)`);
          }
        }

        console.log(`⬆️ Uploading: ${localFilePath} → ${normalizedPath} (${stats.size} bytes)`);
        
        const uploadResponse = await blockBlobClient.uploadFile(localFilePath, {
          metadata: options.metadata,
          blobHTTPHeaders: {
            blobContentType: this.getContentType(localFilePath),
          },
        });

        console.log(`✅ Upload successful: ${normalizedPath}`);
        
        return {
          success: true,
          url: blockBlobClient.url,
          etag: uploadResponse.etag,
        };
      } catch (error: any) {
        console.error(`❌ Upload failed: ${normalizedPath}`, error.message);
        throw error;
      }
    }, `Upload ${normalizedPath}`);
  }

  /**
   * Download file with enhanced reliability
   * 信頼性の高いファイルダウンロード
   */
  async downloadFile(
    blobPath: string, 
    localFilePath: string, 
    options: DownloadOptions = {}
  ): Promise<{ success: boolean; size: number; lastModified?: Date }> {
    await this.ensureContainer();
    
    const normalizedPath = this.normalizeBlobPath(blobPath);
    
    return this.withRetry(async () => {
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient(normalizedPath);
        
        // Check if blob exists
        const exists = await blockBlobClient.exists();
        if (!exists) {
          throw new Error(`Blob not found: ${normalizedPath}`);
        }

        // Create local directory if needed
        if (options.createLocalPath) {
          const localDir = path.dirname(localFilePath);
          await fs.mkdir(localDir, { recursive: true });
        }

        console.log(`⬇️ Downloading: ${normalizedPath} → ${localFilePath}`);
        
        const downloadResponse = await blockBlobClient.downloadToFile(localFilePath);
        
        const stats = await fs.stat(localFilePath);
        
        console.log(`✅ Download successful: ${normalizedPath} (${stats.size} bytes)`);
        
        return {
          success: true,
          size: stats.size,
          lastModified: downloadResponse.lastModified,
        };
      } catch (error: any) {
        console.error(`❌ Download failed: ${normalizedPath}`, error.message);
        throw error;
      }
    }, `Download ${normalizedPath}`);
  }

  /**
   * List blobs with filtering and pagination
   * Blobの一覧取得（フィルタリングとページネーション対応）
   */
  async listBlobs(prefix?: string, maxResults?: number): Promise<{
    blobs: Array<{
      name: string;
      size: number;
      lastModified: Date;
      etag: string;
      contentType?: string;
    }>;
    totalCount: number;
  }> {
    await this.ensureContainer();
    
    return this.withRetry(async () => {
      const blobs: any[] = [];
      const normalizedPrefix = prefix ? this.normalizeBlobPath(prefix) : undefined;
      
      console.log(`📋 Listing blobs${normalizedPrefix ? ` with prefix: ${normalizedPrefix}` : ''}`);
      
      for await (const blob of this.containerClient.listBlobsFlat({ 
        prefix: normalizedPrefix,
      })) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          etag: blob.properties.etag || '',
          contentType: blob.properties.contentType,
        });
        
        if (maxResults && blobs.length >= maxResults) {
          break;
        }
      }
      
      console.log(`📋 Found ${blobs.length} blobs`);
      
      return {
        blobs,
        totalCount: blobs.length,
      };
    }, 'List blobs');
  }

  /**
   * Delete blob with confirmation
   * Blobの削除（確認付き）
   */
  async deleteBlob(blobPath: string): Promise<{ success: boolean; deleted: boolean }> {
    await this.ensureContainer();
    
    const normalizedPath = this.normalizeBlobPath(blobPath);
    
    return this.withRetry(async () => {
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient(normalizedPath);
        
        // Check if blob exists
        const exists = await blockBlobClient.exists();
        if (!exists) {
          console.log(`ℹ️ Blob not found (already deleted?): ${normalizedPath}`);
          return { success: true, deleted: false };
        }

        console.log(`🗑️ Deleting blob: ${normalizedPath}`);
        
        await blockBlobClient.delete();
        
        console.log(`✅ Blob deleted: ${normalizedPath}`);
        
        return { success: true, deleted: true };
      } catch (error: any) {
        console.error(`❌ Delete failed: ${normalizedPath}`, error.message);
        throw error;
      }
    }, `Delete ${normalizedPath}`);
  }

  /**
   * Sync directory to blob storage
   * ディレクトリをBlobストレージに同期
   */
  async syncDirectoryToBlob(
    localDirPath: string, 
    blobPrefix: string = '',
    options: { 
      deleteOrphaned?: boolean;
      dryRun?: boolean;
      includePattern?: RegExp;
      excludePattern?: RegExp;
    } = {}
  ): Promise<{
    uploaded: string[];
    deleted: string[];
    skipped: string[];
    errors: Array<{ path: string; error: string }>;
  }> {
    const result = {
      uploaded: [] as string[],
      deleted: [] as string[],
      skipped: [] as string[],
      errors: [] as Array<{ path: string; error: string }>,
    };

    try {
      // Get local files
      const localFiles = await this.getLocalFiles(localDirPath, options.includePattern, options.excludePattern);
      
      // Get remote blobs
      const { blobs: remoteBlobs } = await this.listBlobs(blobPrefix);
      
      console.log(`🔄 Syncing ${localFiles.length} local files with ${remoteBlobs.length} remote blobs`);
      
      if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
      }

      // Upload local files
      for (const localFile of localFiles) {
        try {
          const relativePath = path.relative(localDirPath, localFile);
          const blobPath = path.posix.join(blobPrefix, relativePath.replace(/\\/g, '/'));
          
          if (!options.dryRun) {
            await this.uploadFile(localFile, blobPath, { overwrite: true });
          }
          
          result.uploaded.push(blobPath);
          console.log(`📤 ${options.dryRun ? '[DRY RUN] ' : ''}Uploaded: ${blobPath}`);
        } catch (error: any) {
          result.errors.push({ path: localFile, error: error.message });
        }
      }

      // Delete orphaned blobs if requested
      if (options.deleteOrphaned) {
        const localBlobPaths = localFiles.map(f => {
          const relativePath = path.relative(localDirPath, f);
          return path.posix.join(blobPrefix, relativePath.replace(/\\/g, '/'));
        });

        for (const remoteBlob of remoteBlobs) {
          if (!localBlobPaths.includes(remoteBlob.name)) {
            try {
              if (!options.dryRun) {
                await this.deleteBlob(remoteBlob.name);
              }
              
              result.deleted.push(remoteBlob.name);
              console.log(`🗑️ ${options.dryRun ? '[DRY RUN] ' : ''}Deleted orphaned: ${remoteBlob.name}`);
            } catch (error: any) {
              result.errors.push({ path: remoteBlob.name, error: error.message });
            }
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Sync operation failed:', error.message);
      throw error;
    }

    return result;
  }

  /**
   * Sync blob storage to directory
   * Blobストレージからディレクトリに同期
   */
  async syncBlobToDirectory(
    blobPrefix: string,
    localDirPath: string,
    options: {
      overwrite?: boolean;
      deleteOrphaned?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    downloaded: string[];
    deleted: string[];
    skipped: string[];
    errors: Array<{ path: string; error: string }>;
  }> {
    const result = {
      downloaded: [] as string[],
      deleted: [] as string[],
      skipped: [] as string[],
      errors: [] as Array<{ path: string; error: string }>,
    };

    try {
      // Get remote blobs
      const { blobs: remoteBlobs } = await this.listBlobs(blobPrefix);
      
      console.log(`🔄 Syncing ${remoteBlobs.length} remote blobs to ${localDirPath}`);
      
      if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
      }

      // Download remote blobs
      for (const remoteBlob of remoteBlobs) {
        try {
          const relativePath = remoteBlob.name.startsWith(blobPrefix) 
            ? remoteBlob.name.substring(blobPrefix.length).replace(/^\//, '')
            : remoteBlob.name;
          
          const localFilePath = path.join(localDirPath, relativePath.replace(/\//g, path.sep));
          
          // Check if local file exists
          const localExists = await fs.access(localFilePath).then(() => true).catch(() => false);
          
          if (localExists && !options.overwrite) {
            result.skipped.push(localFilePath);
            console.log(`⏭️ Skipped (exists): ${localFilePath}`);
            continue;
          }
          
          if (!options.dryRun) {
            await this.downloadFile(remoteBlob.name, localFilePath, { createLocalPath: true });
          }
          
          result.downloaded.push(localFilePath);
          console.log(`📥 ${options.dryRun ? '[DRY RUN] ' : ''}Downloaded: ${localFilePath}`);
        } catch (error: any) {
          result.errors.push({ path: remoteBlob.name, error: error.message });
        }
      }

      // Delete orphaned local files if requested
      if (options.deleteOrphaned) {
        const localFiles = await this.getLocalFiles(localDirPath);
        const remotePaths = remoteBlobs.map(b => {
          const relativePath = b.name.startsWith(blobPrefix) 
            ? b.name.substring(blobPrefix.length).replace(/^\//, '')
            : b.name;
          return path.join(localDirPath, relativePath.replace(/\//g, path.sep));
        });

        for (const localFile of localFiles) {
          if (!remotePaths.includes(localFile)) {
            try {
              if (!options.dryRun) {
                await fs.unlink(localFile);
              }
              
              result.deleted.push(localFile);
              console.log(`🗑️ ${options.dryRun ? '[DRY RUN] ' : ''}Deleted orphaned: ${localFile}`);
            } catch (error: any) {
              result.errors.push({ path: localFile, error: error.message });
            }
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Sync operation failed:', error.message);
      throw error;
    }

    return result;
  }

  /**
   * Get content type from file extension
   * ファイル拡張子からコンテンツタイプを取得
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get local files recursively
   * ローカルファイルを再帰的に取得
   */
  private async getLocalFiles(
    dirPath: string, 
    includePattern?: RegExp, 
    excludePattern?: RegExp
  ): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          // Apply filters
          if (includePattern && !includePattern.test(fullPath)) {
            continue;
          }
          
          if (excludePattern && excludePattern.test(fullPath)) {
            continue;
          }
          
          files.push(fullPath);
        }
      }
    }
    
    await traverse(dirPath);
    return files;
  }

  /**
   * Health check for storage service
   * ストレージサービスのヘルスチェック
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    containerExists: boolean;
    canWrite: boolean;
    canRead: boolean;
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};
    let containerExists = false;
    let canWrite = false;
    let canRead = false;
    
    try {
      // Check container existence
      containerExists = await this.containerClient.exists();
      details.containerExists = containerExists;
      
      if (!containerExists) {
        await this.ensureContainer();
        containerExists = true;
      }
      
      // Test write operation
      const testBlobName = `health-check-${Date.now()}.txt`;
      const testContent = 'Health check test content';
      
      try {
        const blockBlobClient = this.containerClient.getBlockBlobClient(testBlobName);
        await blockBlobClient.upload(testContent, testContent.length);
        canWrite = true;
        details.writeTest = 'success';
        
        // Test read operation
        const downloadResponse = await blockBlobClient.download();
        if (downloadResponse.readableStreamBody) {
          canRead = true;
          details.readTest = 'success';
        }
        
        // Cleanup test blob
        await blockBlobClient.delete();
        details.cleanup = 'success';
        
      } catch (error: any) {
        details.writeTest = error.message;
        details.readTest = canWrite ? 'skipped due to write failure' : 'not attempted';
      }
      
    } catch (error: any) {
      details.error = error.message;
    }
    
    const status = containerExists && canWrite && canRead ? 'healthy' : 'unhealthy';
    
    return {
      status,
      containerExists,
      canWrite,
      canRead,
      details,
    };
  }
}

// Factory function for easy initialization
export function createEnhancedStorageService(config: StorageConfig): EnhancedAzureStorageService {
  return new EnhancedAzureStorageService(config);
}

// Default export
export default EnhancedAzureStorageService;
