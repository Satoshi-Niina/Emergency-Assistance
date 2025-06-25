
const fs = require('fs');
const path = require('path');

function fixJsonSyntax() {
  const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
  
  if (!fs.existsSync(troubleshootingDir)) {
    console.log('トラブルシューティングディレクトリが存在しません');
    return;
  }
  
  const files = fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const filePath = path.join(troubleshootingDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // JSONをパースして検証
      JSON.parse(content);
      console.log(`✅ ${file} は正常です`);
    } catch (error) {
      console.log(`❌ ${file} にエラーがあります: ${error.message}`);
      
      try {
        // 簡単な修正を試行
        let fixedContent = content;
        
        // 末尾のカンマを削除
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
        
        // 二重カンマを単一カンマに
        fixedContent = fixedContent.replace(/,,+/g, ',');
        
        // 不正な配列終了を修正
        fixedContent = fixedContent.replace(/,(\s*\])/g, '$1');
        
        // 修正されたJSONをテスト
        JSON.parse(fixedContent);
        
        // バックアップを作成
        const backupPath = filePath + '.backup.' + Date.now();
        fs.writeFileSync(backupPath, content);
        
        // 修正されたファイルを保存
        fs.writeFileSync(filePath, fixedContent);
        console.log(`🔧 ${file} を修正しました（バックアップ: ${path.basename(backupPath)}）`);
      } catch (fixError) {
        console.log(`❌ ${file} の自動修正に失敗しました: ${fixError.message}`);
        // 破損ファイルを削除
        fs.unlinkSync(filePath);
        console.log(`🗑️ 破損ファイル ${file} を削除しました`);
      }
    }
  });
}

fixJsonSyntax();
