#!/usr/bin/env node

// Azure App Service 用最小限ヘルスサーバー
// 503エラー解消専用

const express = require('express');

const app = express();
const port = process.env.PORT || 3001;

// 最優先: I/Oなしの即座ヘルスチェック
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: process.env.HELLO_ONLY === 'true' ? 'hello' : 'normal',
    time: new Date().toISOString(),
    service: 'emergency-assistance-backend'
  });
});

// Azure App Service 用の追加エンドポイント
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend'
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

app.get('/', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal health server listening on http://0.0.0.0:${port}`);
  console.log(`🔍 Available endpoints:`);
  console.log(`   GET /health     - Main health check`);
  console.log(`   GET /api/health - Legacy health check`);
  console.log(`   GET /healthz    - Kubernetes-style check`);
  console.log(`   GET /           - Root check`);
});

// プロセス終了処理
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
