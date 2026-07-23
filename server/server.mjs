import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

process.chdir(rootDir);
console.log('  Working directory set to:', process.cwd());

import { createApp } from './src/app.mjs';
import { PORT } from './src/config/env.mjs';
import { initializeDatabase, ensureTables } from './src/infra/db.mjs';
import { getBlobServiceClient, containerName } from './src/infra/blob.mjs';

console.log('  Production Server Starting...');

async function startupSequence() {
  console.log('  Running startup sequence...');

  const dbInitialized = initializeDatabase();
  if (dbInitialized) {
    await ensureTables();
  }

  const blobClient = getBlobServiceClient();
  if (blobClient) {
    try {
      const containerClient = blobClient.getContainerClient(containerName);
      const exists = await containerClient.exists();
      if (!exists) {
        console.log(`  Creating container: ${containerName}`);
        await containerClient.createIfNotExists();
      } else {
        console.log(`  Container exists: ${containerName}`);
      }
    } catch (err) {
      console.error('  Blob storage check failed:', err.message);
    }
  }
}

(async () => {
  try {
    const app = await createApp();
    const listenPort = Number(process.env.PORT || PORT || 8080);

    const server = app.listen(listenPort, '0.0.0.0', () => {
      console.log('');
      console.log('  ================================================');
      console.log('  Production Server Started Successfully!');
      console.log(`  Listening on port ${listenPort}`);
      console.log('  ================================================');

      startupSequence().catch(err => {
        console.error('  Startup sequence error:', err);
      });
    });

    const shutdown = sig => () => {
      console.log(`  Received ${sig}, shutting down...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT', shutdown('SIGINT'));
  } catch (err) {
    console.error('  Failed to start server:', err);
    process.exit(1);
  }
})();