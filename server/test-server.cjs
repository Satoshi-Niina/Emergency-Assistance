#!/usr/bin/env node

console.log('Starting test server...');

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/healthz', (req, res) => {
  res.send('ok');
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

console.log(`Starting server on ${host}:${port}`);

const server = app.listen(port, host, () => {
  console.log(`Listening on ${host}:${port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

console.log('Server setup complete');
