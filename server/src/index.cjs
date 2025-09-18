const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoint
app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for debugging
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Emergency Assistance API Server', 
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/healthz',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/machines',
      '/api/users'
    ]
  });
});

// Import Azure Functions handlers using require
const authLoginHandler = require('./api/auth/login/index.js');
const authLogoutHandler = require('./api/auth/logout/index.js');
const authMeHandler = require('./api/auth/me/index.js');
const machinesHandler = require('./api/machines/index.js');
const machineTypesHandler = require('./api/machines/machine-types/index.js');
const knowledgeBaseHandler = require('./api/knowledge-base/index.js');
const knowledgeBaseImagesHandler = require('./api/knowledge-base/images/index.js');
const healthHandler = require('./api/health/index.js');
// const usersHandler = require('./api/users/index.js');
const flowsHandler = require('./api/flows/index.js');
const imagesHandler = require('./api/images/index.js');
const techSupportHandler = require('./api/tech-support/index.js');
const gptCheckHandler = require('./api/gpt-check/index.js');
const dbCheckHandler = require('./api/db-check/index.js');
const dataProcessorHandler = require('./api/data-processor/index.js');
const settingsHandler = require('./api/settings/index.js');
const filesHandler = require('./api/files/index.js');
const historyHandler = require('./api/history/index.js');
const knowledgeHandler = require('./api/knowledge/index.js');
const troubleshootingHandler = require('./api/troubleshooting/index.js');
const dataKnowledgeBaseHandler = require('./api/data/knowledge-base/index.js');

// Mount API routes as Azure Functions handlers
app.all('/api/auth/login', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await authLoginHandler(context, req);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/auth/logout', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await authLogoutHandler(context, req);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/auth/me', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await authMeHandler(context, req);
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/machines', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await machinesHandler(context, req);
  } catch (error) {
    console.error('Machines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/machines/machine-types', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await machineTypesHandler(context, req);
  } catch (error) {
    console.error('Machine types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/knowledge-base', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await knowledgeBaseHandler(context, req);
  } catch (error) {
    console.error('Knowledge base error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/knowledge-base/images', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await knowledgeBaseImagesHandler(context, req);
  } catch (error) {
    console.error('Knowledge base images error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/health', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await healthHandler(context, req);
  } catch (error) {
    console.error('Health error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.all('/api/users', (req, res) => {
//   const context = { log: console.log };
//   usersHandler(context, req);
// });

app.all('/api/flows', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await flowsHandler(context, req);
  } catch (error) {
    console.error('Flows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/images', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await imagesHandler(context, req);
  } catch (error) {
    console.error('Images error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/tech-support', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await techSupportHandler(context, req);
  } catch (error) {
    console.error('Tech support error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/gpt-check', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await gptCheckHandler(context, req);
  } catch (error) {
    console.error('GPT check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/db-check', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await dbCheckHandler(context, req);
  } catch (error) {
    console.error('DB check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/data-processor', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await dataProcessorHandler(context, req);
  } catch (error) {
    console.error('Data processor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/settings', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await settingsHandler(context, req);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/files', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await filesHandler(context, req);
  } catch (error) {
    console.error('Files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/history', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await historyHandler(context, req);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/knowledge', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await knowledgeHandler(context, req);
  } catch (error) {
    console.error('Knowledge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/troubleshooting', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await troubleshootingHandler(context, req);
  } catch (error) {
    console.error('Troubleshooting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/data/knowledge-base', async (req, res) => {
  const context = { 
    log: console.log,
    res: {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    }
  };
  try {
    await dataKnowledgeBaseHandler(context, req);
  } catch (error) {
    console.error('Data knowledge base error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
