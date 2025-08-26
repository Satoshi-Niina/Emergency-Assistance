#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧹 最終クリーンアップを開始します...');

// 現在のNode.jsとnpmバージョンを確認
console.log('\n📋 環境情報:');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`Node.js: ${nodeVersion}`);
  console.log(`npm: ${npmVersion}`);
  
  // バージョンチェック
  if (nodeVersion.startsWith('v22') || nodeVersion.startsWith('v21')) {
    console.log('⚠️  警告: Node.js 22.x/21.xは互換性の問題が発生する可能性があります');
    console.log('💡 推奨: Node.js 18.xを使用してください');
  }
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
      
      // 手動で削除を試行
      try {
        rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ ${dirName} クリーンアップ完了 (手動)`);
      } catch (error) {
        console.log(`⚠️ 手動削除失敗: ${error.message}`);
        console.log(`💡 手動で削除してください: ${dirPath}`);
        console.log(`💡 または、エクスプローラーで削除してください`);
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

console.log('\n🎉 最終クリーンアップが完了しました！');
console.log('\n次のステップ:');
console.log('1. 手動で残っているnode_modulesを削除してください');
console.log('2. 依存関係の再インストール: npm install --legacy-peer-deps');
console.log('3. フロントエンドビルド: cd client && npm run build');
console.log('4. バックエンドビルド: cd server && npm run build:prod');
console.log('\n注意: --legacy-peer-deps フラグを使用して依存関係の競合を回避しています');
console.log('\n💡 推奨: Node.js 18.xにダウングレードすることを検討してください');
