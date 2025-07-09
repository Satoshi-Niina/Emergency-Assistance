import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uiDir = path.join(__dirname, '../client/src/components/ui');

// Read all TypeScript files in the UI directory
const files = fs.readdirSync(uiDir).filter(file => file.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace @/lib/utils with relative path
  content = content.replace(/from ["']@\/lib\/utils["']/g, "from '../../lib/utils'");
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed imports in ${file}`);
});

console.log('All UI component imports have been fixed!'); 