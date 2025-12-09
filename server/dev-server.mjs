#!/usr/bin/env node
// 改良版ローカル開発サーバー
// src/app.mjsをベースに、Viteプロキシと開発機能を追加

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// カレントディレクトリをルートに変更
process.chdir(rootDir);
console.log('  Working directory set to:', process.cwd());

import { createApp } from './src/app.mjs';
import { PORT as DEFAULT_PORT } from './src/config/env.mjs';
import { initializeDatabase, ensureTables } from './src/infra/db.mjs';
import { getBlobServiceClient, containerName } from './src/infra/blob.mjs';
import { spawn } from 'child_process';

const PORT = process.env.PORT || DEFAULT_PORT || 8080;
const VITE_PORT = 5173;

console.log('🚀 Starting Local Development Server...');
console.log(`📊 Environment: development`);
console.log(`🔧 API Port: ${PORT}`);
console.log(`⚡ Vite Port: ${VITE_PORT}`);

async function startupSequence() {
  console.log('🔄 Running startup sequence...');
  
  // Database
  try {
    const dbInitialized = initializeDatabase();
    if (dbInitialized) {
      console.log('✅ Database initialized');
      await ensureTables();
      console.log('✅ Tables ensured');
    } else {
      console.warn('⚠️ Database not available');
    }
  } catch (err) {
    console.error('❌ Database setup error:', err.message);
  }

  // Blob Storage
  try {
    const blobClient = getBlobServiceClient();
    if (blobClient) {
      const containerClient = blobClient.getContainerClient(containerName);
      const exists = await containerClient.exists();
      if (!exists) {
        console.log(`📦 Creating container: ${containerName}`);
        await containerClient.createIfNotExists();
      } else {
        console.log(`✅ Container exists: ${containerName}`);
      }
    } else {
      console.warn('⚠️ Blob storage not available');
    }
  } catch (err) {
    console.error('❌ Blob storage check failed:', err.message);
  }
}

(async () => {
  try {
    // Expressアプリ作成（src/app.mjsを使用）
    const app = await createApp();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║   🚀 Local Development Server Started!          ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log(`║   📡 API:      http://localhost:${PORT}          ║`);
      console.log(`║   ⚡ Frontend: http://localhost:${VITE_PORT}         ║`);
      console.log(`║   🔥 Hot Reload: Enabled                        ║`);
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
      console.log('✨ Using modular API structure (src/api/*)');
      console.log('✨ Same as production environment');
      console.log('');
      
      startupSequence().catch(err => {
        console.error('❌ Startup sequence error:', err);
      });
    });

    // Graceful Shutdown
    const shutdown = (sig) => () => {
      console.log(`\n🛑 Received ${sig}, shutting down...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT', shutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();
