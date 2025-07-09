import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../client/src');

function fixAzureSpeechImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  // Replace lib/azure-speech' or lib/azure-speech" with lib/azure-speech.ts'
  content = content.replace(/lib\/azure-speech(['"])/g, 'lib/azure-speech.ts$1');
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed azure-speech.ts import in ${filePath.replace(srcDir, '')}`);
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
      if (fixAzureSpeechImportsInFile(itemPath)) {
        totalFixed++;
      }
    }
  });
  return totalFixed;
}

const totalFixed = processDirectory(srcDir);
console.log(`Fixed ${totalFixed} files with azure-speech.ts imports!`); 