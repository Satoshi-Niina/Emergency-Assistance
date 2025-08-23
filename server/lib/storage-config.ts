import path from 'path';
import fs from 'fs/promises';
import { EnhancedAzureStorageService } from './azure-storage-enhanced.js';

/**
 * Storage configuration utility for production deployment
 * 本番デプロイメント用のストレージ設定ユーティリティ
 */

export interface StoragePathConfig {
  // Local paths
  knowledgeBasePath: string;
  tempPath: string;
  uploadsPath: string;
  
  // Azure Blob paths (prefixes)
  knowledgeBasePrefix: string;
  tempPrefix: string;
  uploadsPrefix: string;
  
  // Sync settings
  enableAutoSync: boolean;
  syncIntervalMs: number;
  maxRetries: number;
}

export interface AzureStorageConnectionConfig {
  accountName: string;
  accountKey?: string;
  connectionString?: string;
  containerName: string;
  useManagedIdentity?: boolean;
}

/**
 * Get storage configuration based on environment
 * 環境に応じたストレージ設定の取得
 */
export function getStorageConfig(): {
  paths: StoragePathConfig;
  azure: AzureStorageConnectionConfig;
  isProduction: boolean;
  isAzureEnabled: boolean;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  const isAzure = !!process.env.AZURE_STORAGE_ACCOUNT_NAME || !!process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  // Base path configuration
  const workspaceRoot = process.env.KNOWLEDGE_BASE_PATH || 
    (isProduction ? '/tmp' : path.resolve(process.cwd(), 'knowledge-base'));
  
  const paths: StoragePathConfig = {
    // Local paths - production uses /tmp, development uses project folder
    knowledgeBasePath: isProduction 
      ? '/tmp/knowledge-base'
      : path.resolve(workspaceRoot),
    tempPath: isProduction 
      ? '/tmp/emergency-temp'
      : path.resolve(workspaceRoot, '../temp'),
    uploadsPath: isProduction 
      ? '/tmp/emergency-uploads'
      : path.resolve(workspaceRoot, '../uploads'),
    
    // Azure Blob prefixes - consistent across environments
    knowledgeBasePrefix: 'knowledge-base',
    tempPrefix: 'temp',
    uploadsPrefix: 'uploads',
    
    // Sync settings - more aggressive in production
    enableAutoSync: isProduction,
    syncIntervalMs: isProduction ? 5 * 60 * 1000 : 30 * 60 * 1000, // 5min prod, 30min dev
    maxRetries: isProduction ? 5 : 3,
  };

  const azure: AzureStorageConnectionConfig = {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-assistance',
    useManagedIdentity: isProduction && !process.env.AZURE_STORAGE_ACCOUNT_KEY && !process.env.AZURE_STORAGE_CONNECTION_STRING,
  };

  return {
    paths,
    azure,
    isProduction,
    isAzureEnabled: isAzure,
  };
}

/**
 * Initialize storage directories
 * ストレージディレクトリの初期化
 */
export async function initializeStorageDirectories(config: StoragePathConfig): Promise<void> {
  const directories = [
    config.knowledgeBasePath,
    config.tempPath,
    config.uploadsPath,
    // Knowledge base subdirectories
    path.join(config.knowledgeBasePath, 'data'),
    path.join(config.knowledgeBasePath, 'images'),
    path.join(config.knowledgeBasePath, 'documents'),
    path.join(config.knowledgeBasePath, 'troubleshooting'),
    path.join(config.knowledgeBasePath, 'qa'),
    path.join(config.knowledgeBasePath, 'exports'),
    path.join(config.knowledgeBasePath, 'backups'),
    path.join(config.knowledgeBasePath, 'text'),
    path.join(config.knowledgeBasePath, 'json'),
    path.join(config.knowledgeBasePath, 'temp'),
  ];

  console.log('📁 Initializing storage directories...');
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Directory ready: ${dir}`);
    } catch (error: any) {
      console.error(`❌ Failed to create directory ${dir}:`, error.message);
      throw error;
    }
  }
  
  console.log('📁 All storage directories initialized');
}

/**
 * Create storage service instance with proper configuration
 * 適切な設定でストレージサービスインスタンスを作成
 */
export function createStorageService(): EnhancedAzureStorageService | null {
  const { azure, isAzureEnabled } = getStorageConfig();
  
  if (!isAzureEnabled) {
    console.log('ℹ️ Azure Storage not configured, using local storage only');
    return null;
  }

  if (!azure.accountName) {
    console.warn('⚠️ Azure Storage account name not provided');
    return null;
  }

  try {
    const storageConfig = {
      accountName: azure.accountName,
      accountKey: azure.accountKey,
      connectionString: azure.connectionString,
      containerName: azure.containerName,
      maxRetries: 3,
      retryDelayMs: 1000,
    };

    console.log('🔧 Initializing Azure Storage service:', {
      accountName: azure.accountName,
      containerName: azure.containerName,
      useManagedIdentity: azure.useManagedIdentity,
      hasConnectionString: !!azure.connectionString,
      hasAccountKey: !!azure.accountKey,
    });

    return new EnhancedAzureStorageService(storageConfig);
  } catch (error: any) {
    console.error('❌ Failed to initialize Azure Storage service:', error.message);
    return null;
  }
}

/**
 * Sync manager for automated synchronization
 * 自動同期のための同期マネージャー
 */
export class StorageSyncManager {
  private storageService: EnhancedAzureStorageService | null;
  private config: StoragePathConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(storageService: EnhancedAzureStorageService | null, config: StoragePathConfig) {
    this.storageService = storageService;
    this.config = config;
  }

  /**
   * Start automatic synchronization
   * 自動同期の開始
   */
  start(): void {
    if (!this.storageService || !this.config.enableAutoSync) {
      console.log('ℹ️ Auto-sync disabled or Azure Storage not available');
      return;
    }

    console.log(`🔄 Starting auto-sync (interval: ${this.config.syncIntervalMs}ms)`);
    
    // Initial sync
    this.performSync().catch(error => {
      console.error('❌ Initial sync failed:', error.message);
    });

    // Scheduled sync
    this.syncTimer = setInterval(() => {
      this.performSync().catch(error => {
        console.error('❌ Scheduled sync failed:', error.message);
      });
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop automatic synchronization
   * 自動同期の停止
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹️ Auto-sync stopped');
    }
  }

  /**
   * Perform manual synchronization
   * 手動同期の実行
   */
  async syncNow(): Promise<boolean> {
    return this.performSync();
  }

  /**
   * Internal sync implementation
   * 内部同期実装
   */
  private async performSync(): Promise<boolean> {
    if (!this.storageService || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting storage synchronization...');

      // Sync knowledge base to Azure
      const kbResult = await this.storageService.syncDirectoryToBlob(
        this.config.knowledgeBasePath,
        this.config.knowledgeBasePrefix,
        {
          deleteOrphaned: false, // Don't delete remote files automatically
          includePattern: /\.(json|txt|md|pdf|jpg|jpeg|png|gif)$/i,
          excludePattern: /\.(tmp|temp|log)$/i,
        }
      );

      console.log(`📤 Knowledge base sync: ${kbResult.uploaded.length} uploaded, ${kbResult.errors.length} errors`);

      // Sync uploads to Azure (if not empty)
      try {
        await fs.access(this.config.uploadsPath);
        const uploadsResult = await this.storageService.syncDirectoryToBlob(
          this.config.uploadsPath,
          this.config.uploadsPrefix,
          {
            deleteOrphaned: false,
            includePattern: /\.(pdf|doc|docx|txt|json|jpg|jpeg|png|gif)$/i,
          }
        );

        console.log(`📤 Uploads sync: ${uploadsResult.uploaded.length} uploaded, ${uploadsResult.errors.length} errors`);
      } catch {
        // Uploads directory doesn't exist yet, skip
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Sync completed in ${duration}ms`);
      
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Sync failed after ${duration}ms:`, error.message);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get sync status
   * 同期ステータスの取得
   */
  getStatus(): {
    isEnabled: boolean;
    isRunning: boolean;
    isSyncing: boolean;
    intervalMs: number;
  } {
    return {
      isEnabled: this.config.enableAutoSync && !!this.storageService,
      isRunning: !!this.syncTimer,
      isSyncing: this.isSyncing,
      intervalMs: this.config.syncIntervalMs,
    };
  }
}

/**
 * Helper function to get file size in human readable format
 * ファイルサイズを人間が読みやすい形式で取得
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Validate storage configuration
 * ストレージ設定の検証
 */
export function validateStorageConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { azure, isAzureEnabled } = getStorageConfig();

  if (isAzureEnabled) {
    if (!azure.accountName) {
      errors.push('Azure Storage account name is required');
    }

    if (!azure.connectionString && !azure.accountKey && !azure.useManagedIdentity) {
      errors.push('Azure Storage authentication method is required (connection string, account key, or managed identity)');
    }

    if (!azure.containerName) {
      warnings.push('Container name not specified, using default: emergency-assistance');
    }
  } else {
    warnings.push('Azure Storage not configured, local storage only');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  getStorageConfig,
  initializeStorageDirectories,
  createStorageService,
  StorageSyncManager,
  formatFileSize,
  validateStorageConfig,
};
