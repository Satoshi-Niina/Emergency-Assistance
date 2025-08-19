import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * TypeScriptファイル内の.js拡張子付きインポートを修正するスクリプト
 */

const serverDir = './server';

function fixImportsInFile(filePath: string): void {
    try {
        const content = readFileSync(filePath, 'utf-8');
        
        // .js拡張子付きのインポートを見つけて修正
        const fixedContent = content.replace(
            /from\s+['"`]([^'"`]+)\.js['"`]/g,
            "from '$1'"
        ).replace(
            /import\s+['"`]([^'"`]+)\.js['"`]/g,
            "import '$1'"
        );
        
        if (content !== fixedContent) {
            writeFileSync(filePath, fixedContent, 'utf-8');
            console.log(`✅ 修正完了: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ エラー: ${filePath}`, error);
    }
}

function processDirectory(dirPath: string): void {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
            // node_modules, dist, .gitなどを除外
            if (!['node_modules', 'dist', '.git', '.github'].includes(entry)) {
                processDirectory(fullPath);
            }
        } else if (stat.isFile() && (extname(entry) === '.ts' || extname(entry) === '.tsx')) {
            fixImportsInFile(fullPath);
        }
    }
}

console.log('🔧 TypeScriptファイルのインポートパス修正を開始...');
processDirectory(serverDir);
console.log('✅ 修正完了！');
