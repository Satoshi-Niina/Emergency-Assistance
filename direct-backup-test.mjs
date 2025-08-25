import { BackupManager } from './server/lib/backup-manager.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('ｧｪ BackupManager縺ｮ逶ｴ謗･繝・せ繝磯幕蟋・);
console.log('迴ｾ蝨ｨ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ:', __dirname);

// BackupManager繧貞・譛溷喧
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('繝舌ャ繧ｯ繧｢繝・・繝槭ロ繝ｼ繧ｸ繝｣繝ｼ險ｭ螳・', backupManager.getConfig());

// 繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', '繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺Юc08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('繝・せ繝亥ｯｾ雎｡繝輔ぃ繧､繝ｫ:', targetFile);
console.log('繝輔ぃ繧､繝ｫ蟄伜惠遒ｺ隱・', fs.existsSync(targetFile));

if (fs.existsSync(targetFile)) {
  const stats = fs.statSync(targetFile);
  console.log('繝輔ぃ繧､繝ｫ諠・ｱ:', {
    size: stats.size,
    modified: stats.mtime
  });
}

try {
  console.log('売 繝舌ャ繧ｯ繧｢繝・・菴懈・隧ｦ陦・..');
  const backupPath = backupManager.createBackup(targetFile);
  console.log('笨・繝舌ャ繧ｯ繧｢繝・・謌仙粥:', backupPath);
  
  // 繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝縺ｮ遒ｺ隱・
  const backupDir = path.join(__dirname, 'knowledge-base', 'backups');
  console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ:', backupDir);
  
  if (fs.existsSync(backupDir)) {
    console.log('搭 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ蜀・ｮｹ:');
    const files = fs.readdirSync(backupDir, { recursive: true });
    files.forEach(file => console.log('  -', file));
  } else {
    console.log('笶・繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ');
  }
  
} catch (error) {
  console.error('笶・繝舌ャ繧ｯ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error.message);
  console.error('繧ｹ繧ｿ繝・け:', error.stack);
}
