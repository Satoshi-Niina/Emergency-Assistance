const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ファイルのハッシュを計算する関数
function calculateFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// 重複ファイルを削除する関数
function cleanupDuplicateImages() {
  const imageDir = path.join(__dirname, '../knowledge-base/images/emergency-flows');
  
  if (!fs.existsSync(imageDir)) {
    console.log('画像ディレクトリが見つかりません');
    return;
  }

  const files = fs.readdirSync(imageDir)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp'));

  console.log(`📁 ${files.length}個の画像ファイルをチェックします...`);

  const hashMap = new Map();
  const duplicates = [];

  // ハッシュを計算して重複を検出
  files.forEach(file => {
    const filePath = path.join(imageDir, file);
    const hash = calculateFileHash(filePath);
    
    if (hashMap.has(hash)) {
      duplicates.push({
        original: hashMap.get(hash),
        duplicate: file,
        hash: hash
      });
    } else {
      hashMap.set(hash, file);
    }
  });

  console.log(`🔄 ${duplicates.length}個の重複ファイルを発見しました`);

  // 重複ファイルを削除（新しいファイル名の方を削除）
  duplicates.forEach(({ original, duplicate }) => {
    const duplicatePath = path.join(imageDir, duplicate);
    
    // ファイル名のタイムスタンプを比較して新しい方を削除
    const originalTimestamp = parseInt(original.match(/\d+/)[0]);
    const duplicateTimestamp = parseInt(duplicate.match(/\d+/)[0]);
    
    if (duplicateTimestamp > originalTimestamp) {
      console.log(`🗑️ 重複ファイルを削除: ${duplicate} (${original}を保持)`);
      fs.unlinkSync(duplicatePath);
    } else {
      console.log(`🗑️ 重複ファイルを削除: ${original} (${duplicate}を保持)`);
      fs.unlinkSync(path.join(imageDir, original));
    }
  });

  // 最終的なファイル数を確認
  const remainingFiles = fs.readdirSync(imageDir)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp'));

  console.log(`✅ クリーンアップ完了: ${remainingFiles.length}個のファイルが残りました`);
  
  // 削除されたファイルの詳細を表示
  if (duplicates.length > 0) {
    console.log('\n📋 削除されたファイル:');
    duplicates.forEach(({ original, duplicate }) => {
      console.log(`  - ${duplicate} (${original}と重複)`);
    });
  }
}

// メイン処理
cleanupDuplicateImages(); 