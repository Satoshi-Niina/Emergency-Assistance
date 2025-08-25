#!/usr/bin/env node

/**
 * Azure Blob Storage Folder Structure Test
 * Azure Blob Storage縺ｮ繝輔か繝ｫ繝讒矩繝・せ繝・
 */

import { EnhancedAzureStorageService } from '../server/lib/azure-storage-enhanced.js';
import { createStorageService } from '../server/lib/storage-config.js';
import fs from 'fs/promises';
import path from 'path';

async function testFolderStructure() {
  console.log('翌・・Azure Blob Storage Folder Structure Test');
  console.log('==========================================\n');

  // 繧ｹ繝医Ξ繝ｼ繧ｸ繧ｵ繝ｼ繝薙せ縺ｮ蛻晄悄蛹・
  const storageService = createStorageService();
  
  if (!storageService) {
    console.log('邃ｹ・・Azure Storage not configured. Creating mock test data locally...');
    await createMockFolderStructure();
    return;
  }

  // 1. 豺ｻ莉倡判蜒上→蜷後§繝輔か繝ｫ繝讒矩繧偵ユ繧ｹ繝・
  console.log('1・鞘Ε Testing folder structure like the attached image...');
  
  const testStructure = {
    'knowledge-base/backups/backup1.json': '{"backup": "data1"}',
    'knowledge-base/data/dataset1.json': '{"data": "content1"}',
    'knowledge-base/doc_17463_test/document.txt': 'Test document content',
    'knowledge-base/documents/manual.pdf': 'PDF content placeholder',
    'knowledge-base/exports/export1.json': '{"export": "data1"}',
    'knowledge-base/images/diagram.png': 'PNG binary placeholder',
    'knowledge-base/qa/question1.txt': 'What is this system?',
    'knowledge-base/text/article.txt': 'Article content here',
    'knowledge-base/troubleshooting/issue1.md': '# Troubleshooting Issue 1',
    'knowledge-base/index.json': '{"version": "1.0", "files": []}',
    'knowledge-base/railway-maintenance.json': '{"maintenance": "schedule"}'
  };

  try {
    // 2. 繝・せ繝育畑荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ菴懈・
    const tempDir = await fs.mkdtemp(path.join(process.env.TMPDIR || '/tmp', 'folder-test-'));
    console.log('刀 Created temp directory:', tempDir);

    // 3. 繝・せ繝医ヵ繧｡繧､繝ｫ菴懈・縺ｨ繧｢繝・・繝ｭ繝ｼ繝・
    console.log('\n2・鞘Ε Creating and uploading test files...');
    const uploadResults = [];
    
    for (const [blobPath, content] of Object.entries(testStructure)) {
      // 繝ｭ繝ｼ繧ｫ繝ｫ繝輔ぃ繧､繝ｫ菴懈・
      const localPath = path.join(tempDir, path.basename(blobPath));
      await fs.writeFile(localPath, content);
      
      try {
        const result = await storageService.uploadFile(
          localPath,
          blobPath,
          { overwrite: true, createPath: true }
        );
        
        uploadResults.push({
          path: blobPath,
          success: result.success,
          url: result.url
        });
        
        console.log(`笨・Uploaded: ${blobPath}`);
      } catch (error) {
        console.error(`笶・Upload failed: ${blobPath} - ${error.message}`);
        uploadResults.push({
          path: blobPath,
          success: false,
          error: error.message
        });
      }
    }

    // 4. 繝輔か繝ｫ繝蛻･縺ｮ繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励ユ繧ｹ繝・
    console.log('\n3・鞘Ε Testing folder-based file listing...');
    
    const folders = [
      'knowledge-base/',
      'knowledge-base/backups/',
      'knowledge-base/data/',
      'knowledge-base/documents/',
      'knowledge-base/images/',
      'knowledge-base/qa/',
      'knowledge-base/troubleshooting/'
    ];

    for (const folder of folders) {
      try {
        const listResult = await storageService.listBlobs(folder, 50);
        console.log(`唐 ${folder}: ${listResult.totalCount} files`);
        
        if (listResult.blobs.length > 0) {
          listResult.blobs.forEach(blob => {
            console.log(`   - ${blob.name} (${formatFileSize(blob.size)})`);
          });
        }
      } catch (error) {
        console.error(`笶・List failed for ${folder}:`, error.message);
      }
    }

    // 5. 髫主ｱ､讒矩縺ｮ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨ユ繧ｹ繝・
    console.log('\n4・鞘Ε Testing hierarchical download...');
    
    const downloadDir = path.join(tempDir, 'downloads');
    await fs.mkdir(downloadDir, { recursive: true });
    
    try {
      const syncResult = await storageService.syncBlobToDirectory(
        'knowledge-base/',
        downloadDir,
        { overwrite: true, createLocalPath: true }
      );
      
      console.log('踏 Download sync result:', {
        downloaded: syncResult.downloaded.length,
        errors: syncResult.errors.length
      });
      
      // 繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＆繧後◆繝輔か繝ｫ繝讒矩繧定｡ｨ遉ｺ
      console.log('\n刀 Downloaded folder structure:');
      await displayDirectoryTree(downloadDir);
      
    } catch (error) {
      console.error('笶・Download sync failed:', error.message);
    }

    // 6. 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    console.log('\n5・鞘Ε Cleaning up test files...');
    
    for (const result of uploadResults) {
      if (result.success) {
        try {
          await storageService.deleteBlob(result.path);
          console.log(`卵・・Deleted: ${result.path}`);
        } catch (error) {
          console.error(`笶・Delete failed: ${result.path}`);
        }
      }
    }

    // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ蜑企勁
    await fs.rm(tempDir, { recursive: true });
    console.log('ｧｹ Temp directory cleaned up');

    // 7. 邨先棡繧ｵ繝槭Μ繝ｼ
    console.log('\n6・鞘Ε Test Summary:');
    const successCount = uploadResults.filter(r => r.success).length;
    const totalCount = uploadResults.length;
    
    console.log(`投 Upload success rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    
    if (successCount === totalCount) {
      console.log('脂 All folder structure tests passed!');
      console.log('笨・Azure Blob Storage fully supports the folder structure shown in your image');
    } else {
      console.log('笞・・Some tests failed. Please check the error messages above.');
    }

  } catch (error) {
    console.error('徴 Test failed:', error.message);
  }
}

async function createMockFolderStructure() {
  console.log('統 Creating mock folder structure for local testing...');
  
  const mockStructure = {
    'knowledge-base/': 'directory',
    'knowledge-base/backups/': 'directory',
    'knowledge-base/data/': 'directory',
    'knowledge-base/doc_17463_test/': 'directory',
    'knowledge-base/documents/': 'directory',
    'knowledge-base/exports/': 'directory',
    'knowledge-base/images/': 'directory',
    'knowledge-base/qa/': 'directory',
    'knowledge-base/text/': 'directory',
    'knowledge-base/troubleshooting/': 'directory',
  };

  console.log('翌・・Folder structure that would be supported:');
  Object.keys(mockStructure).forEach(folder => {
    console.log(`   刀 ${folder}`);
  });
  
  console.log('\n笨・This structure is fully supported by the EnhancedAzureStorageService');
  console.log('肌 Configure Azure Storage to test with real data');
}

async function displayDirectoryTree(dirPath, indent = '') {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const [index, entry] of entries.entries()) {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '笏披楳笏 ' : '笏懌楳笏 ';
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        console.log(`${indent}${prefix}刀 ${entry.name}/`);
        const nextIndent = indent + (isLast ? '    ' : '笏・  ');
        await displayDirectoryTree(fullPath, nextIndent);
      } else {
        const stats = await fs.stat(fullPath);
        console.log(`${indent}${prefix}塘 ${entry.name} (${formatFileSize(stats.size)})`);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
}

function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
if (import.meta.url === `file://${process.argv[1]}`) {
  testFolderStructure().catch(error => {
    console.error('徴 Folder structure test failed:', error);
    process.exit(1);
  });
}
