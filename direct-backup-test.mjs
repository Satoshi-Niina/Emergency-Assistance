import { BackupManager } from './server/lib/backup-manager.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 BackupManagerの直接テスト開始');
console.log('現在のディレクトリ:', __dirname);

// BackupManagerを初期化
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('バックアップマネージャー設定:', backupManager.getConfig());

// テスト対象ファイル
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', 'エンジンがかからない_c08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('テスト対象ファイル:', targetFile);
console.log('ファイル存在確認:', fs.existsSync(targetFile));

if (fs.existsSync(targetFile)) {
  const stats = fs.statSync(targetFile);
  console.log('ファイル情報:', {
    size: stats.size,
    modified: stats.mtime
  });
}

try {
  console.log('🔄 バックアップ作成試行...');
  const backupPath = backupManager.createBackup(targetFile);
  console.log('✅ バックアップ成功:', backupPath);
  
  // バックアップフォルダの確認
  const backupDir = path.join(__dirname, 'knowledge-base', 'backups');
  console.log('📁 バックアップディレクトリ:', backupDir);
  
  if (fs.existsSync(backupDir)) {
    console.log('📋 バックアップディレクトリ内容:');
    const files = fs.readdirSync(backupDir, { recursive: true });
    files.forEach(file => console.log('  -', file));
  } else {
    console.log('❌ バックアップディレクトリが存在しません');
  }
  
} catch (error) {
  console.error('❌ バックアップエラー:', error.message);
  console.error('スタック:', error.stack);
}
