
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ログファイルの場所を定義
const LOG_DIRECTORIES = [
  path.join(process.cwd(), 'logs'),
  path.join(__dirname, '../logs'),
  path.join(process.cwd(), 'server/logs'),
  path.join(process.cwd(), '.replit/logs'),
];

// 削除対象のログファイルパターン
const LOG_PATTERNS = [
  /\.log$/,
  /error\.txt$/,
  /deployment.*\.log$/,
  /build.*\.log$/,
  /npm-debug\.log$/,
  /yarn-error\.log$/,
];

/**
 * ログファイルを削除する関数
 */
function cleanupLogFiles() {
  let deletedCount = 0;
  let totalSize = 0;

  console.log('デプロイエラーログのクリーンアップを開始します...');

  for (const logDir of LOG_DIRECTORIES) {
    if (!fs.existsSync(logDir)) {
      console.log(`ログディレクトリが存在しません: ${logDir}`);
      continue;
    }

    try {
      const files = fs.readdirSync(logDir);
      
      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stat = fs.statSync(filePath);

        // ディレクトリの場合はスキップ
        if (stat.isDirectory()) continue;

        // ログファイルパターンに一致するかチェック
        const isLogFile = LOG_PATTERNS.some(pattern => pattern.test(file));
        
        if (isLogFile) {
          try {
            totalSize += stat.size;
            fs.unlinkSync(filePath);
            console.log(`削除しました: ${filePath} (${(stat.size / 1024).toFixed(2)} KB)`);
            deletedCount++;
          } catch (error) {
            console.error(`ファイル削除エラー: ${filePath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`ディレクトリ読み取りエラー: ${logDir}`, error);
    }
  }

  console.log(`\nクリーンアップ完了:`);
  console.log(`- 削除されたファイル数: ${deletedCount}`);
  console.log(`- 削除されたデータ量: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  return { deletedCount, totalSize };
}

/**
 * 古いログファイルのみを削除する関数（指定日数より古いもの）
 */
function cleanupOldLogs(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let deletedCount = 0;
  
  console.log(`${daysOld}日以上古いログファイルを削除します...`);

  for (const logDir of LOG_DIRECTORIES) {
    if (!fs.existsSync(logDir)) continue;

    try {
      const files = fs.readdirSync(logDir);
      
      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) continue;

        const isLogFile = LOG_PATTERNS.some(pattern => pattern.test(file));
        
        if (isLogFile && stat.mtime < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            console.log(`古いログファイルを削除: ${filePath}`);
            deletedCount++;
          } catch (error) {
            console.error(`ファイル削除エラー: ${filePath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`ディレクトリ読み取りエラー: ${logDir}`, error);
    }
  }

  console.log(`古いログファイル ${deletedCount}件を削除しました`);
  return deletedCount;
}

// スクリプトが直接実行された場合
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  
  if (command === 'old') {
    const days = parseInt(process.argv[3]) || 7;
    cleanupOldLogs(days);
  } else {
    cleanupLogFiles();
  }
}

export { cleanupLogFiles, cleanupOldLogs };
