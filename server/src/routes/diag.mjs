import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VERSION, AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER_NAME } from '../config/env.mjs';
import { getBlobServiceClient, containerName } from '../infra/blob.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const router = express.Router();

// Environment check
router.get('/env', (req, res) => {
  const safeEnv = {};
  const unsafeKeys = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'CONN', 'CREDENTIAL'];
  
  Object.keys(process.env).forEach(key => {
    if (unsafeKeys.some(unsafe => key.toUpperCase().includes(unsafe))) {
      safeEnv[key] = process.env[key] ? '[REDACTED]' : '[NOT SET]';
    } else {
      safeEnv[key] = process.env[key];
    }
  });
  
  res.json({
    env: safeEnv,
    cwd: process.cwd(),
    dirname: __dirname,
    timestamp: new Date().toISOString(),
    // 重要な環境変数の確認
    criticalEnvVars: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET',
      AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ SET' : '❌ NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set'
    }
  });
});

// Blob test
router.get('/blob-test', async (req, res) => {
  try {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) {
      return res.status(503).json({ error: 'Blob service client not initialized' });
    }
    
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const exists = await containerClient.exists();
    
    res.json({
      status: 'ok',
      container: containerName,
      exists: exists,
      accountName: blobServiceClient.accountName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 詳細BLOB診断 (画像アップロード問題用)
router.get('/blob-detailed', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      containerName: containerName,
      connectionStringSet: !!AZURE_STORAGE_CONNECTION_STRING,
      containerNameFromEnv: AZURE_STORAGE_CONTAINER_NAME
    },
    tests: {}
  };

  try {
    // Test 1: Client initialization
    const blobServiceClient = getBlobServiceClient();
    diagnostics.tests.clientInit = blobServiceClient ? '✅ Success' : '❌ Failed';
    
    if (!blobServiceClient) {
      diagnostics.error = 'BLOB client could not be initialized';
      return res.status(503).json(diagnostics);
    }

    diagnostics.config.accountName = blobServiceClient.accountName;

    // Test 2: Container existence
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const containerExists = await containerClient.exists();
    diagnostics.tests.containerExists = containerExists ? '✅ Exists' : '❌ Not Found';

    if (!containerExists) {
      diagnostics.error = `Container '${containerName}' does not exist`;
      diagnostics.solution = 'Create container in Azure Portal or run: az storage container create';
      return res.status(404).json(diagnostics);
    }

    // Test 3: Container properties
    const containerProps = await containerClient.getProperties();
    diagnostics.tests.containerProps = '✅ Retrieved';
    diagnostics.container = {
      publicAccess: containerProps.publicAccess || 'none',
      lastModified: containerProps.lastModified?.toISOString(),
      etag: containerProps.etag
    };

    // Test 4: Write permission test
    try {
      const testBlobName = `knowledge-base/test/diag-test-${Date.now()}.txt`;
      const testBlockBlobClient = containerClient.getBlockBlobClient(testBlobName);
      await testBlockBlobClient.upload('test', 4);
      diagnostics.tests.writePermission = '✅ Can Write';
      // Clean up test file
      await testBlockBlobClient.delete();
    } catch (writeError) {
      diagnostics.tests.writePermission = '❌ Cannot Write';
      diagnostics.writeError = {
        message: writeError.message,
        code: writeError.code,
        statusCode: writeError.statusCode
      };
    }

    // Test 5: List blobs (sample images)
    let imageBlobCount = 0;
    const sampleImageBlobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'knowledge-base/images/chat-exports/' })) {
      if (imageBlobCount < 5) {
        sampleImageBlobs.push({
          name: blob.name,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          lastModified: blob.properties.lastModified?.toISOString()
        });
      }
      imageBlobCount++;
    }
    diagnostics.tests.listImages = `✅ Found ${imageBlobCount} chat-export image blobs`;
    diagnostics.sampleImageBlobs = sampleImageBlobs;

    // Test 6: List troubleshooting flows
    let flowBlobCount = 0;
    const sampleFlowBlobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'knowledge-base/troubleshooting/' })) {
      if (flowBlobCount < 5) {
        sampleFlowBlobs.push({
          name: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified?.toISOString()
        });
      }
      flowBlobCount++;
    }
    diagnostics.tests.listFlows = `✅ Found ${flowBlobCount} troubleshooting flow blobs`;
    diagnostics.sampleFlowBlobs = sampleFlowBlobs;

    // Test 7: Image read test (if any images exist)
    if (imageBlobCount > 0 && sampleImageBlobs[0]) {
      try {
        const imageBlobName = sampleImageBlobs[0].name;
        const imageBlobClient = containerClient.getBlobClient(imageBlobName);
        const imageExists = await imageBlobClient.exists();
        diagnostics.tests.imageReadTest = imageExists ? '✅ Can read image blob' : '❌ Cannot read image blob';
        diagnostics.imageTestBlob = imageBlobName;
      } catch (imageError) {
        diagnostics.tests.imageReadTest = '❌ Image read failed';
        diagnostics.imageReadError = imageError.message;
      }
    } else {
      diagnostics.tests.imageReadTest = '⚠️ No images to test';
    }

    // Test 5: Upload test
    const testBlobName = `knowledge-base/images/chat-exports/_test_${Date.now()}.txt`;
    const testContent = 'Upload test - ' + new Date().toISOString();
    const testBlockBlobClient = containerClient.getBlockBlobClient(testBlobName);
    
    await testBlockBlobClient.upload(testContent, testContent.length, {
      blobHTTPHeaders: { blobContentType: 'text/plain' }
    });
    
    const uploadExists = await testBlockBlobClient.exists();
    diagnostics.tests.uploadTest = uploadExists ? '✅ Upload successful' : '❌ Upload failed';
    
    if (uploadExists) {
      diagnostics.testBlobUrl = testBlockBlobClient.url;
      // クリーンアップ
      await testBlockBlobClient.delete();
      diagnostics.tests.cleanup = '✅ Test blob deleted';
    }

    // Final status
    diagnostics.status = 'healthy';
    diagnostics.message = 'All BLOB storage tests passed successfully';

    res.json(diagnostics);

  } catch (error) {
    diagnostics.status = 'error';
    diagnostics.error = error.message;
    diagnostics.errorCode = error.code;
    diagnostics.errorDetails = {
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    res.status(500).json(diagnostics);
  }
});

export default function registerDiagRoutes(app) {
  app.use('/api/_diag', router);
  
  // Version info
  app.get('/api/version', (req, res) => {
    let deploymentInfo = {};
    try {
      const deployInfoPath = path.join(rootDir, 'deployment-info.json');
      if (fs.existsSync(deployInfoPath)) {
        deploymentInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not read deployment-info.json:', error.message);
    }

    res.json({
      version: VERSION,
      currentTime: new Date().toISOString(),
      deployment: deploymentInfo,
      environment: process.env.NODE_ENV || 'production'
    });
  });

  app.get('/deployment-info.json', (req, res) => {
    const deployInfoPath = path.join(rootDir, 'deployment-info.json');
    if (fs.existsSync(deployInfoPath)) {
      res.sendFile(deployInfoPath);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}
