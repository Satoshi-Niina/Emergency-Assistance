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
    
    // 初期化時にバックアップフォルダを作成
    this.ensureBackupDirectoryExists();
  }

  /**
   * バックアップディレクトリが存在することを確認し、なければ作成
   */
  private ensureBackupDirectoryExists(): void {
    try {
      // プロジェクトルートを取得
      const projectRoot = this.findProjectRoot();
      console.log('🔍 BackupManager初期化 - プロジェクトルート:', projectRoot);
      console.log('🔍 BackupManager初期化 - 開始ディレクトリ:', process.cwd());
      
      if (projectRoot) {
        // knowledge-base フォルダ内にバックアップフォルダを作成
        const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
        const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
        
        console.log('🔍 BackupManager初期化 - knowledge-baseディレクトリ:', knowledgeBaseDir);
        console.log('🔍 BackupManager初期化 - バックアップディレクトリ:', backupBaseDir);
        
        if (!fs.existsSync(backupBaseDir)) {
          fs.mkdirSync(backupBaseDir, { recursive: true });
          console.log('📁 バックアップベースフォルダを作成:', backupBaseDir);
        } else {
          console.log('📁 バックアップベースフォルダは既に存在:', backupBaseDir);
        }
      } else {
        console.warn('⚠️ プロジェクトルートが見つかりません');
      }
    } catch (error) {
      console.warn('⚠️ バックアップディレクトリの初期化に失敗:', error);
    }
  }

  /**
   * プロジェクトルートディレクトリを探す
   */
  private findProjectRoot(startDir?: string): string | null {
    let currentDir = startDir || process.cwd();
    console.log('🔍 プロジェクトルート検索開始:', currentDir);
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      console.log('🔍 package.json検索:', packageJsonPath);
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          console.log('🔍 package.json発見:', packageJsonPath, 'name:', packageJson.name);
          
          // メインのプロジェクトpackage.jsonを識別（workspacesがあるかnameが想定されるもの）
          if (packageJson.workspaces || packageJson.name === 'emergency-assistance') {
            console.log('✅ メインプロジェクトpackage.json発見:', currentDir);
            return currentDir;
          }
        } catch (error) {
          // package.jsonの読み込みに失敗した場合はスキップ
          console.warn('⚠️ package.json読み込み失敗:', packageJsonPath, error);
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    // 見つからなかった場合は、最初に見つかったpackage.jsonの親ディレクトリを使用
    currentDir = startDir || process.cwd();
    console.log('🔍 フォールバック検索開始:', currentDir);
    
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        console.log('✅ フォールバックでpackage.json発見:', currentDir);
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    console.warn('❌ プロジェクトルートが見つかりません');
    return null;
  }

  /**
   * ファイルのバックアップを作成
   * @param targetFilePath バックアップ対象のファイルパス
   * @returns バックアップファイルのパス（バックアップが無効の場合はnull）
   */
  createBackup(targetFilePath: string): string | null {
    console.log('🔄 バックアップ作成開始:', {
      targetFilePath,
      disabled: this.config.disabled,
      config: this.config
    });

    if (this.config.disabled) {
      console.log('💾 バックアップが無効化されています');
      return null;
    }

    if (!fs.existsSync(targetFilePath)) {
      console.error(`❌ バックアップ対象ファイルが存在しません: ${targetFilePath}`);
      throw new Error(`バックアップ対象ファイルが存在しません: ${targetFilePath}`);
    }

    console.log('✅ バックアップ対象ファイル存在確認済み:', targetFilePath);
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    // バックアップフォルダを作成（knowledge-base内のbackupsフォルダに統一）
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      throw new Error('プロジェクトルートが見つかりません');
    }
    
    // knowledge-base フォルダ内にバックアップフォルダを作成
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
    
    // 元ファイルの相対パス構造を保持（knowledge-baseからの相対パス）
    const relativePath = path.relative(knowledgeBaseDir, dir);
    const backupSubDir = path.join(backupBaseDir, relativePath);
    
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
      console.log('📁 バックアップフォルダ構造:', {
        プロジェクトルート: projectRoot,
        元ファイル: targetFilePath,
        knowledge_base: knowledgeBaseDir,
        相対パス: relativePath,
        バックアップ先: backupPath
      });
      
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
    
    // プロジェクトルートを取得
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      console.warn('プロジェクトルートが見つからないため、バックアップクリーンアップをスキップします');
      return;
    }
    
    // knowledge-base フォルダ内のバックアップフォルダ
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
    const relativePath = path.relative(knowledgeBaseDir, dir);
    const backupSubDir = path.join(backupBaseDir, relativePath);
    
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
    
    // プロジェクトルートを取得
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      console.warn('プロジェクトルートが見つからないため、バックアップ一覧を取得できません');
      return [];
    }
    
    // knowledge-base フォルダ内のバックアップフォルダ
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
    const relativePath = path.relative(knowledgeBaseDir, dir);
    const backupSubDir = path.join(backupBaseDir, relativePath);
    
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
