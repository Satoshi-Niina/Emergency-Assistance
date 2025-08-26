#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧹 完全クリーンアップを開始します...');

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
  '.stylelintcache'
];

const clientDir = join(process.cwd(), 'client');
const serverDir = join(process.cwd(), 'server');

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

// npmキャッシュのクリーンアップ
console.log('\n🗑️ npmキャッシュのクリーンアップ...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npmキャッシュクリーンアップ完了');
} catch (error) {
  console.log('⚠️ npmキャッシュクリーンアップ中にエラー:', error.message);
}

// 依存関係の再インストール
console.log('\n📦 依存関係の再インストール...');

// ルートディレクトリ
console.log('\n📁 ルートディレクトリの依存関係をインストール中...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ ルート依存関係インストール完了');
} catch (error) {
  console.log('❌ ルート依存関係インストール失敗:', error.message);
}

// クライアントディレクトリ
console.log('\n📁 クライアントディレクトリの依存関係をインストール中...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: clientDir });
  console.log('✅ クライアント依存関係インストール完了');
} catch (error) {
  console.log('❌ クライアント依存関係インストール失敗:', error.message);
}

// サーバーディレクトリ
console.log('\n📁 サーバーディレクトリの依存関係をインストール中...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: serverDir });
  console.log('✅ サーバー依存関係インストール完了');
} catch (error) {
  console.log('❌ サーバー依存関係インストール失敗:', error.message);
}

console.log('\n🎉 完全クリーンアップが完了しました！');
console.log('\n次のステップ:');
console.log('1. フロントエンドビルド: cd client && npm run build');
console.log('2. バックエンドビルド: cd server && npm run build:prod');
