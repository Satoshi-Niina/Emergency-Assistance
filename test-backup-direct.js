const { BackupManager } = require('./server/lib/backup-manager.ts');
const path = require('path');

// TypeScript繝輔ぃ繧､繝ｫ繧貞ｮ溯｡悟庄閭ｽ縺ｫ縺吶ｋ縺溘ａ縺ｫ tsx 繧剃ｽｿ逕ｨ
const { execSync } = require('child_process');

// BackupManager繧堤峩謗･繝・せ繝医☆繧九◆繧√・繧ｹ繧ｯ繝ｪ繝励ヨ
const testBackupManagerJs = `
const { BackupManager } = require('./server/lib/backup-manager.ts');
const path = require('path');

// BackupManager繧貞・譛溷喧
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('繝舌ャ繧ｯ繧｢繝・・繝槭ロ繝ｼ繧ｸ繝｣繝ｼ險ｭ螳・', backupManager.config);

// 繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', '繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺Юc08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ:', targetFile);
console.log('繝輔ぃ繧､繝ｫ蟄伜惠遒ｺ隱・', require('fs').existsSync(targetFile));

try {
  const backupPath = backupManager.createBackup(targetFile);
  console.log('繝舌ャ繧ｯ繧｢繝・・謌仙粥:', backupPath);
} catch (error) {
  console.error('繝舌ャ繧ｯ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error.message);
  console.error('繧ｹ繧ｿ繝・け:', error.stack);
}
`;

// TypeScript繝輔ぃ繧､繝ｫ繧偵ユ繧ｹ繝医☆繧九◆繧√・JavaScript繝舌・繧ｸ繝ｧ繝ｳ繧貞ｮ溯｡・
try {
  execSync(`cd "${__dirname}" && node -e "${testBackupManagerJs.replace(/"/g, '\\"')}"`, { 
    stdio: 'inherit',
    encoding: 'utf8'
  });
} catch (error) {
  console.log('TypeScript繧堤峩謗･螳溯｡後＠縺ｦ繝・せ繝医＠縺ｾ縺・..');
  
  // tsx 繧剃ｽｿ逕ｨ縺励※TypeScript繧堤峩謗･螳溯｡・
  const testScript = `
import { BackupManager } from './server/lib/backup-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// BackupManager繧貞・譛溷喧
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('繝舌ャ繧ｯ繧｢繝・・繝槭ロ繝ｼ繧ｸ繝｣繝ｼ險ｭ螳・', backupManager);

// 繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', '繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺Юc08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ:', targetFile);

try {
  const backupPath = backupManager.createBackup(targetFile);
  console.log('繝舌ャ繧ｯ繧｢繝・・謌仙粥:', backupPath);
} catch (error) {
  console.error('繝舌ャ繧ｯ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error.message);
}
`;

  require('fs').writeFileSync('test-backup-temp.mjs', testScript);
  
  try {
    execSync('npx tsx test-backup-temp.mjs', { 
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (tsError) {
    console.error('TypeScript螳溯｡後お繝ｩ繝ｼ:', tsError.message);
  }
}
