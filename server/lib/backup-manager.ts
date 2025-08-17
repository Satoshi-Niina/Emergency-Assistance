import * as fs from 'fs';
import * as path from 'path';

export interface BackupConfig {
  /** バックアップを保持する最大数 */
  maxBackups: number;
  /** バックアップフォルダのベースパス */
  backupBaseDir?: string;
  /** バックアップを無効にする */
  disabled?: boolean;
}

export class BackupManager {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      maxBackups: 3,
      backupBaseDir: 'backups',
      disabled: false,
      ...config
    };
  }

  /**
   * ファイルのバックアップを作成
   * @param targetFilePath バックアップ対象のファイルパス
   * @returns バックアップファイルのパス（バックアップが無効の場合はnull）
   */
  createBackup(targetFilePath: string): string | null {
    if (this.config.disabled) {
      console.log('💾 バックアップが無効化されています');
      return null;
    }

    if (!fs.existsSync(targetFilePath)) {
      throw new Error(`バックアップ対象ファイルが存在しません: ${targetFilePath}`);
    }

    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    // バックアップフォルダを作成
    const backupBaseDir = path.join(path.dirname(dir), this.config.backupBaseDir!);
    const backupSubDir = path.join(backupBaseDir, path.basename(dir));
    
    if (!fs.existsSync(backupBaseDir)) {
      fs.mkdirSync(backupBaseDir, { recursive: true });
    }
    if (!fs.existsSync(backupSubDir)) {
      fs.mkdirSync(backupSubDir, { recursive: true });
    }
    
    // バックアップファイル名とパス
    const timestamp = Date.now();
    const backupFileName = `${baseName}.backup.${timestamp}`;
    const backupPath = path.join(backupSubDir, backupFileName);
    
    try {
      // バックアップファイルを作成
      fs.copyFileSync(targetFilePath, backupPath);
      console.log('💾 バックアップ作成:', backupPath);
      
      // 古いバックアップを整理
      this.cleanupOldBackups(targetFilePath);
      
      return backupPath;
    } catch (error) {
      console.error('❌ バックアップ作成エラー:', error);
      throw error;
    }
  }

  /**
   * 古いバックアップファイルを削除
   * @param targetFilePath 元のファイルパス
   */
  private cleanupOldBackups(targetFilePath: string): void {
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    const backupBaseDir = path.join(path.dirname(dir), this.config.backupBaseDir!);
    const backupSubDir = path.join(backupBaseDir, path.basename(dir));
    
    if (!fs.existsSync(backupSubDir)) {
      return;
    }
    
    try {
      const files = fs.readdirSync(backupSubDir);
      
      // 該当ファイルのバックアップファイルを検索
      const backupFiles = files
        .filter(file => file.startsWith(baseName + '.backup.'))
        .map(file => ({
          name: file,
          path: path.join(backupSubDir, file),
          timestamp: parseInt(file.split('.backup.')[1]) || 0
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // 新しい順にソート
      
      // 古いバックアップファイルを削除
      const filesToDelete = backupFiles.slice(this.config.maxBackups);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log('🗑️ 古いバックアップを削除:', file.name);
        } catch (error) {
          console.warn('バックアップ削除エラー:', file.name, error);
        }
      });
    } catch (error) {
      console.warn('バックアップフォルダ管理エラー:', error);
    }
  }

  /**
   * 指定ファイルのバックアップ一覧を取得
   * @param targetFilePath 元のファイルパス
   * @returns バックアップファイル情報の配列
   */
  listBackups(targetFilePath: string): Array<{name: string; path: string; timestamp: number; date: Date}> {
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    const backupBaseDir = path.join(path.dirname(dir), this.config.backupBaseDir!);
    const backupSubDir = path.join(backupBaseDir, path.basename(dir));
    
    if (!fs.existsSync(backupSubDir)) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(backupSubDir);
      
      return files
        .filter(file => file.startsWith(baseName + '.backup.'))
        .map(file => {
          const timestamp = parseInt(file.split('.backup.')[1]) || 0;
          return {
            name: file,
            path: path.join(backupSubDir, file),
            timestamp,
            date: new Date(timestamp)
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // 新しい順にソート
    } catch (error) {
      console.warn('バックアップ一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * バックアップから復元
   * @param backupFilePath バックアップファイルのパス
   * @param targetFilePath 復元先のファイルパス
   */
  restoreFromBackup(backupFilePath: string, targetFilePath: string): void {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`バックアップファイルが存在しません: ${backupFilePath}`);
    }

    try {
      // 復元前に現在のファイルのバックアップを作成
      if (fs.existsSync(targetFilePath)) {
        this.createBackup(targetFilePath);
      }

      // バックアップから復元
      fs.copyFileSync(backupFilePath, targetFilePath);
      console.log('🔄 バックアップから復元完了:', targetFilePath);
    } catch (error) {
      console.error('❌ バックアップ復元エラー:', error);
      throw error;
    }
  }

  /**
   * 設定を更新
   * @param newConfig 新しい設定
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 現在の設定を取得
   * @returns 現在の設定
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }
}

// デフォルトのバックアップマネージャーインスタンス
export const defaultBackupManager = new BackupManager();
