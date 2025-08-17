const { BackupManager } = require('./server/lib/backup-manager.ts');
const path = require('path');

// TypeScriptファイルを実行可能にするために tsx を使用
const { execSync } = require('child_process');

// BackupManagerを直接テストするためのスクリプト
const testBackupManagerJs = `
const { BackupManager } = require('./server/lib/backup-manager.ts');
const path = require('path');

// BackupManagerを初期化
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('バックアップマネージャー設定:', backupManager.config);

// テスト対象ファイル
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', 'エンジンがかからない_c08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('テスト対象ファイル:', targetFile);
console.log('ファイル存在確認:', require('fs').existsSync(targetFile));

try {
  const backupPath = backupManager.createBackup(targetFile);
  console.log('バックアップ成功:', backupPath);
} catch (error) {
  console.error('バックアップエラー:', error.message);
  console.error('スタック:', error.stack);
}
`;

// TypeScriptファイルをテストするためのJavaScriptバージョンを実行
try {
  execSync(`cd "${__dirname}" && node -e "${testBackupManagerJs.replace(/"/g, '\\"')}"`, { 
    stdio: 'inherit',
    encoding: 'utf8'
  });
} catch (error) {
  console.log('TypeScriptを直接実行してテストします...');
  
  // tsx を使用してTypeScriptを直接実行
  const testScript = `
import { BackupManager } from './server/lib/backup-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// BackupManagerを初期化
const backupManager = new BackupManager({
  maxBackups: 3,
  backupBaseDir: 'backups',
  disabled: false
});

console.log('バックアップマネージャー設定:', backupManager);

// テスト対象ファイル
const targetFile = path.join(__dirname, 'knowledge-base', 'exports', 'エンジンがかからない_c08a0c61-d13e-4229-8d03-3549ebd0d7a1_2025-08-08T07-44-49-387Z.json');

console.log('テスト対象ファイル:', targetFile);

try {
  const backupPath = backupManager.createBackup(targetFile);
  console.log('バックアップ成功:', backupPath);
} catch (error) {
  console.error('バックアップエラー:', error.message);
}
`;

  require('fs').writeFileSync('test-backup-temp.mjs', testScript);
  
  try {
    execSync('npx tsx test-backup-temp.mjs', { 
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (tsError) {
    console.error('TypeScript実行エラー:', tsError.message);
  }
}
