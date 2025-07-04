import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distServerPath = path.join(__dirname, '..', 'dist', 'server');

function fixSharedPaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

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

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed paths in: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        fixSharedPaths(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}:`, error.message);
  }
}

console.log('🔧 Fixing @shared/* import paths in dist/server...');
processDirectory(distServerPath);
console.log('✅ Path fixing completed!'); 