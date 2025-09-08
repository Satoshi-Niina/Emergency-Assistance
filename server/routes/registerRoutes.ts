import type { Express, Router } from 'express';

export async function registerRoutes(app: Express) {
  await mountIfExists(app, '/api/files', './files.js');
  await mountIfExists(app, '/api/auth',  './auth.js');
  await mountIfExists(app, '/api/knowledge-base', './knowledge-base.js');
  await mountIfExists(app, '/api/knowledge', './knowledge.js');
  await mountIfExists(app, '/api/machines', './machines.js');
  await mountIfExists(app, '/api/openai', './openai.js');
  // System diagnostics (DB/GPT health checks)
  await mountIfExists(app, '/api', './system-check.js');

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
    // tsx(dev) では .js 拡張子の動的 import が失敗するため、.ts へフォールバック
    let mod: unknown;
    try {
      mod = await import(modulePath);
    } catch (e) {
      if (modulePath.endsWith('.js')) {
        const tsPath = modulePath.replace(/\.js$/,'.ts');
        try {
          mod = await import(tsPath);
          console.log(`[routes] fallback loaded TS module for ${basePath}: ${tsPath}`);
        } catch (e2) {
          throw e; // もとのエラーを報告
        }
      } else {
        throw e;
      }
    }

    // default export または router を抽出
    const maybeModule = mod as Record<string, unknown>;
    const routerCandidate = (maybeModule.default ?? maybeModule.router ?? maybeModule) as unknown;

    // Router のみマウント
    if (typeof routerCandidate === 'function') {
      const router = routerCandidate as Router;
      app.use(basePath, router);
      console.log(`[routes] mounted ${basePath} from ${modulePath}`);
    } else {
      console.warn(`[routes] ${modulePath} has no default export/router`);
    }
  } catch (e) {
    console.warn(`[routes] skip ${modulePath}:`, (e as Error)?.message);
  }
}
