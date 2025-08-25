import express from 'express';
import { storage } from '../storage.js';
import { getOpenAIClientStatus } from '../lib/openai.js';

const router = express.Router();

// 蝓ｺ譛ｬ逧・↑繝倥Ν繧ｹ繝√ぉ繝・け
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Emergency Assistance Backend',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹メ繧ｧ繝・け
router.get('/db', async (req, res) => {
  try {
    const isConnected = await storage.testConnection();
    
    if (isConnected) {
      res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Database health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GPT/OpenAI謗･邯壹メ繧ｧ繝・け
router.get('/gpt', async (req, res) => {
  try {
    const clientStatus = getOpenAIClientStatus();
    
    if (clientStatus.clientExists && clientStatus.apiKeyExists && !clientStatus.isMockKey) {
      // 螳滄圀縺ｮGPT謗･邯壹ユ繧ｹ繝・
      const { processOpenAIRequest } = await import('../lib/openai.js');
      const testResponse = await processOpenAIRequest('Health check', false);
      
      res.json({
        status: 'healthy',
        gpt: 'connected',
        apiKeyPrefix: clientStatus.apiKeyPrefix,
        timestamp: new Date().toISOString(),
        testResponse: testResponse.substring(0, 100) + '...'
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        gpt: 'not configured',
        details: {
          clientExists: clientStatus.clientExists,
          apiKeyExists: clientStatus.apiKeyExists,
          isMockKey: clientStatus.isMockKey
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('GPT health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      gpt: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 蜈ｨ菴鍋噪縺ｪ繧ｷ繧ｹ繝・Β繝√ぉ繝・け
router.get('/system', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    service: 'healthy',
    database: 'unknown',
    gpt: 'unknown',
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'configured' : 'not configured'
    }
  };

  // 繝・・繧ｿ繝吶・繧ｹ繝√ぉ繝・け
  try {
    const isDbConnected = await storage.testConnection();
    checks.database = isDbConnected ? 'healthy' : 'unhealthy';
  } catch (error) {
    checks.database = 'error';
  }

  // GPT繝√ぉ繝・け
  try {
    const clientStatus = getOpenAIClientStatus();
    if (clientStatus.clientExists && clientStatus.apiKeyExists && !clientStatus.isMockKey) {
      checks.gpt = 'healthy';
    } else {
      checks.gpt = 'not configured';
    }
  } catch (error) {
    checks.gpt = 'error';
  }

  // 蜈ｨ菴薙せ繝・・繧ｿ繧ｹ縺ｮ豎ｺ螳・
  const hasIssues = checks.database !== 'healthy' || checks.gpt !== 'healthy';
  const statusCode = hasIssues ? 503 : 200;
  
  res.status(statusCode).json(checks);
});

export { router as healthRouter };
