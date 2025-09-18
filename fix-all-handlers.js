const fs = require('fs');
const path = require('path');

// 修正対象のハンドラーファイル
const handlerFiles = [
  'server/src/api/db-check/index.js',
  'server/src/api/gpt-check/index.js',
  'server/src/api/history/index.js',
  'server/src/api/images/index.js',
  'server/src/api/knowledge-base/images/index.js',
  'server/src/api/knowledge/index.js',
  'server/src/api/machines/machine-types/index.js',
  'server/src/api/tech-support/index.js',
  'server/src/api/troubleshooting/index.js'
];

function fixHandler(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped ${filePath} (file not found)`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // app.http() パターンを検出して修正
    if (content.includes('app.http(')) {
      console.log(`Fixing ${filePath}...`);
      
      // app.http() の開始部分を削除
      content = content.replace(/const \{ app \} = require\('@azure\/functions'\);\s*\n\s*app\.http\('[^']+',\s*\{[^}]*\},\s*handler:\s*async\s*\([^)]*\)\s*=>\s*\{/, 'module.exports = async (context, request) => {');
      
      // 最後の }); を }; に変更
      content = content.replace(/\s*\}\s*\}\);\s*$/, '};');
      
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
    } else {
      console.log(`⏭️  Skipped ${filePath} (already fixed or different format)`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// 全ファイルを修正
console.log('Starting handler fixes...');
handlerFiles.forEach(fixHandler);
console.log('Handler fixes completed!');
