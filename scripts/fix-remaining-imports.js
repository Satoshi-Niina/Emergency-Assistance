import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, '../client/src/components');

function fixImportsInDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      fixImportsInDirectory(itemPath);
    } else if (item.endsWith('.tsx')) {
      let content = fs.readFileSync(itemPath, 'utf8');
      
      // Replace @/lib/utils with relative path
      content = content.replace(/from ["']@\/lib\/utils["']/g, "from '../../../lib/utils'");
      
      fs.writeFileSync(itemPath, content);
      console.log(`Fixed imports in ${itemPath.replace(componentsDir, '')}`);
    }
  });
}

fixImportsInDirectory(componentsDir);
console.log('All remaining component imports have been fixed!'); 