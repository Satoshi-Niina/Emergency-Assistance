const fs = require('fs');
const path = require('path');

// トラブルシューティングディレクトリのパス
const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');

console.log('🔄 重複フローファイルの統合を開始します...');

// ディレクトリが存在するか確認
if (!fs.existsSync(troubleshootingDir)) {
  console.error('❌ troubleshootingディレクトリが見つかりません:', troubleshootingDir);
  process.exit(1);
}

// JSONファイルを取得（バックアップファイルを除外）
const files = fs.readdirSync(troubleshootingDir)
  .filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'))
  .sort();

console.log(`📁 発見されたファイル数: ${files.length}`);

// ファイルを読み込んで内容を分析
const flowMap = new Map(); // title -> files[]
const idMap = new Map(); // id -> file

files.forEach(fileName => {
  try {
    const filePath = path.join(troubleshootingDir, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const title = data.title || 'Untitled';
    const id = data.id || path.basename(fileName, '.json');
    
    // タイトルベースでグループ化
    if (!flowMap.has(title)) {
      flowMap.set(title, []);
    }
    flowMap.get(title).push({
      fileName,
      filePath,
      data,
      id,
      modifiedTime: fs.statSync(filePath).mtime
    });
    
    // IDベースでも記録
    idMap.set(id, {
      fileName,
      filePath,
      data,
      title
    });
    
  } catch (error) {
    console.error(`❌ ファイル読み込みエラー: ${fileName}`, error.message);
  }
});

// 重複を検出して統合
let mergedCount = 0;
let deletedCount = 0;

flowMap.forEach((files, title) => {
  if (files.length > 1) {
    console.log(`\n🔄 重複検出: "${title}" (${files.length}件)`);
    
    // 最新のファイルを特定（modifiedTimeで比較）
    files.sort((a, b) => b.modifiedTime - a.modifiedTime);
    const latestFile = files[0];
    const duplicateFiles = files.slice(1);
    
    console.log(`✅ 最新ファイル: ${latestFile.fileName} (${latestFile.modifiedTime.toISOString()})`);
    
    // 最新ファイルの内容を最適化
    const optimizedData = {
      ...latestFile.data,
      id: latestFile.id,
      title: latestFile.data.title,
      description: latestFile.data.description || '',
      triggerKeywords: latestFile.data.triggerKeywords || latestFile.data.trigger || [],
      steps: latestFile.data.steps || latestFile.data.slides || [],
      category: latestFile.data.category || '',
      createdAt: latestFile.data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mergedFrom: duplicateFiles.map(f => f.fileName)
    };
    
    // 最新ファイルを更新
    const optimizedContent = JSON.stringify(optimizedData, null, 2);
    fs.writeFileSync(latestFile.filePath, optimizedContent, 'utf8');
    console.log(`✅ 最新ファイルを更新: ${latestFile.fileName}`);
    
    // 重複ファイルを削除
    duplicateFiles.forEach(file => {
      try {
        // バックアップを作成
        const backupPath = `${file.filePath}.merged.${Date.now()}`;
        fs.copyFileSync(file.filePath, backupPath);
        console.log(`📋 バックアップ作成: ${path.basename(backupPath)}`);
        
        // ファイルを削除
        fs.unlinkSync(file.filePath);
        console.log(`🗑️ 重複ファイル削除: ${file.fileName}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ ファイル削除エラー: ${file.fileName}`, error.message);
      }
    });
    
    mergedCount++;
  }
});

console.log(`\n✅ 統合完了:`);
console.log(`   - 統合されたフロー: ${mergedCount}件`);
console.log(`   - 削除されたファイル: ${deletedCount}件`);
console.log(`   - 残存ファイル: ${fs.readdirSync(troubleshootingDir).filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.includes('.tmp')).length}件`);

// 最終的なファイル一覧を表示
console.log('\n📋 最終ファイル一覧:');
const finalFiles = fs.readdirSync(troubleshootingDir)
  .filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'))
  .sort();

finalFiles.forEach(fileName => {
  try {
    const filePath = path.join(troubleshootingDir, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    console.log(`   - ${fileName}: "${data.title}" (ID: ${data.id})`);
  } catch (error) {
    console.log(`   - ${fileName}: 読み込みエラー`);
  }
});

console.log('\n🎉 重複フローファイルの統合が完了しました！'); 