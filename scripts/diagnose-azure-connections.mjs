#!/usr/bin/env node
// Azure 接続診断スクリプト
// フロント(Static Web Apps) → バックエンド(App Service) → PostgreSQL の疎通状況を簡易確認
// 使い方:
//   node scripts/diagnose-azure-connections.mjs \
//     --backend https://emergency-backend-webapp.azurewebsites.net \
//     --static https://<your-static-web-app>.azurestaticapps.net \
//     --db <postgres-connection-string or env name>
// あるいは環境変数 BACKEND_BASE_URL / STATIC_BASE_URL / DATABASE_URL を設定

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

// デフォルトを Function App ドメインに変更
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
  console.log('=== Azure 接続診断開始 ===');
  console.log('Backend Base URL :', BACKEND_BASE_URL);
  console.log('Static Base URL  :', STATIC_BASE_URL || '(未指定)');
  console.log('DATABASE_URL     :', DB_URL ? redact(DB_URL) : '(未設定)');
  console.log('Node.js version  :', process.version);
  console.log('');

  console.log('--- Backend 直接疎通テスト ---');
  for (const ep of endpoints) {
    const r = await ping(BACKEND_BASE_URL, ep);
    console.log(`[backend:${ep.name}]`, r);
  }

  if (STATIC_BASE_URL) {
    console.log('\n--- Static Web Apps 経由疎通テスト (/api リバースプロキシ) ---');
    for (const ep of endpoints) {
      const r = await ping(STATIC_BASE_URL, ep);
      console.log(`[static-proxy:${ep.name}]`, r);
    }
  }

  // 簡易 DB 文字列解析
  if (DB_URL) {
    try {
      const u = new URL(DB_URL);
      console.log('\n--- DB 接続文字列解析 ---');
      console.log('ホスト:', u.hostname);
      console.log('ポート:', u.port || '5432(推定)');
      console.log('DB名 :', u.pathname.replace('/', ''));
      console.log('SSL  :', u.searchParams.get('sslmode') || '(未指定)');
      if (/\.postgres\.database\.azure\.com$/.test(u.hostname)) {
        console.log('Azure PostgreSQL ホスト形式を検出');
      }
    } catch (e) {
      console.warn('DB URL 解析失敗:', e.message);
    }
  }

  console.log('\n=== 診断終了 ===');
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
