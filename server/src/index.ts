import express from 'express';

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
app.get('/api/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import Azure Functions handlers using dynamic import
const authLoginHandler = await import('./api/auth/login/index.js');
const authLogoutHandler = await import('./api/auth/logout/index.js');
const authMeHandler = await import('./api/auth/me/index.js');
const machinesHandler = await import('./api/machines/index.js');
const machineTypesHandler = await import('./api/machines/machine-types/index.js');
const knowledgeBaseHandler = await import('./api/knowledge-base/index.js');
const knowledgeBaseImagesHandler = await import('./api/knowledge-base/images/index.js');
const healthHandler = await import('./api/health/index.js');
const usersHandler = await import('./api/users/index.js');
const flowsHandler = await import('./api/flows/index.js');
const imagesHandler = await import('./api/images/index.js');
const techSupportHandler = await import('./api/tech-support/index.js');
const gptCheckHandler = await import('./api/gpt-check/index.js');
const dbCheckHandler = await import('./api/db-check/index.js');
const dataProcessorHandler = await import('./api/data-processor/index.js');
const settingsHandler = await import('./api/settings/index.js');
const filesHandler = await import('./api/files/index.js');
const historyHandler = await import('./api/history/index.js');
const knowledgeHandler = await import('./api/knowledge/index.js');
const troubleshootingHandler = await import('./api/troubleshooting/index.js');
const dataKnowledgeBaseHandler = await import('./api/data/knowledge-base/index.js');

// Mount API routes as Azure Functions handlers
app.all('/api/auth/login', (req, _res) => {
  const context = { log: console.log };
  authLoginHandler.default(context, req);
});

app.all('/api/auth/logout', (req, _res) => {
  const context = { log: console.log };
  authLogoutHandler.default(context, req);
});

app.all('/api/auth/me', (req, _res) => {
  const context = { log: console.log };
  authMeHandler.default(context, req);
});

app.all('/api/machines', (req, _res) => {
  const context = { log: console.log };
  machinesHandler.default(context, req);
});

app.all('/api/machines/machine-types', (req, _res) => {
  const context = { log: console.log };
  machineTypesHandler.default(context, req);
});

app.all('/api/knowledge-base', (req, _res) => {
  const context = { log: console.log };
  knowledgeBaseHandler.default(context, req);
});

app.all('/api/knowledge-base/images', (req, _res) => {
  const context = { log: console.log };
  knowledgeBaseImagesHandler.default(context, req);
});

app.all('/api/health', (req, _res) => {
  const context = { log: console.log };
  healthHandler.default(context, req);
});

app.all('/api/users', (req, _res) => {
  const context = { log: console.log };
  usersHandler.default(context, req);
});

app.all('/api/flows', (req, _res) => {
  const context = { log: console.log };
  flowsHandler.default(context, req);
});

app.all('/api/images', (req, _res) => {
  const context = { log: console.log };
  imagesHandler.default(context, req);
});

app.all('/api/tech-support', (req, _res) => {
  const context = { log: console.log };
  techSupportHandler.default(context, req);
});

app.all('/api/gpt-check', (req, _res) => {
  const context = { log: console.log };
  gptCheckHandler.default(context, req);
});

app.all('/api/db-check', (req, _res) => {
  const context = { log: console.log };
  dbCheckHandler.default(context, req);
});

app.all('/api/data-processor', (req, _res) => {
  const context = { log: console.log };
  dataProcessorHandler.default(context, req);
});

app.all('/api/settings', (req, _res) => {
  const context = { log: console.log };
  settingsHandler.default(context, req);
});

app.all('/api/files', (req, _res) => {
  const context = { log: console.log };
  filesHandler.default(context, req);
});

app.all('/api/history', (req, _res) => {
  const context = { log: console.log };
  historyHandler.default(context, req);
});

app.all('/api/knowledge', (req, _res) => {
  const context = { log: console.log };
  knowledgeHandler.default(context, req);
});

app.all('/api/troubleshooting', (req, _res) => {
  const context = { log: console.log };
  troubleshootingHandler.default(context, req);
});

app.all('/api/data/knowledge-base', (req, _res) => {
  const context = { log: console.log };
  dataKnowledgeBaseHandler.default(context, req);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});