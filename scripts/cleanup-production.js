#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧹 本番環境用クリーンアップを開始...');

// 削除対象のディレクトリとファイル
const cleanupTargets = [
  'temp',
  'uploads/temp',
  'knowledge-base/temp',
  'node_modules/.cache',
  'client/node_modules/.cache',
  'dist',
  'client/dist',
  'build',
  '.vite',
  '.cache',
  '*.log',
  '*.tsbuildinfo'
];

// 削除対象のファイルパターン
const cleanupFiles = [
  'test-*.html',
  'test-*.js',
  'backup-*.tsx',
  '*.backup',
  '*.tmp',
  'cookie.txt',
  'extracted_data.json'
];

async function cleanup() {
  try {
    // ディレクトリのクリーンアップ
    for (const target of cleanupTargets) {
      const targetPath = path.join(rootDir, target);
      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
        console.log(`✅ 削除: ${target}`);
      }
    }

    // ファイルのクリーンアップ
    const files = await fs.readdir(rootDir);
    for (const file of files) {
      for (const pattern of cleanupFiles) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(file)) {
          const filePath = path.join(rootDir, file);
          await fs.remove(filePath);
          console.log(`✅ 削除: ${file}`);
        }
      }
    }

    // 空のディレクトリを削除
    const dirsToCheck = ['temp', 'uploads/temp', 'knowledge-base/temp'];
    for (const dir of dirsToCheck) {
      const dirPath = path.join(rootDir, dir);
      if (await fs.pathExists(dirPath)) {
        const contents = await fs.readdir(dirPath);
        if (contents.length === 0) {
          await fs.remove(dirPath);
          console.log(`✅ 空ディレクトリ削除: ${dir}`);
        }
      }
    }

    console.log('🎉 クリーンアップ完了！');
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
    process.exit(1);
  }
}

cleanup(); 