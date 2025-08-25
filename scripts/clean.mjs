/* scripts/clean.mjs */
import { rm } from 'node:fs/promises';
const targets = [
  'dist','build','.vite','.next','.nuxt','out',
  '.parcel-cache','.turbo','.swc','.cache','.eslintcache',
  'coverage','.vercel/output','.svelte-kit',
  'client/dist','server/dist'
];
const run = async () => {
  for (const t of targets) {
    try { await rm(t, { recursive: true, force: true }); console.log('[clean] removed:', t); }
    catch { /* ignore */ }
  }
};
run();
