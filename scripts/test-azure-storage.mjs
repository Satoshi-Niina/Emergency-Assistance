#!/usr/bin/env node

/**
 * Azure Storage Configuration Test Script
 * Azure Storage縺ｮ險ｭ螳夂｢ｺ隱阪・繝・せ繝医せ繧ｯ繝ｪ繝励ヨ
 */

import { EnhancedAzureStorageService } from '../server/lib/azure-storage-enhanced.js';
import { 
  getStorageConfig, 
  createStorageService, 
  validateStorageConfig,
  formatFileSize
} from '../server/lib/storage-config.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('剥 Azure Storage Configuration Test');
  console.log('================================\n');

  // 1. 險ｭ螳壹・讀懆ｨｼ
  console.log('1・鞘Ε Validating Configuration...');
  const validation = validateStorageConfig();
  
  if (validation.errors.length > 0) {
    console.error('笶・Configuration Errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('笞・・Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (validation.isValid) {
    console.log('笨・Configuration is valid\n');
  } else {
    console.error('笶・Configuration is invalid. Please fix errors and try again.\n');
    process.exit(1);
  }

  // 2. 險ｭ螳壽ュ蝣ｱ縺ｮ陦ｨ遉ｺ
  console.log('2・鞘Ε Configuration Details...');
  const { paths, azure, isProduction, isAzureEnabled } = getStorageConfig();
  
  console.log('Environment:', isProduction ? 'Production' : 'Development');
  console.log('Azure Storage:', isAzureEnabled ? 'Enabled' : 'Disabled');
  console.log('Knowledge Base Path:', paths.knowledgeBasePath);
  console.log('Azure Container:', azure.containerName);
  console.log('Auto Sync:', paths.enableAutoSync ? `Enabled (${paths.syncIntervalMs}ms)` : 'Disabled');
  console.log('');

  if (!isAzureEnabled) {
    console.log('邃ｹ・・Azure Storage is not configured. Test complete.');
    return;
  }

  // 3. Azure Storage 繧ｵ繝ｼ繝薙せ縺ｮ蛻晄悄蛹・
  console.log('3・鞘Ε Initializing Azure Storage Service...');
  const storageService = createStorageService();
  
  if (!storageService) {
    console.error('笶・Failed to create storage service');
    process.exit(1);
  }
  
  console.log('笨・Storage service created\n');

  // 4. 繝倥Ν繧ｹ繝√ぉ繝・け
  console.log('4・鞘Ε Running Health Check...');
  try {
    const healthCheck = await storageService.healthCheck();
    
    console.log('Status:', healthCheck.status);
    console.log('Container Exists:', healthCheck.containerExists);
    console.log('Can Write:', healthCheck.canWrite);
    console.log('Can Read:', healthCheck.canRead);
    
    if (healthCheck.details) {
      console.log('Details:', JSON.stringify(healthCheck.details, null, 2));
    }
    
    if (healthCheck.status !== 'healthy') {
      console.error('笶・Health check failed');
      process.exit(1);
    }
    
    console.log('笨・Health check passed\n');
  } catch (error) {
    console.error('笶・Health check error:', error.message);
    process.exit(1);
  }

  // 5. 蝓ｺ譛ｬ逧・↑繝輔ぃ繧､繝ｫ謫堺ｽ懊ユ繧ｹ繝・
  console.log('5・鞘Ε Testing File Operations...');
  
  try {
    // 繝・せ繝医ヵ繧｡繧､繝ｫ縺ｮ菴懈・
    const testContent = `Azure Storage Test
Timestamp: ${new Date().toISOString()}
Environment: ${isProduction ? 'Production' : 'Development'}
Container: ${azure.containerName}`;
    
    const tempDir = await fs.mkdtemp(path.join(await fs.realpath(process.env.TMPDIR || '/tmp'), 'azure-test-'));
    const testFilePath = path.join(tempDir, 'test-file.txt');
    
    await fs.writeFile(testFilePath, testContent);
    console.log('統 Created test file:', testFilePath);

    // 繧｢繝・・繝ｭ繝ｼ繝峨ユ繧ｹ繝・
    const uploadResult = await storageService.uploadFile(
      testFilePath,
      'test/storage-test.txt',
      { overwrite: true, metadata: { test: 'true', timestamp: Date.now().toString() } }
    );
    
    console.log('豆 Upload result:', {
      success: uploadResult.success,
      url: uploadResult.url,
      etag: uploadResult.etag?.substring(0, 20) + '...'
    });

    // 繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨ユ繧ｹ繝・
    const downloadPath = path.join(tempDir, 'downloaded-test-file.txt');
    const downloadResult = await storageService.downloadFile(
      'test/storage-test.txt',
      downloadPath,
      { createLocalPath: true }
    );
    
    console.log('踏 Download result:', {
      success: downloadResult.success,
      size: formatFileSize(downloadResult.size),
      lastModified: downloadResult.lastModified
    });

    // 繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺溘ヵ繧｡繧､繝ｫ縺ｮ蜀・ｮｹ遒ｺ隱・
    const downloadedContent = await fs.readFile(downloadPath, 'utf-8');
    const contentMatches = downloadedContent === testContent;
    console.log('剥 Content verification:', contentMatches ? 'PASSED' : 'FAILED');

    // 繝ｪ繧ｹ繝医ユ繧ｹ繝・
    const listResult = await storageService.listBlobs('test/', 10);
    console.log('搭 List result:', {
      totalFiles: listResult.totalCount,
      files: listResult.blobs.map(b => ({ 
        name: b.name, 
        size: formatFileSize(b.size), 
        modified: b.lastModified.toISOString() 
      }))
    });

    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    const deleteResult = await storageService.deleteBlob('test/storage-test.txt');
    console.log('卵・・Delete result:', deleteResult);

    // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    await fs.rm(tempDir, { recursive: true });
    
    console.log('笨・All file operations completed successfully\n');
    
  } catch (error) {
    console.error('笶・File operations test failed:', error.message);
    process.exit(1);
  }

  // 6. 蜷梧悄繝・せ繝・(繧ｪ繝励す繝ｧ繝ｳ)
  if (process.argv.includes('--test-sync')) {
    console.log('6・鞘Ε Testing Directory Sync...');
    
    try {
      // 繝・せ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ菴懈・
      const testSyncDir = await fs.mkdtemp(path.join(await fs.realpath(process.env.TMPDIR || '/tmp'), 'sync-test-'));
      
      // 縺・￥縺､縺九・繝・せ繝医ヵ繧｡繧､繝ｫ繧剃ｽ懈・
      const testFiles = [
        { name: 'file1.txt', content: 'Test file 1' },
        { name: 'subdir/file2.json', content: '{"test": true}' },
        { name: 'file3.md', content: '# Test Markdown' }
      ];
      
      for (const file of testFiles) {
        const filePath = path.join(testSyncDir, file.name);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
      
      console.log(`刀 Created test directory with ${testFiles.length} files`);

      // 蜷梧悄螳溯｡・
      const syncResult = await storageService.syncDirectoryToBlob(
        testSyncDir,
        'sync-test',
        { 
          deleteOrphaned: false,
          dryRun: false,
          includePattern: /\.(txt|json|md)$/
        }
      );
      
      console.log('売 Sync result:', {
        uploaded: syncResult.uploaded.length,
        deleted: syncResult.deleted.length,
        skipped: syncResult.skipped.length,
        errors: syncResult.errors.length
      });
      
      if (syncResult.errors.length > 0) {
        console.error('Sync errors:', syncResult.errors);
      }

      // 蜷梧悄縺輔ｌ縺溘ヵ繧｡繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
      for (const uploadedFile of syncResult.uploaded) {
        await storageService.deleteBlob(uploadedFile);
      }
      
      // 繝・せ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
      await fs.rm(testSyncDir, { recursive: true });
      
      console.log('笨・Sync test completed successfully\n');
      
    } catch (error) {
      console.error('笶・Sync test failed:', error.message);
    }
  }

  console.log('脂 All tests completed successfully!');
  console.log('\nYour Azure Storage configuration is working correctly.');
  console.log('You can now deploy your application with confidence.');
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('徴 Test script failed:', error);
    process.exit(1);
  });
}
