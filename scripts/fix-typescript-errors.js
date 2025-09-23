#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Expressルートの未使用パラメータを修正する関数
function fixExpressRouteParams(content) {
  // router.get('/', async (req, res) => { を router.get('/', async (_req, res) => { に修正
  content = content.replace(
    /router\.(get|post|put|delete|patch)\([^,]+,\s*async\s*\(\s*req\s*,/g,
    (match) => match.replace('req', '_req')
  );
  
  // router.get('/', (req, res) => { を router.get('/', (_req, res) => { に修正
  content = content.replace(
    /router\.(get|post|put|delete|patch)\([^,]+,\s*\(\s*req\s*,/g,
    (match) => match.replace('req', '_req')
  );
  
  // app.get('/', (req, res) => { を app.get('/', (_req, res) => { に修正
  content = content.replace(
    /app\.(get|post|put|delete|patch)\([^,]+,\s*\(\s*req\s*,/g,
    (match) => match.replace('req', '_req')
  );
  
  // エラーハンドラーの未使用パラメータを修正
  content = content.replace(
    /router\.use\(\(\s*err:\s*any,\s*req:\s*any,\s*res:\s*any,\s*next:\s*any\s*\)/g,
    'router.use((err: any, _req: any, res: any, _next: any)'
  );
  
  content = content.replace(
    /app\.use\(\(\s*err:\s*any,\s*req:\s*any,\s*res:\s*any,\s*next:\s*any\s*\)/g,
    'app.use((err: any, _req: any, res: any, _next: any)'
  );
  
  return content;
}

// 未使用インポートを削除する関数
function removeUnusedImports(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 未使用インポートのパターンをチェック
    if (line.includes('import {') && line.includes('} from')) {
      // この行が未使用かどうかをチェック（簡易版）
      const importMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(imp => imp.trim());
        // すべてのインポートが未使用の場合、行をスキップ
        if (imports.every(imp => {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
          return !content.includes(cleanImp) || content.indexOf(cleanImp) === content.indexOf(line);
        })) {
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
  console.log('Fixing TypeScript errors in routes...');
  processRoutesDirectory();
  console.log('Done!');
}

module.exports = { fixExpressRouteParams, removeUnusedImports, processFile };
