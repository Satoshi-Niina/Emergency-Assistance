#!/usr/bin/env node
/**
 * 本番環境 BLOB ストレージ診断スクリプト
 * 
 * 使用方法:
 * node scripts/diagnose-blob-production.mjs
 */

import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   🔍 BLOB Storage Production Diagnosis                   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

async function diagnose() {
  try {
    // Step 1: 環境変数確認
    console.log('📋 Step 1: Environment Variables Check');
    console.log('─────────────────────────────────────────────────────────');
    console.log('AZURE_STORAGE_CONNECTION_STRING:', AZURE_STORAGE_CONNECTION_STRING ? '✅ SET' : '❌ NOT SET');
    console.log('AZURE_STORAGE_CONTAINER_NAME:', AZURE_STORAGE_CONTAINER_NAME);
    console.log('');

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      console.error('❌ ERROR: AZURE_STORAGE_CONNECTION_STRING is not set!');
      console.log('');
      console.log('Please set it in:');
      console.log('  - Azure Portal > App Service > Configuration');
      console.log('  - Or locally in .env file');
      process.exit(1);
    }

    // Step 2: BLOB接続テスト
    console.log('🔗 Step 2: BLOB Service Connection Test');
    console.log('─────────────────────────────────────────────────────────');
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    console.log('✅ BlobServiceClient created successfully');
    console.log('');

    // Step 3: コンテナ存在確認
    console.log(`📦 Step 3: Container Existence Check (${AZURE_STORAGE_CONTAINER_NAME})`);
    console.log('─────────────────────────────────────────────────────────');
    
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    const containerExists = await containerClient.exists();
    
    console.log('Container exists:', containerExists ? '✅ YES' : '❌ NO');
    
    if (!containerExists) {
      console.log('');
      console.log('❌ Container does not exist!');
      console.log('');
      console.log('Actions:');
      console.log('  1. Create container manually in Azure Portal:');
      console.log(`     Storage Account > Containers > Add: "${AZURE_STORAGE_CONTAINER_NAME}"`);
      console.log('  2. Set Public Access Level: Container');
      console.log('  3. Or run: npm run create-container');
      process.exit(1);
    }
    console.log('');

    // Step 4: コンテナプロパティ確認
    console.log('📊 Step 4: Container Properties');
    console.log('─────────────────────────────────────────────────────────');
    
    const properties = await containerClient.getProperties();
    console.log('Public Access:', properties.publicAccess || 'none');
    console.log('Last Modified:', properties.lastModified?.toISOString());
    console.log('');

    // Step 5: Blob一覧取得 (先頭10件)
    console.log('📄 Step 5: Blob List (First 10 items)');
    console.log('─────────────────────────────────────────────────────────');
    
    let blobCount = 0;
    let imageCount = 0;
    let exportCount = 0;
    
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'knowledge-base/' })) {
      if (blobCount < 10) {
        console.log(`  ${blobCount + 1}. ${blob.name} (${(blob.properties.contentLength / 1024).toFixed(2)} KB)`);
      }
      
      blobCount++;
      if (blob.name.includes('images/')) imageCount++;
      if (blob.name.includes('exports/')) exportCount++;
    }
    
    console.log('');
    console.log('Summary:');
    console.log(`  Total Blobs: ${blobCount}`);
    console.log(`  Images: ${imageCount}`);
    console.log(`  Exports: ${exportCount}`);
    console.log('');

    // Step 6: 画像アップロードテスト
    console.log('🧪 Step 6: Upload Test (Test Image)');
    console.log('─────────────────────────────────────────────────────────');
    
    const testBlobName = `knowledge-base/images/chat-exports/test_${Date.now()}.txt`;
    const testContent = 'BLOB upload test - ' + new Date().toISOString();
    const testBlockBlobClient = containerClient.getBlockBlobClient(testBlobName);
    
    console.log('Uploading test blob:', testBlobName);
    await testBlockBlobClient.upload(testContent, testContent.length, {
      blobHTTPHeaders: { blobContentType: 'text/plain' }
    });
    
    console.log('✅ Upload successful');
    
    const uploadedExists = await testBlockBlobClient.exists();
    console.log('Verification:', uploadedExists ? '✅ Blob exists after upload' : '❌ Blob not found after upload');
    
    if (uploadedExists) {
      console.log('Blob URL:', testBlockBlobClient.url);
      
      // クリーンアップ
      console.log('Cleaning up test blob...');
      await testBlockBlobClient.delete();
      console.log('✅ Test blob deleted');
    }
    console.log('');

    // 最終結果
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Diagnosis Complete - All Checks Passed!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('BLOB storage is fully functional.');
    console.log('If you are experiencing upload errors in production,');
    console.log('check Application Logs in Azure Portal:');
    console.log('  App Service > Monitoring > Log stream');
    
  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║   ❌ Diagnosis Failed                                    ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code === 'ContainerNotFound') {
      console.error('→ Container does not exist. Create it in Azure Portal.');
    } else if (error.code === 'AuthenticationFailed') {
      console.error('→ Connection string is invalid or expired.');
    } else if (error.code === 'AccountNotFound') {
      console.error('→ Storage account does not exist or is inaccessible.');
    } else {
      console.error('Details:', error);
    }
    
    process.exit(1);
  }
}

diagnose();
