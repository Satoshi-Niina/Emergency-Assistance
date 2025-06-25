const fs = require('fs');
const path = require('path');

// トラブルシューティングディレクトリのパス
const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

console.log('🧹 不要ファイルの削除を開始します...');

// ディレクトリが存在するか確認
if (!fs.existsSync(troubleshootingDir)) {
  console.error('❌ troubleshootingディレクトリが見つかりません:', troubleshootingDir);
  process.exit(1);
}

// 削除対象のファイルパターン
const deletePatterns = [
  /\.backup\.\d+$/,           // バックアップファイル
  /\.merged\.\d+$/,           // 統合時のバックアップファイル
  /\.tmp$/,                   // 一時ファイル
  /\.deleted\.\d+$/,          // 削除時のバックアップファイル
  /\.old$/,                   // 古いファイル
  /\.bak$/                    // バックアップファイル
];

// 保持するファイル（実際のフローファイル）
const keepFiles = [
  'ac4a935e-6f9e-40e3-aed3-a100ef154900.json',  // 統合されたブレーキ圧フロー
  'engine_stop_procedure.json'                   // エンジン停止手順
];

// ファイル一覧を取得
const allFiles = fs.readdirSync(troubleshootingDir);
console.log(`📁 全ファイル数: ${allFiles.length}`);

let deletedCount = 0;
let keptCount = 0;

allFiles.forEach(fileName => {
  const filePath = path.join(troubleshootingDir, fileName);
  const stats = fs.statSync(filePath);
  
  // ディレクトリはスキップ
  if (stats.isDirectory()) {
    console.log(`📁 ディレクトリをスキップ: ${fileName}`);
    return;
  }
  
  // 保持するファイルかチェック
  if (keepFiles.includes(fileName)) {
    console.log(`✅ 保持: ${fileName}`);
    keptCount++;
    return;
  }
  
  // 削除パターンにマッチするかチェック
  const shouldDelete = deletePatterns.some(pattern => pattern.test(fileName));
  
  if (shouldDelete) {
    try {
      // 削除前に最終確認
      const fileSize = (stats.size / 1024).toFixed(2);
      console.log(`🗑️ 削除: ${fileName} (${fileSize}KB)`);
      
      fs.unlinkSync(filePath);
      deletedCount++;
    } catch (error) {
      console.error(`❌ 削除エラー: ${fileName}`, error.message);
    }
  } else {
    console.log(`❓ 不明なファイル: ${fileName} (手動確認が必要)`);
  }
});

console.log(`\n✅ クリーンアップ完了:`);
console.log(`   - 保持されたファイル: ${keptCount}件`);
console.log(`   - 削除されたファイル: ${deletedCount}件`);

// 最終的なファイル一覧を表示
console.log('\n📋 最終ファイル一覧:');
const finalFiles = fs.readdirSync(troubleshootingDir).sort();
finalFiles.forEach(fileName => {
  const filePath = path.join(troubleshootingDir, fileName);
  const stats = fs.statSync(filePath);
  const fileSize = (stats.size / 1024).toFixed(2);
  console.log(`   - ${fileName} (${fileSize}KB)`);
});

console.log('\n🎉 不要ファイルの削除が完了しました！'); 