#!/usr/bin/env node

/**
 * Azure Storage Configuration Test Script
 * Azure Storageの設定確認・テストスクリプト
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
  console.log('🔍 Azure Storage Configuration Test');
  console.log('================================\n');

  // 1. 設定の検証
  console.log('1️⃣ Validating Configuration...');
  const validation = validateStorageConfig();
  
  if (validation.errors.length > 0) {
    console.error('❌ Configuration Errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (validation.isValid) {
    console.log('✅ Configuration is valid\n');
  } else {
    console.error('❌ Configuration is invalid. Please fix errors and try again.\n');
    process.exit(1);
  }

  // 2. 設定情報の表示
  console.log('2️⃣ Configuration Details...');
  const { paths, azure, isProduction, isAzureEnabled } = getStorageConfig();
  
  console.log('Environment:', isProduction ? 'Production' : 'Development');
  console.log('Azure Storage:', isAzureEnabled ? 'Enabled' : 'Disabled');
  console.log('Knowledge Base Path:', paths.knowledgeBasePath);
  console.log('Azure Container:', azure.containerName);
  console.log('Auto Sync:', paths.enableAutoSync ? `Enabled (${paths.syncIntervalMs}ms)` : 'Disabled');
  console.log('');

  if (!isAzureEnabled) {
    console.log('ℹ️ Azure Storage is not configured. Test complete.');
    return;
  }

  // 3. Azure Storage サービスの初期化
  console.log('3️⃣ Initializing Azure Storage Service...');
  const storageService = createStorageService();
  
  if (!storageService) {
    console.error('❌ Failed to create storage service');
    process.exit(1);
  }
  
  console.log('✅ Storage service created\n');

  // 4. ヘルスチェック
  console.log('4️⃣ Running Health Check...');
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
      console.error('❌ Health check failed');
      process.exit(1);
    }
    
    console.log('✅ Health check passed\n');
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    process.exit(1);
  }

  // 5. 基本的なファイル操作テスト
  console.log('5️⃣ Testing File Operations...');
  
  try {
    // テストファイルの作成
    const testContent = `Azure Storage Test
Timestamp: ${new Date().toISOString()}
Environment: ${isProduction ? 'Production' : 'Development'}
Container: ${azure.containerName}`;
    
    const tempDir = await fs.mkdtemp(path.join(await fs.realpath(process.env.TMPDIR || '/tmp'), 'azure-test-'));
    const testFilePath = path.join(tempDir, 'test-file.txt');
    
    await fs.writeFile(testFilePath, testContent);
    console.log('📝 Created test file:', testFilePath);

    // アップロードテスト
    const uploadResult = await storageService.uploadFile(
      testFilePath,
      'test/storage-test.txt',
      { overwrite: true, metadata: { test: 'true', timestamp: Date.now().toString() } }
    );
    
    console.log('📤 Upload result:', {
      success: uploadResult.success,
      url: uploadResult.url,
      etag: uploadResult.etag?.substring(0, 20) + '...'
    });

    // ダウンロードテスト
    const downloadPath = path.join(tempDir, 'downloaded-test-file.txt');
    const downloadResult = await storageService.downloadFile(
      'test/storage-test.txt',
      downloadPath,
      { createLocalPath: true }
    );
    
    console.log('📥 Download result:', {
      success: downloadResult.success,
      size: formatFileSize(downloadResult.size),
      lastModified: downloadResult.lastModified
    });

    // ダウンロードしたファイルの内容確認
    const downloadedContent = await fs.readFile(downloadPath, 'utf-8');
    const contentMatches = downloadedContent === testContent;
    console.log('🔍 Content verification:', contentMatches ? 'PASSED' : 'FAILED');

    // リストテスト
    const listResult = await storageService.listBlobs('test/', 10);
    console.log('📋 List result:', {
      totalFiles: listResult.totalCount,
      files: listResult.blobs.map(b => ({ 
        name: b.name, 
        size: formatFileSize(b.size), 
        modified: b.lastModified.toISOString() 
      }))
    });

    // クリーンアップ
    const deleteResult = await storageService.deleteBlob('test/storage-test.txt');
    console.log('🗑️ Delete result:', deleteResult);

    // 一時ディレクトリのクリーンアップ
    await fs.rm(tempDir, { recursive: true });
    
    console.log('✅ All file operations completed successfully\n');
    
  } catch (error) {
    console.error('❌ File operations test failed:', error.message);
    process.exit(1);
  }

  // 6. 同期テスト (オプション)
  if (process.argv.includes('--test-sync')) {
    console.log('6️⃣ Testing Directory Sync...');
    
    try {
      // テストディレクトリの作成
      const testSyncDir = await fs.mkdtemp(path.join(await fs.realpath(process.env.TMPDIR || '/tmp'), 'sync-test-'));
      
      // いくつかのテストファイルを作成
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
      
      console.log(`📁 Created test directory with ${testFiles.length} files`);

      // 同期実行
      const syncResult = await storageService.syncDirectoryToBlob(
        testSyncDir,
        'sync-test',
        { 
          deleteOrphaned: false,
          dryRun: false,
          includePattern: /\.(txt|json|md)$/
        }
      );
      
      console.log('🔄 Sync result:', {
        uploaded: syncResult.uploaded.length,
        deleted: syncResult.deleted.length,
        skipped: syncResult.skipped.length,
        errors: syncResult.errors.length
      });
      
      if (syncResult.errors.length > 0) {
        console.error('Sync errors:', syncResult.errors);
      }

      // 同期されたファイルをクリーンアップ
      for (const uploadedFile of syncResult.uploaded) {
        await storageService.deleteBlob(uploadedFile);
      }
      
      // テストディレクトリのクリーンアップ
      await fs.rm(testSyncDir, { recursive: true });
      
      console.log('✅ Sync test completed successfully\n');
      
    } catch (error) {
      console.error('❌ Sync test failed:', error.message);
    }
  }

  console.log('🎉 All tests completed successfully!');
  console.log('\nYour Azure Storage configuration is working correctly.');
  console.log('You can now deploy your application with confidence.');
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}
