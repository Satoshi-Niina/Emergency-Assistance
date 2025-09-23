#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Expressルートの未使用パラメータを修正する関数（より詳細）
function fixExpressRouteParams(content) {
  // POST/PUT/PATCHルートでreqを使用している場合は_reqに変更しない
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // ルート定義行をチェック
    if (line.match(/router\.(get|post|put|delete|patch)\([^,]+,\s*(async\s*)?\(\s*req\s*,/)) {
      // このルートでreqが実際に使用されているかチェック
      const routeStart = i;
      let routeEnd = i;
      
      // ルートの終了を見つける
      let braceCount = 0;
      let foundStart = false;
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        
        if (currentLine.includes('(') && !foundStart) {
          foundStart = true;
          braceCount = (currentLine.match(/\(/g) || []).length;
        } else if (foundStart) {
          braceCount += (currentLine.match(/\(/g) || []).length;
          braceCount -= (currentLine.match(/\)/g) || []).length;
          
          if (braceCount === 0) {
            routeEnd = j;
            break;
          }
        }
      }
      
      // ルート内でreqが使用されているかチェック
      let reqUsed = false;
      for (let k = routeStart; k <= routeEnd; k++) {
        if (lines[k].includes('req.') || lines[k].includes('req[') || lines[k].includes('req ')) {
          reqUsed = true;
          break;
        }
      }
      
      // reqが使用されていない場合のみ_reqに変更
      if (!reqUsed) {
        line = line.replace(/\breq\b/g, '_req');
      }
    }
    
    // エラーハンドラーでnextが使用されていない場合
    if (line.match(/router\.use\(\(\s*err:\s*any,\s*req:\s*any,\s*res:\s*any,\s*next:\s*any\s*\)/)) {
      // このエラーハンドラーでnextが使用されているかチェック
      let nextUsed = false;
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('next(')) {
          nextUsed = true;
          break;
        }
      }
      
      if (!nextUsed) {
        line = line.replace(/\bnext:\s*any\b/g, '_next: any');
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

// 未使用インポートを削除する関数
function removeUnusedImports(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 未使用インポートのパターンをチェック
    if (line.includes('import {') && line.includes('} from')) {
      const importMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(imp => imp.trim());
        let allUnused = true;
        
        for (const imp of imports) {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
          // インポートが実際に使用されているかチェック
          if (content.includes(cleanImp) && content.indexOf(cleanImp) !== content.indexOf(line)) {
            allUnused = false;
            break;
          }
        }
        
        if (allUnused) {
          continue; // この行をスキップ
        }
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

// ファイルを処理する関数
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    // Expressルートの未使用パラメータを修正
    newContent = fixExpressRouteParams(newContent);
    
    // 変更があった場合はファイルを書き戻す
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// server/routes/ ディレクトリ内のすべての.tsファイルを処理
function processRoutesDirectory() {
  const routesDir = path.join(__dirname, '..', 'server', 'routes');
  
  if (!fs.existsSync(routesDir)) {
    console.log('Routes directory not found');
    return;
  }
  
  const files = fs.readdirSync(routesDir);
  
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const filePath = path.join(routesDir, file);
      processFile(filePath);
    }
  }
}

// メイン実行
if (require.main === module) {
  console.log('Fixing TypeScript errors in routes (v2)...');
  processRoutesDirectory();
  console.log('Done!');
}

module.exports = { fixExpressRouteParams, removeUnusedImports, processFile };
