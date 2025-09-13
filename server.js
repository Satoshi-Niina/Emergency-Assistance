// Azure App Service エントリーポイント - 確実起動版
require('dotenv').config();

// ビルドされたサーバーファイルを読み込み
const serverPath = './server/dist/azure-production-server-v2.js';

try {
  console.log('🚀 Starting Emergency Assistance Backend...');
  console.log(`📁 Loading server from: ${serverPath}`);
  
  // ビルドされたサーバーファイルを動的に読み込み
  const server = require(serverPath);
  
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load server module:', error.message);
  
  // フォールバック: 最小限のサーバーを起動
  console.log('🔄 Starting fallback server...');
  
  const express = require('express');
  const cors = require('cors');
  
  const app = express();
  const port = process.env.PORT || 80;
  
  app.use(cors());
  app.use(express.json());
  
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'emergency-assistance-backend-fallback',
      time: new Date().toISOString(),
      version: 'fallback-1.0.0',
      error: 'Main server failed to load'
    });
  });
  
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      mode: 'fallback',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend'
    });
  });
  
  app.listen(port, () => {
    console.log(`✅ Fallback server running on port ${port}`);
  });
}
