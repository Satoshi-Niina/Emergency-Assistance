#!/usr/bin/env node
// Azure 謗･邯夊ｨｺ譁ｭ繧ｹ繧ｯ繝ｪ繝励ヨ
// 繝輔Ο繝ｳ繝・Static Web Apps) 竊・繝舌ャ繧ｯ繧ｨ繝ｳ繝・App Service) 竊・PostgreSQL 縺ｮ逍朱夂憾豕√ｒ邁｡譏鍋｢ｺ隱・
// 菴ｿ縺・婿:
//   node scripts/diagnose-azure-connections.mjs \
//     --backend https://emergency-backend-webapp.azurewebsites.net \
//     --static https://<your-static-web-app>.azurestaticapps.net \
//     --db <postgres-connection-string or env name>
// 縺ゅｋ縺・・迺ｰ蠅・､画焚 BACKEND_BASE_URL / STATIC_BASE_URL / DATABASE_URL 繧定ｨｭ螳・

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const key = a.replace(/^--/, '');
    const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    opts[key] = val;
  }
}

// 繝・ヵ繧ｩ繝ｫ繝医ｒ Function App 繝峨Γ繧､繝ｳ縺ｫ螟画峩
const BACKEND_BASE_URL = (opts.backend || process.env.BACKEND_BASE_URL || 'https://emergency-backend-api-efg6gaawcjdmaggy.japanwest-01.azurewebsites.net').replace(/\/$/, '');
const STATIC_BASE_URL = (opts.static || process.env.STATIC_BASE_URL || '').replace(/\/$/, '');
const DB_URL = process.env.DATABASE_URL || opts.db || '';

const endpoints = [
  { name: 'health', path: '/api/health' },
  { name: 'login (dummy)', path: '/api/auth/login', method: 'POST', body: { username: 'admin', password: 'admin123' } },
  { name: 'users', path: '/api/users' },
  { name: 'knowledge-base', path: '/api/knowledge-base' }
];

function redact(url) {
  if (!url) return '';
  return url.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@)/, (_, p1, _pwd, p3) => p1 + '***' + p3);
}

async function ping(base, ep) {
  const url = base + ep.path;
  const opts = { method: ep.method || 'GET', headers: { 'Content-Type': 'application/json' } };
  if (ep.body) opts.body = JSON.stringify(ep.body);
  const t0 = Date.now();
  try {
    const res = await fetch(url, opts);
    const dt = Date.now() - t0;
    const ct = res.headers.get('content-type') || '';
    let payloadSnippet = '';
    if (ct.includes('application/json')) {
      try {
        const json = await res.json();
        payloadSnippet = JSON.stringify({ success: json.success, keys: Object.keys(json) }, null, 0).slice(0, 160);
      } catch { /* ignore */ }
    } else {
      payloadSnippet = (await res.text()).slice(0, 120);
    }
    return { ok: res.ok, status: res.status, ms: dt, snippet: payloadSnippet };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('=== Azure 謗･邯夊ｨｺ譁ｭ髢句ｧ・===');
  console.log('Backend Base URL :', BACKEND_BASE_URL);
  console.log('Static Base URL  :', STATIC_BASE_URL || '(譛ｪ謖・ｮ・');
  console.log('DATABASE_URL     :', DB_URL ? redact(DB_URL) : '(譛ｪ險ｭ螳・');
  console.log('Node.js version  :', process.version);
  console.log('');

  console.log('--- Backend 逶ｴ謗･逍朱壹ユ繧ｹ繝・---');
  for (const ep of endpoints) {
    const r = await ping(BACKEND_BASE_URL, ep);
    console.log(`[backend:${ep.name}]`, r);
  }

  if (STATIC_BASE_URL) {
    console.log('\n--- Static Web Apps 邨檎罰逍朱壹ユ繧ｹ繝・(/api 繝ｪ繝舌・繧ｹ繝励Ο繧ｭ繧ｷ) ---');
    for (const ep of endpoints) {
      const r = await ping(STATIC_BASE_URL, ep);
      console.log(`[static-proxy:${ep.name}]`, r);
    }
  }

  // 邁｡譏・DB 譁・ｭ怜・隗｣譫・
  if (DB_URL) {
    try {
      const u = new URL(DB_URL);
      console.log('\n--- DB 謗･邯壽枚蟄怜・隗｣譫・---');
      console.log('繝帙せ繝・', u.hostname);
      console.log('繝昴・繝・', u.port || '5432(謗ｨ螳・');
      console.log('DB蜷・:', u.pathname.replace('/', ''));
      console.log('SSL  :', u.searchParams.get('sslmode') || '(譛ｪ謖・ｮ・');
      if (/\.postgres\.database\.azure\.com$/.test(u.hostname)) {
        console.log('Azure PostgreSQL 繝帙せ繝亥ｽ｢蠑上ｒ讀懷・');
      }
    } catch (e) {
      console.warn('DB URL 隗｣譫仙､ｱ謨・', e.message);
    }
  }

  console.log('\n=== 險ｺ譁ｭ邨ゆｺ・===');
}

main().catch(e => {
  console.error('閾ｴ蜻ｽ逧・お繝ｩ繝ｼ:', e);
  process.exit(1);
});
