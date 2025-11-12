"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBaseAzure = exports.KnowledgeBaseAzureService = void 0;
const azure_storage_js_1 = require("./azure-storage.js");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const url_1 = require("url");
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
class KnowledgeBaseAzureService {
    constructor() {
        Object.defineProperty(this, "localKnowledgeBasePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remotePrefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.localKnowledgeBasePath = path.join(__dirname, '../../knowledge-base');
        this.remotePrefix = 'knowledge-base';
    }
    // Azure StorageからKnowledge Baseを同期
    async syncFromAzure() {
        try {
            console.log('🔄 Syncing knowledge base from Azure Storage...');
            // Azure Storageからダウンロード
            await azure_storage_js_1.azureStorage.downloadDirectory(this.remotePrefix, this.localKnowledgeBasePath);
            console.log('✅ Knowledge base synced from Azure Storage');
        }
        catch (error) {
            console.error('❌ Failed to sync knowledge base from Azure:', error);
            throw error;
        }
    }
    // Knowledge BaseをAzure Storageに同期
    async syncToAzure() {
        try {
            console.log('🔄 Syncing knowledge base to Azure Storage...');
            // ローカルディレクトリが存在するか確認
            if (!(await fs.pathExists(this.localKnowledgeBasePath))) {
                console.log('📁 Creating local knowledge base directory...');
                await fs.ensureDir(this.localKnowledgeBasePath);
            }
            // Azure Storageにアップロード
            await azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, this.remotePrefix);
            console.log('✅ Knowledge base synced to Azure Storage');
        }
        catch (error) {
            console.error('❌ Failed to sync knowledge base to Azure:', error);
            throw error;
        }
    }
    // 特定のファイルをAzure Storageにアップロード
    async uploadFile(localFilePath) {
        try {
            const relativePath = path.relative(this.localKnowledgeBasePath, localFilePath);
            const blobName = `${this.remotePrefix}/${relativePath}`;
            const url = await azure_storage_js_1.azureStorage.uploadFile(localFilePath, blobName);
            console.log(`✅ File uploaded to Azure: ${relativePath}`);
            return url;
        }
        catch (error) {
            console.error(`❌ Failed to upload file to Azure: ${localFilePath}`, error);
            throw error;
        }
    }
    // 特定のファイルをAzure Storageからダウンロード
    async downloadFile(blobName) {
        try {
            const localFilePath = path.join(this.localKnowledgeBasePath, blobName.replace(`${this.remotePrefix}/`, ''));
            await azure_storage_js_1.azureStorage.downloadFile(blobName, localFilePath);
            console.log(`✅ File downloaded from Azure: ${blobName}`);
            return localFilePath;
        }
        catch (error) {
            console.error(`❌ Failed to download file from Azure: ${blobName}`, error);
            throw error;
        }
    }
    // ファイルの存在確認（Azure Storage）
    async fileExistsInAzure(relativePath) {
        const blobName = `${this.remotePrefix}/${relativePath}`;
        return await azure_storage_js_1.azureStorage.fileExists(blobName);
    }
    // ファイルのURLを取得（Azure Storage）
    getFileUrl(relativePath) {
        const blobName = `${this.remotePrefix}/${relativePath}`;
        return azure_storage_js_1.azureStorage.getFileUrl(blobName);
    }
    // Knowledge Baseの初期化
    async initialize() {
        try {
            console.log('🚀 Initializing Knowledge Base Azure integration...');
            // Azure Storageコンテナを初期化
            await azure_storage_js_1.azureStorage.initializeContainer();
            // ローカルディレクトリを作成
            await fs.ensureDir(this.localKnowledgeBasePath);
            // Azure Storageから同期
            await this.syncFromAzure();
            console.log('✅ Knowledge Base Azure integration initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Knowledge Base Azure integration:', error);
            throw error;
        }
    }
    // バックアップを作成
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPrefix = `backups/${timestamp}`;
            console.log(`🔄 Creating backup: ${backupPrefix}`);
            await azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, backupPrefix);
            console.log(`✅ Backup created: ${backupPrefix}`);
        }
        catch (error) {
            console.error('❌ Failed to create backup:', error);
            throw error;
        }
    }
    // バックアップから復元
    async restoreFromBackup(backupPrefix) {
        try {
            console.log(`🔄 Restoring from backup: ${backupPrefix}`);
            // 現在のディレクトリをバックアップ
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackupPrefix = `backups/restore-${timestamp}`;
            await azure_storage_js_1.azureStorage.uploadDirectory(this.localKnowledgeBasePath, currentBackupPrefix);
            // バックアップから復元
            await azure_storage_js_1.azureStorage.downloadDirectory(backupPrefix, this.localKnowledgeBasePath);
            console.log(`✅ Restored from backup: ${backupPrefix}`);
        }
        catch (error) {
            console.error(`❌ Failed to restore from backup: ${backupPrefix}`, error);
            throw error;
        }
    }
    // バックアップ一覧を取得
    async listBackups() {
        try {
            const files = await azure_storage_js_1.azureStorage.listFiles('backups/');
            const backups = new Set();
            for (const file of files) {
                const parts = file.split('/');
                if (parts.length >= 2) {
                    backups.add(parts[1]); // backups/[timestamp] の部分を取得
                }
            }
            return Array.from(backups).sort().reverse(); // 新しい順
        }
        catch (error) {
            console.error('❌ Failed to list backups:', error);
            throw error;
        }
    }
    // ファイル変更を監視して自動同期
    async watchAndSync() {
        try {
            console.log('👀 Starting file watch for auto-sync...');
            // ファイル変更を監視（簡易版）
            const watcher = fs.watch(this.localKnowledgeBasePath, {
                recursive: true,
            });
            let syncTimeout;
            watcher.on('change', (eventType, filename) => {
                if (filename &&
                    !filename.includes('node_modules') &&
                    !filename.includes('.git')) {
                    console.log(`📝 File changed: ${filename}`);
                    // デバウンス処理（1秒後に同期）
                    clearTimeout(syncTimeout);
                    syncTimeout = setTimeout(async () => {
                        try {
                            await this.syncToAzure();
                        }
                        catch (error) {
                            console.error('❌ Auto-sync failed:', error);
                        }
                    }, 1000);
                }
            });
            console.log('✅ File watch started');
        }
        catch (error) {
            console.error('❌ Failed to start file watch:', error);
            throw error;
        }
    }
}
exports.KnowledgeBaseAzureService = KnowledgeBaseAzureService;
// シングルトンインスタンス
exports.knowledgeBaseAzure = new KnowledgeBaseAzureService();
