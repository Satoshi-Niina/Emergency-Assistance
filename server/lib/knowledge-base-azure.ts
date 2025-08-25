import { azureStorage } from './azure-storage.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class KnowledgeBaseAzureService {
  private localKnowledgeBasePath: string;
  private remotePrefix: string;

  constructor() {
    this.localKnowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    this.remotePrefix = 'knowledge-base';
  }

  // Azure Storage縺九ｉKnowledge Base繧貞酔譛・
  async syncFromAzure(): Promise<void> {
    try {
      console.log('売 Syncing knowledge base from Azure Storage...');
      
      // Azure Storage縺九ｉ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
      await azureStorage.downloadDirectory(this.remotePrefix, this.localKnowledgeBasePath);
      
      console.log('笨・Knowledge base synced from Azure Storage');
    } catch (error) {
      console.error('笶・Failed to sync knowledge base from Azure:', error);
      throw error;
    }
  }

  // Knowledge Base繧但zure Storage縺ｫ蜷梧悄
  async syncToAzure(): Promise<void> {
    try {
      console.log('売 Syncing knowledge base to Azure Storage...');
      
      // 繝ｭ繝ｼ繧ｫ繝ｫ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
      if (!await fs.pathExists(this.localKnowledgeBasePath)) {
        console.log('刀 Creating local knowledge base directory...');
        await fs.ensureDir(this.localKnowledgeBasePath);
      }
      
      // Azure Storage縺ｫ繧｢繝・・繝ｭ繝ｼ繝・
      await azureStorage.uploadDirectory(this.localKnowledgeBasePath, this.remotePrefix);
      
      console.log('笨・Knowledge base synced to Azure Storage');
    } catch (error) {
      console.error('笶・Failed to sync knowledge base to Azure:', error);
      throw error;
    }
  }

  // 迚ｹ螳壹・繝輔ぃ繧､繝ｫ繧但zure Storage縺ｫ繧｢繝・・繝ｭ繝ｼ繝・
  async uploadFile(localFilePath: string): Promise<string> {
    try {
      const relativePath = path.relative(this.localKnowledgeBasePath, localFilePath);
      const blobName = `${this.remotePrefix}/${relativePath}`;
      
      const url = await azureStorage.uploadFile(localFilePath, blobName);
      console.log(`笨・File uploaded to Azure: ${relativePath}`);
      
      return url;
    } catch (error) {
      console.error(`笶・Failed to upload file to Azure: ${localFilePath}`, error);
      throw error;
    }
  }

  // 迚ｹ螳壹・繝輔ぃ繧､繝ｫ繧但zure Storage縺九ｉ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
  async downloadFile(blobName: string): Promise<string> {
    try {
      const localFilePath = path.join(this.localKnowledgeBasePath, blobName.replace(`${this.remotePrefix}/`, ''));
      
      await azureStorage.downloadFile(blobName, localFilePath);
      console.log(`笨・File downloaded from Azure: ${blobName}`);
      
      return localFilePath;
    } catch (error) {
      console.error(`笶・Failed to download file from Azure: ${blobName}`, error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱搾ｼ・zure Storage・・
  async fileExistsInAzure(relativePath: string): Promise<boolean> {
    const blobName = `${this.remotePrefix}/${relativePath}`;
    return await azureStorage.fileExists(blobName);
  }

  // 繝輔ぃ繧､繝ｫ縺ｮURL繧貞叙蠕暦ｼ・zure Storage・・
  getFileUrl(relativePath: string): string {
    const blobName = `${this.remotePrefix}/${relativePath}`;
    return azureStorage.getFileUrl(blobName);
  }

  // Knowledge Base縺ｮ蛻晄悄蛹・
  async initialize(): Promise<void> {
    try {
      console.log('噫 Initializing Knowledge Base Azure integration...');
      
      // Azure Storage繧ｳ繝ｳ繝・リ繧貞・譛溷喧
      await azureStorage.initializeContainer();
      
      // 繝ｭ繝ｼ繧ｫ繝ｫ繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
      await fs.ensureDir(this.localKnowledgeBasePath);
      
      // Azure Storage縺九ｉ蜷梧悄
      await this.syncFromAzure();
      
      console.log('笨・Knowledge Base Azure integration initialized');
    } catch (error) {
      console.error('笶・Failed to initialize Knowledge Base Azure integration:', error);
      throw error;
    }
  }

  // 繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・
  async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPrefix = `backups/${timestamp}`;
      
      console.log(`売 Creating backup: ${backupPrefix}`);
      
      await azureStorage.uploadDirectory(this.localKnowledgeBasePath, backupPrefix);
      
      console.log(`笨・Backup created: ${backupPrefix}`);
    } catch (error) {
      console.error('笶・Failed to create backup:', error);
      throw error;
    }
  }

  // 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
  async restoreFromBackup(backupPrefix: string): Promise<void> {
    try {
      console.log(`売 Restoring from backup: ${backupPrefix}`);
      
      // 迴ｾ蝨ｨ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ繧偵ヰ繝・け繧｢繝・・
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentBackupPrefix = `backups/restore-${timestamp}`;
      await azureStorage.uploadDirectory(this.localKnowledgeBasePath, currentBackupPrefix);
      
      // 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
      await azureStorage.downloadDirectory(backupPrefix, this.localKnowledgeBasePath);
      
      console.log(`笨・Restored from backup: ${backupPrefix}`);
    } catch (error) {
      console.error(`笶・Failed to restore from backup: ${backupPrefix}`, error);
      throw error;
    }
  }

  // 繝舌ャ繧ｯ繧｢繝・・荳隕ｧ繧貞叙蠕・
  async listBackups(): Promise<string[]> {
    try {
      const files = await azureStorage.listFiles('backups/');
      const backups = new Set<string>();
      
      for (const file of files) {
        const parts = file.split('/');
        if (parts.length >= 2) {
          backups.add(parts[1]); // backups/[timestamp] 縺ｮ驛ｨ蛻・ｒ蜿門ｾ・
        }
      }
      
      return Array.from(backups).sort().reverse(); // 譁ｰ縺励＞鬆・
    } catch (error) {
      console.error('笶・Failed to list backups:', error);
      throw error;
    }
  }

  // 繝輔ぃ繧､繝ｫ螟画峩繧堤屮隕悶＠縺ｦ閾ｪ蜍募酔譛・
  async watchAndSync(): Promise<void> {
    try {
      console.log('操 Starting file watch for auto-sync...');
      
      // 繝輔ぃ繧､繝ｫ螟画峩繧堤屮隕厄ｼ育ｰ｡譏鍋沿・・
      const watcher = fs.watch(this.localKnowledgeBasePath, { recursive: true });
      
      let syncTimeout: NodeJS.Timeout;
      
      watcher.on('change', (eventType, filename) => {
        if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
          console.log(`統 File changed: ${filename}`);
          
          // 繝・ヰ繧ｦ繝ｳ繧ｹ蜃ｦ逅・ｼ・遘貞ｾ後↓蜷梧悄・・
          clearTimeout(syncTimeout);
          syncTimeout = setTimeout(async () => {
            try {
              await this.syncToAzure();
            } catch (error) {
              console.error('笶・Auto-sync failed:', error);
            }
          }, 1000);
        }
      });
      
      console.log('笨・File watch started');
    } catch (error) {
      console.error('笶・Failed to start file watch:', error);
      throw error;
    }
  }
}

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const knowledgeBaseAzure = new KnowledgeBaseAzureService(); 