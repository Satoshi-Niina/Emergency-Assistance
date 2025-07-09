import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../client/src');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace @/ imports with relative paths
  content = content.replace(/from ["']@\/([^"']+)["']/g, (match, importPath) => {
    modified = true;
    
    // Calculate relative path from current file to src directory
    const relativePath = path.relative(path.dirname(filePath), srcDir);
    const relativeImport = path.join(relativePath, importPath).replace(/\\/g, '/');
    
    return `from "${relativeImport}"`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${filePath.replace(srcDir, '')}`);
  }
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      processDirectory(itemPath);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      fixImportsInFile(itemPath);
    }
  });
}

processDirectory(srcDir);
console.log('All imports have been fixed!'); 