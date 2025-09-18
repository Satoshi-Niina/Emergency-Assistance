const fs = require('fs');
const path = require('path');

// 修正対象のハンドラーファイル
const handlerFiles = [
  'server/src/api/db-check/index.js',
  'server/src/api/files/index.js',
  'server/src/api/gpt-check/index.js',
  'server/src/api/history/index.js',
  'server/src/api/images/index.js',
  'server/src/api/knowledge-base/images/index.js',
  'server/src/api/knowledge/index.js',
  'server/src/api/machines/machine-types/index.js',
  'server/src/api/settings/index.js',
  'server/src/api/tech-support/index.js',
  'server/src/api/troubleshooting/index.js'
];

function fixSyntaxErrors(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped ${filePath} (file not found)`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 最後の }; を }; に修正（不足している } を追加）
    if (content.endsWith('        };')) {
      content = content.slice(0, -9) + '        }\n};';
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed syntax errors in ${filePath}`);
    } else {
      console.log(`⏭️  Skipped ${filePath} (no syntax errors found)`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// 全ファイルを修正
console.log('Starting final syntax error fixes...');
handlerFiles.forEach(fixSyntaxErrors);
console.log('Final syntax error fixes completed!');
