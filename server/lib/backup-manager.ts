import * as fs from 'fs';
import * as path from 'path';

export interface BackupConfig {
  /** 繝舌ャ繧ｯ繧｢繝・・繧剃ｿ晄戟縺吶ｋ譛螟ｧ謨ｰ */
  maxBackups: number;
  /** 繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝縺ｮ繝吶・繧ｹ繝代せ */
  backupBaseDir?: string;
  /** 繝舌ャ繧ｯ繧｢繝・・繧堤┌蜉ｹ縺ｫ縺吶ｋ */
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
    
    // 蛻晄悄蛹匁凾縺ｫ繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝繧剃ｽ懈・
    this.ensureBackupDirectoryExists();
  }

  /**
   * 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱阪＠縲√↑縺代ｌ縺ｰ菴懈・
   */
  private ensureBackupDirectoryExists(): void {
    try {
      // 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医ｒ蜿門ｾ・
      const projectRoot = this.findProjectRoot();
      console.log('剥 BackupManager蛻晄悄蛹・- 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝・', projectRoot);
      console.log('剥 BackupManager蛻晄悄蛹・- 髢句ｧ九ョ繧｣繝ｬ繧ｯ繝医Μ:', process.cwd());
      
      if (projectRoot) {
        // knowledge-base 繝輔か繝ｫ繝蜀・↓繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝繧剃ｽ懈・
        const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
        const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
        
        console.log('剥 BackupManager蛻晄悄蛹・- knowledge-base繝・ぅ繝ｬ繧ｯ繝医Μ:', knowledgeBaseDir);
        console.log('剥 BackupManager蛻晄悄蛹・- 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ:', backupBaseDir);
        
        if (!fs.existsSync(backupBaseDir)) {
          fs.mkdirSync(backupBaseDir, { recursive: true });
          console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝吶・繧ｹ繝輔か繝ｫ繝繧剃ｽ懈・:', backupBaseDir);
        } else {
          console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝吶・繧ｹ繝輔か繝ｫ繝縺ｯ譌｢縺ｫ蟄伜惠:', backupBaseDir);
        }
      } else {
        console.warn('笞・・繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ');
      }
    } catch (error) {
      console.warn('笞・・繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蛻晄悄蛹悶↓螟ｱ謨・', error);
    }
  }

  /**
   * 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医ョ繧｣繝ｬ繧ｯ繝医Μ繧呈爾縺・
   */
  private findProjectRoot(startDir?: string): string | null {
    let currentDir = startDir || process.cwd();
    console.log('剥 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝域､懃ｴ｢髢句ｧ・', currentDir);
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      console.log('剥 package.json讀懃ｴ｢:', packageJsonPath);
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          console.log('剥 package.json逋ｺ隕・', packageJsonPath, 'name:', packageJson.name);
          
          // 繝｡繧､繝ｳ縺ｮ繝励Ο繧ｸ繧ｧ繧ｯ繝・ackage.json繧定ｭ伜挨・・orkspaces縺後≠繧九°name縺梧Φ螳壹＆繧後ｋ繧ゅ・・・
          if (packageJson.workspaces || packageJson.name === 'emergency-assistance') {
            console.log('笨・繝｡繧､繝ｳ繝励Ο繧ｸ繧ｧ繧ｯ繝・ackage.json逋ｺ隕・', currentDir);
            return currentDir;
          }
        } catch (error) {
          // package.json縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繧ｹ繧ｭ繝・・
          console.warn('笞・・package.json隱ｭ縺ｿ霎ｼ縺ｿ螟ｱ謨・', packageJsonPath, error);
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    // 隕九▽縺九ｉ縺ｪ縺九▲縺溷ｴ蜷医・縲∵怙蛻昴↓隕九▽縺九▲縺殫ackage.json縺ｮ隕ｪ繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽｿ逕ｨ
    currentDir = startDir || process.cwd();
    console.log('剥 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ讀懃ｴ｢髢句ｧ・', currentDir);
    
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        console.log('笨・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺ｧpackage.json逋ｺ隕・', currentDir);
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    console.warn('笶・繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ');
    return null;
  }

  /**
   * 繝輔ぃ繧､繝ｫ縺ｮ繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・
   * @param targetFilePath 繝舌ャ繧ｯ繧｢繝・・蟇ｾ雎｡縺ｮ繝輔ぃ繧､繝ｫ繝代せ
   * @returns 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺ｮ繝代せ・医ヰ繝・け繧｢繝・・縺檎┌蜉ｹ縺ｮ蝣ｴ蜷医・null・・
   */
  createBackup(targetFilePath: string): string | null {
    console.log('売 繝舌ャ繧ｯ繧｢繝・・菴懈・髢句ｧ・', {
      targetFilePath,
      disabled: this.config.disabled,
      config: this.config
    });

    if (this.config.disabled) {
      console.log('沈 繝舌ャ繧ｯ繧｢繝・・縺檎┌蜉ｹ蛹悶＆繧後※縺・∪縺・);
      return null;
    }

    if (!fs.existsSync(targetFilePath)) {
      console.error(`笶・繝舌ャ繧ｯ繧｢繝・・蟇ｾ雎｡繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ: ${targetFilePath}`);
      throw new Error(`繝舌ャ繧ｯ繧｢繝・・蟇ｾ雎｡繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ: ${targetFilePath}`);
    }

    console.log('笨・繝舌ャ繧ｯ繧｢繝・・蟇ｾ雎｡繝輔ぃ繧､繝ｫ蟄伜惠遒ｺ隱肴ｸ医∩:', targetFilePath);
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    // 繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝繧剃ｽ懈・・・nowledge-base蜀・・backups繝輔か繝ｫ繝縺ｫ邨ｱ荳・・
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      throw new Error('繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ');
    }
    
    // knowledge-base 繝輔か繝ｫ繝蜀・↓繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝繧剃ｽ懈・
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
    
    // 蜈・ヵ繧｡繧､繝ｫ縺ｮ逶ｸ蟇ｾ繝代せ讒矩繧剃ｿ晄戟・・nowledge-base縺九ｉ縺ｮ逶ｸ蟇ｾ繝代せ・・
    const relativePath = path.relative(knowledgeBaseDir, dir);
    const backupSubDir = path.join(backupBaseDir, relativePath);
    
    if (!fs.existsSync(backupBaseDir)) {
      fs.mkdirSync(backupBaseDir, { recursive: true });
    }
    if (!fs.existsSync(backupSubDir)) {
      fs.mkdirSync(backupSubDir, { recursive: true });
    }
    
    // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ蜷阪→繝代せ
    const timestamp = Date.now();
    const backupFileName = `${baseName}.backup.${timestamp}`;
    const backupPath = path.join(backupSubDir, backupFileName);
    
    try {
      // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ繧剃ｽ懈・
      fs.copyFileSync(targetFilePath, backupPath);
      console.log('沈 繝舌ャ繧ｯ繧｢繝・・菴懈・:', backupPath);
      console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝讒矩:', {
        繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝・ projectRoot,
        蜈・ヵ繧｡繧､繝ｫ: targetFilePath,
        knowledge_base: knowledgeBaseDir,
        逶ｸ蟇ｾ繝代せ: relativePath,
        繝舌ャ繧ｯ繧｢繝・・蜈・ backupPath
      });
      
      // 蜿､縺・ヰ繝・け繧｢繝・・繧呈紛逅・
      this.cleanupOldBackups(targetFilePath);
      
      return backupPath;
    } catch (error) {
      console.error('笶・繝舌ャ繧ｯ繧｢繝・・菴懈・繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 蜿､縺・ヰ繝・け繧｢繝・・繝輔ぃ繧､繝ｫ繧貞炎髯､
   * @param targetFilePath 蜈・・繝輔ぃ繧､繝ｫ繝代せ
   */
  private cleanupOldBackups(targetFilePath: string): void {
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    // 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医ｒ蜿門ｾ・
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      console.warn('繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医′隕九▽縺九ｉ縺ｪ縺・◆繧√√ヰ繝・け繧｢繝・・繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧偵せ繧ｭ繝・・縺励∪縺・);
      return;
    }
    
    // knowledge-base 繝輔か繝ｫ繝蜀・・繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝
    const knowledgeBaseDir = path.join(projectRoot, 'knowledge-base');
    const backupBaseDir = path.join(knowledgeBaseDir, this.config.backupBaseDir!);
    const relativePath = path.relative(knowledgeBaseDir, dir);
    const backupSubDir = path.join(backupBaseDir, relativePath);
    
    if (!fs.existsSync(backupSubDir)) {
      return;
    }
    
    try {
      const files = fs.readdirSync(backupSubDir);
      
      // 隧ｲ蠖薙ヵ繧｡繧､繝ｫ縺ｮ繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
      const backupFiles = files
        .filter(file => file.startsWith(baseName + '.backup.'))
        .map(file => ({
          name: file,
          path: path.join(backupSubDir, file),
          timestamp: parseInt(file.split('.backup.')[1]) || 0
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // 譁ｰ縺励＞鬆・↓繧ｽ繝ｼ繝・
      
      // 蜿､縺・ヰ繝・け繧｢繝・・繝輔ぃ繧､繝ｫ繧貞炎髯､
      const filesToDelete = backupFiles.slice(this.config.maxBackups);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log('卵・・蜿､縺・ヰ繝・け繧｢繝・・繧貞炎髯､:', file.name);
        } catch (error) {
          console.warn('繝舌ャ繧ｯ繧｢繝・・蜑企勁繧ｨ繝ｩ繝ｼ:', file.name, error);
        }
      });
    } catch (error) {
      console.warn('繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝邂｡逅・お繝ｩ繝ｼ:', error);
    }
  }

  /**
   * 謖・ｮ壹ヵ繧｡繧､繝ｫ縺ｮ繝舌ャ繧ｯ繧｢繝・・荳隕ｧ繧貞叙蠕・
   * @param targetFilePath 蜈・・繝輔ぃ繧､繝ｫ繝代せ
   * @returns 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ諠・ｱ縺ｮ驟榊・
   */
  listBackups(targetFilePath: string): Array<{name: string; path: string; timestamp: number; date: Date}> {
    const dir = path.dirname(targetFilePath);
    const baseName = path.basename(targetFilePath);
    
    // 繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医ｒ蜿門ｾ・
    const projectRoot = this.findProjectRoot(dir);
    if (!projectRoot) {
      console.warn('繝励Ο繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医′隕九▽縺九ｉ縺ｪ縺・◆繧√√ヰ繝・け繧｢繝・・荳隕ｧ繧貞叙蠕励〒縺阪∪縺帙ｓ');
      return [];
    }
    
    // knowledge-base 繝輔か繝ｫ繝蜀・・繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝
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
        .sort((a, b) => b.timestamp - a.timestamp); // 譁ｰ縺励＞鬆・↓繧ｽ繝ｼ繝・
    } catch (error) {
      console.warn('繝舌ャ繧ｯ繧｢繝・・荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      return [];
    }
  }

  /**
   * 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
   * @param backupFilePath 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺ｮ繝代せ
   * @param targetFilePath 蠕ｩ蜈・・縺ｮ繝輔ぃ繧､繝ｫ繝代せ
   */
  restoreFromBackup(backupFilePath: string, targetFilePath: string): void {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ: ${backupFilePath}`);
    }

    try {
      // 蠕ｩ蜈・燕縺ｫ迴ｾ蝨ｨ縺ｮ繝輔ぃ繧､繝ｫ縺ｮ繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・
      if (fs.existsSync(targetFilePath)) {
        this.createBackup(targetFilePath);
      }

      // 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
      fs.copyFileSync(backupFilePath, targetFilePath);
      console.log('売 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・ｮ御ｺ・', targetFilePath);
    } catch (error) {
      console.error('笶・繝舌ャ繧ｯ繧｢繝・・蠕ｩ蜈・お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 險ｭ螳壹ｒ譖ｴ譁ｰ
   * @param newConfig 譁ｰ縺励＞險ｭ螳・
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 迴ｾ蝨ｨ縺ｮ險ｭ螳壹ｒ蜿門ｾ・
   * @returns 迴ｾ蝨ｨ縺ｮ險ｭ螳・
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }
}

// 繝・ヵ繧ｩ繝ｫ繝医・繝舌ャ繧ｯ繧｢繝・・繝槭ロ繝ｼ繧ｸ繝｣繝ｼ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const defaultBackupManager = new BackupManager();
