import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../client/src');

function fixTextToSpeechImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  // Replace lib/text-to-speech' or lib/text-to-speech" with lib/text-to-speech.ts'
  content = content.replace(/lib\/text-to-speech(['"])/g, 'lib/text-to-speech.ts$1');
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed text-to-speech.ts import in ${filePath.replace(srcDir, '')}`);
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
      if (fixTextToSpeechImportsInFile(itemPath)) {
        totalFixed++;
      }
    }
  });
  return totalFixed;
}

const totalFixed = processDirectory(srcDir);
console.log(`Fixed ${totalFixed} files with text-to-speech.ts imports!`); 