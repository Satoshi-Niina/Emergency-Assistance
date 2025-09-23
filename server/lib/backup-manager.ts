import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import * as archiver from 'archiver';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BackupResult {
  backupPath: string;
  fileCount: number;
  totalSize: number;
  success: boolean;
  message: string;
}

interface BackupManagerOptions {
  projectRoot?: string;
  logsDir?: string;
  backupsDir?: string;
  maxBackups?: number;
  backupBaseDir?: string;
  disabled?: boolean;
}

export class BackupManager {
  private projectRoot: string;
  private logsDir: string;
  private backupsDir: string;

  constructor(options: BackupManagerOptions = {}) {
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../');
    this.logsDir = options.logsDir || path.join(this.projectRoot, 'logs');
    this.backupsDir = options.backupsDir || path.join(this.projectRoot, 'logs', 'backups');
  }

  /**
   * ログファイルをバックアップする
   */
  async createLogBackup(): Promise<BackupResult> {
    try {
      console.log('📦 ログファイルバックアップ処理開始');
    
      // バックアップディレクトリを作成
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
        console.log('📁 バックアップディレクトリを作成:', this.backupsDir);
      }
    
      // 現在の日時でファイル名を生成
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      
      // バックアップファイル名（当日なら差分で上書き）
      const backupFileName = `logs-backup-${dateStr}.zip`;
      const backupPath = path.join(this.backupsDir, backupFileName);
    
      console.log('📦 バックアップファイル:', backupPath);
      
      // ログディレクトリが存在するかチェック
      if (!fs.existsSync(this.logsDir)) {
        console.log('⚠️ ログディレクトリが存在しません:', this.logsDir);
        return {
          backupPath: '',
          fileCount: 0,
          totalSize: 0,
          success: false,
          message: 'ログディレクトリが存在しません'
        };
      }
      
      // ログファイルを取得
      const logFiles = await this.getLogFiles();
      console.log('📋 バックアップ対象ファイル:', logFiles.length, '件');
      
      if (logFiles.length === 0) {
        console.log('⚠️ バックアップ対象のログファイルがありません');
        return {
          backupPath: '',
          fileCount: 0,
          totalSize: 0,
          success: true,
          message: 'バックアップ対象のログファイルがありません'
        };
      }
      
      // ZIPファイルを作成
      const output = fs.createWriteStream(backupPath);
      const archive = archiver.default('zip', {
        zlib: { level: 9 } // 最高圧縮レベル
      });
      
      // エラーハンドリング
      archive.on('error', (err) => {
        throw err;
      });
      
      // プログレス表示
      archive.on('progress', (progress) => {
        console.log('📦 バックアップ進行状況:', Math.round(progress.entries.processed / progress.entries.total * 100) + '%');
      });
      
      // ストリームを接続
      await pipeline(archive, output);
      
      // ファイルをアーカイブに追加
      for (const file of logFiles) {
        const relativePath = path.relative(this.logsDir, file);
        archive.file(file, { name: relativePath });
      }
      
      // アーカイブを完了
      await archive.finalize();
      
      // ファイルサイズを計算
      const stats = fs.statSync(backupPath);
      const totalSize = stats.size;
      
      console.log('✅ ログファイルバックアップ完了:', {
        backupPath,
        fileCount: logFiles.length,
        totalSize: this.formatFileSize(totalSize)
      });
      
      return {
        backupPath: backupFileName,
        fileCount: logFiles.length,
        totalSize,
        success: true,
        message: `${logFiles.length}件のログファイルをバックアップしました`
      };
      
    } catch (error) {
      console.error('❌ ログファイルバックアップエラー:', error);
      throw error;
    }
  }

    /**
   * ログディレクトリからログファイルを取得
   */
  private async getLogFiles(): Promise<string[]> {
    const logFiles: string[] = [];
    
    try {
      const items = await fs.promises.readdir(this.logsDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(this.logsDir, item.name);
        
        if (item.isDirectory()) {
          // サブディレクトリも再帰的に検索
          const subFiles = await this.getLogFilesInDirectory(fullPath);
          logFiles.push(...subFiles);
        } else if (item.isFile()) {
          // ログファイルの拡張子をチェック
          const ext = path.extname(item.name).toLowerCase();
          if (['.log', '.txt', '.json', '.csv'].includes(ext)) {
            logFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error('❌ ログファイル取得エラー:', error);
    }
    
    return logFiles;
  }

  /**
   * 指定ディレクトリからログファイルを再帰的に取得
   */
  private async getLogFilesInDirectory(dirPath: string): Promise<string[]> {
    const logFiles: string[] = [];
    
    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.getLogFilesInDirectory(fullPath);
          logFiles.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (['.log', '.txt', '.json', '.csv'].includes(ext)) {
            logFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error('❌ ディレクトリ検索エラー:', dirPath, error);
    }
    
    return logFiles;
  }

  /**
   * ファイルサイズを人間が読みやすい形式に変換
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 古いバックアップファイルを削除（30日以上古いもの）
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      if (!fs.existsSync(this.backupsDir)) {
        return;
      }
      
      const files = await fs.promises.readdir(this.backupsDir);
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.backupsDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          await fs.promises.unlink(filePath);
          console.log('🗑️ 古いバックアップファイルを削除:', file);
        }
      }
    } catch (error) {
      console.error('❌ 古いバックアップファイル削除エラー:', error);
    }
  }

  /**
   * 特定のファイルのバックアップを作成する
   */
  async createBackup(targetFile: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${path.basename(targetFile)}-${timestamp}.zip`;
      const backupPath = path.join(this.backupsDir, backupFileName);

      // バックアップディレクトリを作成
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }

      // ファイルをコピー
      fs.copyFileSync(targetFile, backupPath);
      
      console.log('📦 ファイルバックアップ作成:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('❌ ファイルバックアップエラー:', error);
      throw error;
    }
  }

  /**
   * バックアップファイル一覧を取得する
   */
  listBackups(targetFile: string): string[] {
    try {
      if (!fs.existsSync(this.backupsDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupsDir);
      const backupFiles = files.filter(file => 
        file.includes(path.basename(targetFile)) && file.endsWith('.zip')
      );

      return backupFiles.map(file => path.join(this.backupsDir, file));
    } catch (error) {
      console.error('❌ バックアップ一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * バックアップから復元する
   */
  restoreFromBackup(backupPath: string, targetFile: string): void {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('バックアップファイルが見つかりません');
      }

      fs.copyFileSync(backupPath, targetFile);
      console.log('🔄 バックアップから復元完了:', targetFile);
    } catch (error) {
      console.error('❌ バックアップ復元エラー:', error);
      throw error;
    }
  }

  /**
   * 設定を取得する
   */
  getConfig(): BackupManagerOptions {
    return {
      projectRoot: this.projectRoot,
      logsDir: this.logsDir,
      backupsDir: this.backupsDir
    };
  }

  /**
   * 設定を更新する
   */
  updateConfig(newConfig: Partial<BackupManagerOptions>): void {
    if (newConfig.projectRoot) this.projectRoot = newConfig.projectRoot;
    if (newConfig.logsDir) this.logsDir = newConfig.logsDir;
    if (newConfig.backupsDir) this.backupsDir = newConfig.backupsDir;
  }
}

// 後方互換性のための関数エクスポート
export async function createBackup(): Promise<BackupResult> {
  const backupManager = new BackupManager();
  return await backupManager.createLogBackup();
}

export async function cleanupOldBackups(): Promise<void> {
  const backupManager = new BackupManager();
  return await backupManager.cleanupOldBackups();
}