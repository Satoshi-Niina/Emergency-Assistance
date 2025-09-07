import type { Express } from 'express';

export async function registerRoutes(app: Express) {
  await mountIfExists(app, '/api/files', './files.js');
  await mountIfExists(app, '/api/auth',  './auth.js');

  if (process.env.TECH_SUPPORT_ENABLED !== 'false') {
    await mountIfExists(app, '/api/tech-support', './tech-support.js');
  } else {
    console.warn('[routes] tech-support disabled by env');
  }

  // 他のルートを一時的に無効化（FS操作が含まれている可能性があるため）
  // await mountIfExists(app, '/api/emergency-guide', './emergency-guide.js');
  // await mountIfExists(app, '/api/emergency-flow', './emergency-flow.js');
}

async function mountIfExists(app: Express, basePath: string, modulePath: string) {
  try {
    const mod = await import(modulePath);
    const router = mod.default ?? mod.router ?? mod;
    if (typeof router === 'function') {
      app.use(basePath, router);
      console.log(`[routes] mounted ${basePath} from ${modulePath}`);
    } else {
      console.warn(`[routes] ${modulePath} has no default export/router`);
    }
  } catch (e) {
    console.warn(`[routes] skip ${modulePath}:`, (e as Error)?.message);
  }
}
