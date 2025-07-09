import fs from 'fs';
import path from 'path';

const sourceDir = './dist/server/server';
const targetDir = './dist/server';

// Check if the double server directory exists
if (fs.existsSync(sourceDir)) {
  console.log('Fixing double server directory structure...');
  
  // Move all files from dist/server/server/ to dist/server/
  const moveFiles = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        moveFiles(srcPath, destPath);
        fs.rmdirSync(srcPath);
      } else {
        fs.renameSync(srcPath, destPath);
      }
    }
  };
  
  moveFiles(sourceDir, targetDir);
  
  // Remove the empty server directory
  if (fs.existsSync(sourceDir)) {
    fs.rmdirSync(sourceDir);
  }
  
  console.log('✅ Server directory structure fixed');
} else {
  console.log('No double server directory found, skipping...');
}

// Fix import paths in all JavaScript files
console.log('Fixing import paths...');
const fixImportPaths = (dir) => {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      fixImportPaths(itemPath);
    } else if (item.endsWith('.js')) {
      let content = fs.readFileSync(itemPath, 'utf8');
      const originalContent = content;
      
      // Fix shared/schema.js imports based on file location
      if (dir === './dist/server') {
        // Files in root of dist/server/ need ../../shared/schema.js
        content = content.replace(
          /from ['"]\.\.\/shared\/schema\.js['"]/g,
          "from '../../shared/schema.js'"
        );
      } else {
        // Files in subdirectories need ../shared/schema.js
        content = content.replace(
          /from ['"]\.\.\/\.\.\/shared\/schema\.js['"]/g,
          "from '../shared/schema.js'"
        );
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(itemPath, content, 'utf8');
        console.log(`✅ Fixed imports in ${itemPath}`);
      }
    }
  }
};

fixImportPaths('./dist/server');
console.log('✅ Import paths fixed'); 