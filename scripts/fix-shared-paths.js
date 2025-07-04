import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distServerPath = path.join(__dirname, '..', 'dist', 'server');
const distSharedPath = path.join(__dirname, '..', 'dist', 'shared');

function fixSharedPaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // ../shared/xxx のimportを dist/shared/xxx への相対パスに変換
    const sharedImportReplaced = content.replace(/from ['"]\.\.\/shared\/([\w\-\/]+?)(\.js)?['"]/g, (match, importPath, ext) => {
      const fileDir = path.dirname(filePath);
      const sharedPath = path.join(__dirname, '..', 'dist', 'shared');
      let relPath = path.relative(fileDir, sharedPath).replace(/\\/g, '/');
      if (!relPath.startsWith('.')) relPath = './' + relPath;
      if (!relPath.endsWith('/')) relPath += '/';
      return `from '${relPath}${importPath}.js'`;
    });
    if (sharedImportReplaced !== content) {
      content = sharedImportReplaced;
      modified = true;
    }

    // @shared/schema を ../shared/schema に変換
    if (content.includes('@shared/schema')) {
      content = content.replace(/from ["']@shared\/schema["']/g, "from '../shared/schema'");
      modified = true;
    }

    // @shared/types を ../shared/types に変換
    if (content.includes('@shared/types')) {
      content = content.replace(/from ["']@shared\/types["']/g, "from '../shared/types'");
      modified = true;
    }

    // @shared/validation を ../shared/validation に変換
    if (content.includes('@shared/validation')) {
      content = content.replace(/from ["']@shared\/validation["']/g, "from '../shared/validation'");
      modified = true;
    }

    // @shared/utils を ../shared/utils に変換
    if (content.includes('@shared/utils')) {
      content = content.replace(/from ["']@shared\/utils["']/g, "from '../shared/utils'");
      modified = true;
    }

    // @shared/ で始まるその他のインポートを ../shared/ に変換
    if (content.includes('@shared/')) {
      content = content.replace(/from ["']@shared\/([^"']+)["']/g, "from '../shared/$1'");
      modified = true;
    }

    // ../shared/schema など拡張子なしを .js 付きに変換
    if (content.match(/from ['"]\.\.\/shared\/(schema|types|validation|utils)['"]/)) {
      content = content.replace(/from ['"](\.\.\/shared\/(schema|types|validation|utils))['"]/g, "from '$1.js'");
      modified = true;
    }

    // 拡張子なしの相対importに.jsを付与（最後に実行し、変化があればmodified=true）
    const newContent = content.replace(/from (['"])(\.{1,2}\/([\w\-\/]+?))(?!\.(js|json|mjs|cjs))\1/g, (match, quote, path) => {
      return `from ${quote}${path}.js${quote}`;
    });
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed paths in: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function fixSharedPackagePaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // ./src/schema を ./schema に変換
    if (content.includes('./src/schema')) {
      content = content.replace(/from ["']\.\/src\/schema["']/g, "from './schema'");
      modified = true;
    }

    // ./src/types を ./types に変換
    if (content.includes('./src/types')) {
      content = content.replace(/from ["']\.\/src\/types["']/g, "from './types'");
      modified = true;
    }

    // ./src/validation を ./validation に変換
    if (content.includes('./src/validation')) {
      content = content.replace(/from ["']\.\/src\/validation["']/g, "from './validation'");
      modified = true;
    }

    // ./src/utils を ./utils に変換
    if (content.includes('./src/utils')) {
      content = content.replace(/from ["']\.\/src\/utils["']/g, "from './utils'");
      modified = true;
    }

    // ./src/ で始まるその他のインポートを ./ に変換
    if (content.includes('./src/')) {
      content = content.replace(/from ["']\.\/src\/([^"']+)["']/g, "from './$1'");
      modified = true;
    }

    // 拡張子なしの相対importに.jsを付与（最後に実行し、変化があればmodified=true）
    const newContent = content.replace(/from (['"])(\.{1,2}\/([\w\-\/]+?))(?!\.(js|json|mjs|cjs))\1/g, (match, quote, path) => {
      return `from ${quote}${path}.js${quote}`;
    });
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed shared package paths in: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath, fixFunction) {
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath, fixFunction);
      } else if (file.endsWith('.js')) {
        fixFunction(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}:`, error.message);
  }
}

console.log('🔧 Fixing @shared/* import paths in dist/server...');
processDirectory(distServerPath, fixSharedPaths);

console.log('🔧 Fixing ./src/* import paths in dist/shared...');
processDirectory(distSharedPath, fixSharedPackagePaths);

console.log('✅ Path fixing completed!'); 