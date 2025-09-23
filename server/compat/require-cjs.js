import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// CJS compatibility layer for ESM
export { require, __dirname, __filename };

// Helper function to load CJS modules
export function loadCJS(modulePath) {
  return require(modulePath);
}

// Helper function to load JSON files
export function loadJSON(filePath) {
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.resolve(__dirname, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(content);
}

// Helper function to get __dirname in ESM context
export function getDirname(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

// Helper function to resolve paths
export function resolvePath(importMetaUrl, ...paths) {
  return join(dirname(fileURLToPath(importMetaUrl)), ...paths);
}
