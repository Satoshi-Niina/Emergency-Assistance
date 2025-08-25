import path from 'path';
import fs from 'fs/promises';
import { EnhancedAzureStorageService } from './azure-storage-enhanced.js';

/**
 * Storage configuration utility for production deployment
 * 譛ｬ逡ｪ繝・・繝ｭ繧､繝｡繝ｳ繝育畑縺ｮ繧ｹ繝医Ξ繝ｼ繧ｸ險ｭ螳壹Θ繝ｼ繝・ぅ繝ｪ繝・ぅ
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
 * 迺ｰ蠅・↓蠢懊§縺溘せ繝医Ξ繝ｼ繧ｸ險ｭ螳壹・蜿門ｾ・
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
 * 繧ｹ繝医Ξ繝ｼ繧ｸ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蛻晄悄蛹・
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

  console.log('刀 Initializing storage directories...');
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`笨・Directory ready: ${dir}`);
    } catch (error: any) {
      console.error(`笶・Failed to create directory ${dir}:`, error.message);
      throw error;
    }
  }
  
  console.log('刀 All storage directories initialized');
}

/**
 * Create storage service instance with proper configuration
 * 驕ｩ蛻・↑險ｭ螳壹〒繧ｹ繝医Ξ繝ｼ繧ｸ繧ｵ繝ｼ繝薙せ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧剃ｽ懈・
 */
export function createStorageService(): EnhancedAzureStorageService | null {
  const { azure, isAzureEnabled } = getStorageConfig();
  
  if (!isAzureEnabled) {
    console.log('邃ｹ・・Azure Storage not configured, using local storage only');
    return null;
  }

  if (!azure.accountName) {
    console.warn('笞・・Azure Storage account name not provided');
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

    console.log('肌 Initializing Azure Storage service:', {
      accountName: azure.accountName,
      containerName: azure.containerName,
      useManagedIdentity: azure.useManagedIdentity,
      hasConnectionString: !!azure.connectionString,
      hasAccountKey: !!azure.accountKey,
    });

    return new EnhancedAzureStorageService(storageConfig);
  } catch (error: any) {
    console.error('笶・Failed to initialize Azure Storage service:', error.message);
    return null;
  }
}

/**
 * Sync manager for automated synchronization
 * 閾ｪ蜍募酔譛溘・縺溘ａ縺ｮ蜷梧悄繝槭ロ繝ｼ繧ｸ繝｣繝ｼ
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
   * 閾ｪ蜍募酔譛溘・髢句ｧ・
   */
  start(): void {
    if (!this.storageService || !this.config.enableAutoSync) {
      console.log('邃ｹ・・Auto-sync disabled or Azure Storage not available');
      return;
    }

    console.log(`売 Starting auto-sync (interval: ${this.config.syncIntervalMs}ms)`);
    
    // Initial sync
    this.performSync().catch(error => {
      console.error('笶・Initial sync failed:', error.message);
    });

    // Scheduled sync
    this.syncTimer = setInterval(() => {
      this.performSync().catch(error => {
        console.error('笶・Scheduled sync failed:', error.message);
      });
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop automatic synchronization
   * 閾ｪ蜍募酔譛溘・蛛懈ｭ｢
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('竢ｹ・・Auto-sync stopped');
    }
  }

  /**
   * Perform manual synchronization
   * 謇句虚蜷梧悄縺ｮ螳溯｡・
   */
  async syncNow(): Promise<boolean> {
    return this.performSync();
  }

  /**
   * Internal sync implementation
   * 蜀・Κ蜷梧悄螳溯｣・
   */
  private async performSync(): Promise<boolean> {
    if (!this.storageService || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('売 Starting storage synchronization...');

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

      console.log(`豆 Knowledge base sync: ${kbResult.uploaded.length} uploaded, ${kbResult.errors.length} errors`);

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

        console.log(`豆 Uploads sync: ${uploadsResult.uploaded.length} uploaded, ${uploadsResult.errors.length} errors`);
      } catch {
        // Uploads directory doesn't exist yet, skip
      }

      const duration = Date.now() - startTime;
      console.log(`笨・Sync completed in ${duration}ms`);
      
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`笶・Sync failed after ${duration}ms:`, error.message);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get sync status
   * 蜷梧悄繧ｹ繝・・繧ｿ繧ｹ縺ｮ蜿門ｾ・
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
 * 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繧剃ｺｺ髢薙′隱ｭ縺ｿ繧・☆縺・ｽ｢蠑上〒蜿門ｾ・
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
 * 繧ｹ繝医Ξ繝ｼ繧ｸ險ｭ螳壹・讀懆ｨｼ
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
