#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧹 超強力クリーンアップを開始します...');

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

// クリーンアップ関数
function cleanDirectory(dirPath, dirName) {
  if (existsSync(dirPath)) {
    console.log(`🗑️  ${dirName} をクリーンアップ中...`);
    try {
      rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ ${dirName} クリーンアップ完了`);
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

// グローバルキャッシュのクリーンアップ
console.log('\n🗑️ グローバルキャッシュのクリーンアップ...');
try {
  execSync('npm cache verify', { stdio: 'inherit' });
  console.log('✅ npmキャッシュ検証完了');
} catch (error) {
  console.log('⚠️ npmキャッシュ検証中にエラー:', error.message);
}

// 依存関係の再インストール（順序を重要視）
console.log('\n📦 依存関係の再インストール...');

// 1. ルートディレクトリ（ワークスペース設定）
console.log('\n📁 ルートディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ ルート依存関係インストール完了');
} catch (error) {
  console.log('❌ ルート依存関係インストール失敗:', error.message);
}

// 2. 共有ディレクトリ（最初にビルド）
console.log('\n📁 共有ディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: sharedDir });
  console.log('✅ 共有依存関係インストール完了');
} catch (error) {
  console.log('❌ 共有依存関係インストール失敗:', error.message);
}

// 3. クライアントディレクトリ
console.log('\n📁 クライアントディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: clientDir });
  console.log('✅ クライアント依存関係インストール完了');
} catch (error) {
  console.log('❌ クライアント依存関係インストール失敗:', error.message);
}

// 4. サーバーディレクトリ
console.log('\n📁 サーバーディレクトリの依存関係をインストール中...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: serverDir });
  console.log('✅ サーバー依存関係インストール完了');
} catch (error) {
  console.log('❌ サーバー依存関係インストール失敗:', error.message);
}

// 5. 共有ディレクトリのビルド
console.log('\n🔨 共有ディレクトリのビルド...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: sharedDir });
  console.log('✅ 共有ディレクトリビルド完了');
} catch (error) {
  console.log('❌ 共有ディレクトリビルド失敗:', error.message);
}

console.log('\n🎉 超強力クリーンアップが完了しました！');
console.log('\n次のステップ:');
console.log('1. フロントエンドビルド: cd client && npm run build');
console.log('2. バックエンドビルド: cd server && npm run build:prod');
console.log('\n注意: --legacy-peer-deps フラグを使用して依存関係の競合を回避しています');
