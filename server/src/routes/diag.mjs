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
