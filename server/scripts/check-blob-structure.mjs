#!/usr/bin/env node
/**
 * Azure Blob Storage のフォルダ構造確認スクリプト
 * 
 * 使用方法:
 * AZURE_STORAGE_CONNECTION_STRING="..." node scripts/check-blob-structure.mjs
 */

import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

if (!connectionString) {
  console.error('❌ AZURE_STORAGE_CONNECTION_STRING is not set');
  console.log('');
  console.log('Usage:');
  console.log('  AZURE_STORAGE_CONNECTION_STRING="..." node scripts/check-blob-structure.mjs');
  process.exit(1);
}

async function checkStructure() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   📂 Azure Blob Storage Structure Analyzer              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Container: ${containerName}`);
  console.log('');

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const exists = await containerClient.exists();
    if (!exists) {
      console.error(`❌ Container '${containerName}' does not exist`);
      process.exit(1);
    }

    console.log('✅ Container exists');
    console.log('');
    console.log('📊 Analyzing folder structure...');
    console.log('─────────────────────────────────────────────────────────');
    console.log('');

    // フォルダごとのファイル数をカウント
    const folders = new Map();
    
    for await (const blob of containerClient.listBlobsFlat()) {
      const parts = blob.name.split('/');
      parts.pop(); // ファイル名を除去
      const folder = parts.join('/');
      
      if (!folders.has(folder)) {
        folders.set(folder, []);
      }
      folders.get(folder).push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified
      });
    }

    // 結果表示
    const sortedFolders = Array.from(folders.entries()).sort();
    
    for (const [folder, files] of sortedFolders) {
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const sizeKB = (totalSize / 1024).toFixed(2);
      
      console.log(`📁 ${folder || '(root)'}`);
      console.log(`   Files: ${files.length} | Size: ${sizeKB} KB`);
      
      // 最新5ファイルを表示
      const recentFiles = files
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, 5);
      
      for (const file of recentFiles) {
        const fileName = file.name.split('/').pop();
        const fileSizeKB = (file.size / 1024).toFixed(2);
        console.log(`   └─ ${fileName} (${fileSizeKB} KB, ${file.lastModified.toISOString().split('T')[0]})`);
      }
      
      if (files.length > 5) {
        console.log(`   └─ ... and ${files.length - 5} more files`);
      }
      console.log('');
    }

    // サマリー
    console.log('─────────────────────────────────────────────────────────');
    console.log('📊 Summary:');
    console.log(`   Total Folders: ${folders.size}`);
    console.log(`   Total Blobs: ${Array.from(folders.values()).flat().length}`);
    console.log('');

    // 特定フォルダのチェック
    const criticalFolders = [
      'knowledge-base/images/chat-exports',
      'knowledge-base/images/emergency-flows',
      'knowledge-base/exports',
      'knowledge-base/troubleshooting'
    ];

    console.log('🔍 Critical Folders Status:');
    for (const folder of criticalFolders) {
      const fileCount = folders.get(folder)?.length || 0;
      const status = fileCount > 0 ? '✅' : '❌';
      console.log(`   ${status} ${folder}: ${fileCount} files`);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStructure();
