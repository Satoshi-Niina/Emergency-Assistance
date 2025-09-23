import { azureStorage } from './azure-storage.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class KnowledgeBaseAzureService {
  private localKnowledgeBasePath: string;
  private remotePrefix: string;

  constructor() {
    this.localKnowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    this.remotePrefix = 'knowledge-base';
  }

  // Azure StorageからKnowledge Baseを同期
  async syncFromAzure(): Promise<void> {
    try {
      console.log('🔄 Syncing knowledge base from Azure Storage...');

      // Azure Storageからダウンロード
      await azureStorage.downloadDirectory(
        this.remotePrefix,
        this.localKnowledgeBasePath
      );

      console.log('✅ Knowledge base synced from Azure Storage');
    } catch (error) {
      console.error('❌ Failed to sync knowledge base from Azure:', error);
      throw error;
    }
  }

  // Knowledge BaseをAzure Storageに同期
  async syncToAzure(): Promise<void> {
    try {
      console.log('🔄 Syncing knowledge base to Azure Storage...');

      // ローカルディレクトリが存在するか確認
      if (!(await fs.pathExists(this.localKnowledgeBasePath))) {
        console.log('📁 Creating local knowledge base directory...');
        await fs.ensureDir(this.localKnowledgeBasePath);
      }

      // Azure Storageにアップロード
      await azureStorage.uploadDirectory(
        this.localKnowledgeBasePath,
        this.remotePrefix
      );

      console.log('✅ Knowledge base synced to Azure Storage');
    } catch (error) {
      console.error('❌ Failed to sync knowledge base to Azure:', error);
      throw error;
    }
  }

  // 特定のファイルをAzure Storageにアップロード
  async uploadFile(localFilePath: string): Promise<string> {
    try {
      const relativePath = path.relative(
        this.localKnowledgeBasePath,
        localFilePath
      );
      const blobName = `${this.remotePrefix}/${relativePath}`;

      const url = await azureStorage.uploadFile(localFilePath, blobName);
      console.log(`✅ File uploaded to Azure: ${relativePath}`);

      return url;
    } catch (error) {
      console.error(
        `❌ Failed to upload file to Azure: ${localFilePath}`,
        error
      );
      throw error;
    }
  }

  // 特定のファイルをAzure Storageからダウンロード
  async downloadFile(blobName: string): Promise<string> {
    try {
      const localFilePath = path.join(
        this.localKnowledgeBasePath,
        blobName.replace(`${this.remotePrefix}/`, '')
      );

      await azureStorage.downloadFile(blobName, localFilePath);
      console.log(`✅ File downloaded from Azure: ${blobName}`);

      return localFilePath;
    } catch (error) {
      console.error(
        `❌ Failed to download file from Azure: ${blobName}`,
        error
      );
      throw error;
    }
  }

  // ファイルの存在確認（Azure Storage）
  async fileExistsInAzure(relativePath: string): Promise<boolean> {
    const blobName = `${this.remotePrefix}/${relativePath}`;
    return await azureStorage.fileExists(blobName);
  }

  // ファイルのURLを取得（Azure Storage）
  getFileUrl(relativePath: string): string {
    const blobName = `${this.remotePrefix}/${relativePath}`;
    return azureStorage.getFileUrl(blobName);
  }

  // Knowledge Baseの初期化
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Knowledge Base Azure integration...');

      // Azure Storageコンテナを初期化
      await azureStorage.initializeContainer();

      // ローカルディレクトリを作成
      await fs.ensureDir(this.localKnowledgeBasePath);

      // Azure Storageから同期
      await this.syncFromAzure();

      console.log('✅ Knowledge Base Azure integration initialized');
    } catch (error) {
      console.error(
        '❌ Failed to initialize Knowledge Base Azure integration:',
        error
      );
      throw error;
    }
  }

  // バックアップを作成
  async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPrefix = `backups/${timestamp}`;

      console.log(`🔄 Creating backup: ${backupPrefix}`);

      await azureStorage.uploadDirectory(
        this.localKnowledgeBasePath,
        backupPrefix
      );

      console.log(`✅ Backup created: ${backupPrefix}`);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  // バックアップから復元
  async restoreFromBackup(backupPrefix: string): Promise<void> {
    try {
      console.log(`🔄 Restoring from backup: ${backupPrefix}`);

      // 現在のディレクトリをバックアップ
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentBackupPrefix = `backups/restore-${timestamp}`;
      await azureStorage.uploadDirectory(
        this.localKnowledgeBasePath,
        currentBackupPrefix
      );

      // バックアップから復元
      await azureStorage.downloadDirectory(
        backupPrefix,
        this.localKnowledgeBasePath
      );

      console.log(`✅ Restored from backup: ${backupPrefix}`);
    } catch (error) {
      console.error(`❌ Failed to restore from backup: ${backupPrefix}`, error);
      throw error;
    }
  }

  // バックアップ一覧を取得
  async listBackups(): Promise<string[]> {
    try {
      const files = await azureStorage.listFiles('backups/');
      const backups = new Set<string>();

      for (const file of files) {
        const parts = file.split('/');
        if (parts.length >= 2) {
          backups.add(parts[1]); // backups/[timestamp] の部分を取得
        }
      }

      return Array.from(backups).sort().reverse(); // 新しい順
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      throw error;
    }
  }

  // ファイル変更を監視して自動同期
  async watchAndSync(): Promise<void> {
    try {
      console.log('👀 Starting file watch for auto-sync...');

      // ファイル変更を監視（簡易版）
      const watcher = fs.watch(this.localKnowledgeBasePath, {
        recursive: true,
      });

      let syncTimeout: NodeJS.Timeout;

      watcher.on('change', (eventType, filename) => {
        if (
          filename &&
          !filename.includes('node_modules') &&
          !filename.includes('.git')
        ) {
          console.log(`📝 File changed: ${filename}`);

          // デバウンス処理（1秒後に同期）
          clearTimeout(syncTimeout);
          syncTimeout = setTimeout(async () => {
            try {
              await this.syncToAzure();
            } catch (error) {
              console.error('❌ Auto-sync failed:', error);
            }
          }, 1000);
        }
      });

      console.log('✅ File watch started');
    } catch (error) {
      console.error('❌ Failed to start file watch:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const knowledgeBaseAzure = new KnowledgeBaseAzureService();
