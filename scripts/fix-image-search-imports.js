import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../client/src');

function fixImageSearchImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  // Replace lib/image-search' or lib/image-search" with lib/image-search.ts'
  content = content.replace(/lib\/image-search(['"])/g, 'lib/image-search.ts$1');
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed image-search.ts import in ${filePath.replace(srcDir, '')}`);
    modified = true;
  }
  return modified;
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  let totalFixed = 0;
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      totalFixed += processDirectory(itemPath);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      if (fixImageSearchImportsInFile(itemPath)) {
        totalFixed++;
      }
    }
  });
  return totalFixed;
}

const totalFixed = processDirectory(srcDir);
console.log(`Fixed ${totalFixed} files with image-search.ts imports!`); 