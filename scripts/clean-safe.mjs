#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧹 安全なクリーンアップを開始します...');

// 現在のNode.jsとnpmバージョンを確認
console.log('\n📋 環境情報:');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`Node.js: ${nodeVersion}`);
  console.log(`npm: ${npmVersion}`);
} catch (error) {
  console.log('⚠️ バージョン確認中にエラー:', error.message);
}

const dirs = [
  'node_modules',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'dist',
  '.vite',
  '.tsbuildinfo',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '.nyc_output',
  '.cache',
  '.parcel-cache',
  '.eslintcache',
  '.stylelintcache',
  '.npm',
  '.yarn',
  '.pnpm'
];

const clientDir = join(process.cwd(), 'client');
const serverDir = join(process.cwd(), 'server');
const sharedDir = join(process.cwd(), 'shared');

// 安全なクリーンアップ関数
function cleanDirectory(dirPath, dirName) {
  if (existsSync(dirPath)) {
    console.log(`🗑️  ${dirName} をクリーンアップ中...`);
    try {
      // ファイルの場合は直接削除
      if (!dirPath.includes('node_modules')) {
        rmSync(dirPath, { force: true });
        console.log(`✅ ${dirName} クリーンアップ完了`);
        return;
      }
      
      // node_modulesの場合は段階的に削除
      console.log(`📁 ${dirName} は大きなディレクトリのため、段階的に削除中...`);
      
      // PowerShellコマンドを使用（Windows用）
      try {
        execSync(`Remove-Item -Path "${dirPath}" -Recurse -Force -ErrorAction SilentlyContinue`, { 
          stdio: 'inherit',
          shell: 'powershell.exe'
        });
        console.log(`✅ ${dirName} クリーンアップ完了 (PowerShell)`);
      } catch (error) {
        console.log(`⚠️ PowerShell削除失敗: ${error.message}`);
        // フォールバック: 手動で削除
        try {
          rmSync(dirPath, { recursive: true, force: true });
          console.log(`✅ ${dirName} クリーンアップ完了 (手動)`);
        } catch (fallbackError) {
          console.log(`❌ ${dirName} クリーンアップ失敗: ${fallbackError.message}`);
          console.log(`💡 手動で削除してください: ${dirPath}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  ${dirName} クリーンアップ中にエラー:`, error.message);
    }
  } else {
    console.log(`ℹ️  ${dirName} は存在しません`);
  }
}

// ルートディレクトリのクリーンアップ
console.log('\n📁 ルートディレクトリのクリーンアップ...');
dirs.forEach(dir => {
  const fullPath = join(process.cwd(), dir);
  cleanDirectory(fullPath, dir);
});

// クライアントディレクトリのクリーンアップ
console.log('\n📁 クライアントディレクトリのクリーンアップ...');
dirs.forEach(dir => {
  const fullPath = join(clientDir, dir);
  cleanDirectory(fullPath, `client/${dir}`);
});

// サーバーディレクトリのクリーンアップ
console.log('\n📁 サーバーディレクトリのクリーンアップ...');
dirs.forEach(dir => {
  const fullPath = join(serverDir, dir);
  cleanDirectory(fullPath, `server/${dir}`);
});

// 共有ディレクトリのクリーンアップ
console.log('\n📁 共有ディレクトリのクリーンアップ...');
dirs.forEach(dir => {
  const fullPath = join(sharedDir, dir);
  cleanDirectory(fullPath, `shared/${dir}`);
});

// npmキャッシュのクリーンアップ
console.log('\n🗑️ npmキャッシュのクリーンアップ...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npmキャッシュクリーンアップ完了');
} catch (error) {
  console.log('⚠️ npmキャッシュクリーンアップ中にエラー:', error.message);
}

// 依存関係の再インストール（より安全な方法）
console.log('\n📦 依存関係の再インストール...');

// 1. ルートディレクトリ（ワークスペース設定）
console.log('\n📁 ルートディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps --no-audit', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ ルート依存関係インストール完了');
} catch (error) {
  console.log('❌ ルート依存関係インストール失敗:', error.message);
  console.log('💡 手動で実行してください: npm install --legacy-peer-deps');
}

// 2. 共有ディレクトリ
console.log('\n📁 共有ディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps --no-audit', { stdio: 'inherit', cwd: sharedDir });
  console.log('✅ 共有依存関係インストール完了');
} catch (error) {
  console.log('❌ 共有依存関係インストール失敗:', error.message);
}

// 3. クライアントディレクトリ
console.log('\n📁 クライアントディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps --no-audit', { stdio: 'inherit', cwd: clientDir });
  console.log('✅ クライアント依存関係インストール完了');
} catch (error) {
  console.log('❌ クライアント依存関係インストール失敗:', error.message);
}

// 4. サーバーディレクトリ
console.log('\n📁 サーバーディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps --no-audit', { stdio: 'inherit', cwd: serverDir });
  console.log('✅ サーバー依存関係インストール完了');
} catch (error) {
  console.log('❌ サーバー依存関係インストール失敗:', error.message);
}

console.log('\n🎉 安全なクリーンアップが完了しました！');
console.log('\n次のステップ:');
console.log('1. フロントエンドビルド: cd client && npm run build');
console.log('2. バックエンドビルド: cd server && npm run build:prod');
console.log('\n注意: --legacy-peer-deps フラグを使用して依存関係の競合を回避しています');
console.log('注意: --no-audit フラグでセキュリティチェックをスキップしています');
