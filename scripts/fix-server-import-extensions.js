import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targets = [
  path.join(__dirname, '../server'),
  path.join(__dirname, '../shared'),
];

function fixImportExtensionsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  // Replace ./foo or ../foo (not ending with .js/.json/.mjs/.cjs) with .js
  content = content.replace(/(from\s+['"])(\.\.?\/[^'".]+)(['"])/g, (match, p1, p2, p3) => {
    modified = true;
    return `${p1}${p2}.js${p3}`;
  });
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed import extensions in ${filePath}`);
  }
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      processDirectory(itemPath);
    } else if (item.endsWith('.ts')) {
      fixImportExtensionsInFile(itemPath);
    }
  });
}

targets.forEach(processDirectory);
console.log('All import extensions have been fixed!'); 