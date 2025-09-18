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

// Import Azure Functions handlers using require
const authLoginHandler = require('./api/auth/login/index.js');
const authLogoutHandler = require('./api/auth/logout/index.js');
const authMeHandler = require('./api/auth/me/index.js');
const machinesHandler = require('./api/machines/index.js');
const machineTypesHandler = require('./api/machines/machine-types/index.js');
const knowledgeBaseHandler = require('./api/knowledge-base/index.js');
const knowledgeBaseImagesHandler = require('./api/knowledge-base/images/index.js');
const healthHandler = require('./api/health/index.js');
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
app.all('/api/auth/login', (req, res) => {
  const context = { log: console.log };
  authLoginHandler(context, req);
});

app.all('/api/auth/logout', (req, res) => {
  const context = { log: console.log };
  authLogoutHandler(context, req);
});

app.all('/api/auth/me', (req, res) => {
  const context = { log: console.log };
  authMeHandler(context, req);
});

app.all('/api/machines', (req, res) => {
  const context = { log: console.log };
  machinesHandler(context, req);
});

app.all('/api/machines/machine-types', (req, res) => {
  const context = { log: console.log };
  machineTypesHandler(context, req);
});

app.all('/api/knowledge-base', (req, res) => {
  const context = { log: console.log };
  knowledgeBaseHandler(context, req);
});

app.all('/api/knowledge-base/images', (req, res) => {
  const context = { log: console.log };
  knowledgeBaseImagesHandler(context, req);
});

app.all('/api/health', (req, res) => {
  const context = { log: console.log };
  healthHandler(context, req);
});

app.all('/api/flows', (req, res) => {
  const context = { log: console.log };
  flowsHandler(context, req);
});

app.all('/api/images', (req, res) => {
  const context = { log: console.log };
  imagesHandler(context, req);
});

app.all('/api/tech-support', (req, res) => {
  const context = { log: console.log };
  techSupportHandler(context, req);
});

app.all('/api/gpt-check', (req, res) => {
  const context = { log: console.log };
  gptCheckHandler(context, req);
});

app.all('/api/db-check', (req, res) => {
  const context = { log: console.log };
  dbCheckHandler(context, req);
});

app.all('/api/data-processor', (req, res) => {
  const context = { log: console.log };
  dataProcessorHandler(context, req);
});

app.all('/api/settings', (req, res) => {
  const context = { log: console.log };
  settingsHandler(context, req);
});

app.all('/api/files', (req, res) => {
  const context = { log: console.log };
  filesHandler(context, req);
});

app.all('/api/history', (req, res) => {
  const context = { log: console.log };
  historyHandler(context, req);
});

app.all('/api/knowledge', (req, res) => {
  const context = { log: console.log };
  knowledgeHandler(context, req);
});

app.all('/api/troubleshooting', (req, res) => {
  const context = { log: console.log };
  troubleshootingHandler(context, req);
});

app.all('/api/data/knowledge-base', (req, res) => {
  const context = { log: console.log };
  dataKnowledgeBaseHandler(context, req);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
