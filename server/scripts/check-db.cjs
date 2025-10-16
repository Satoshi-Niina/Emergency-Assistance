const path = require('path');
// Load .env from server directory explicitly
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), encoding: 'utf8' });
console.log('→ [check-db] process.cwd():', process.cwd());
console.log('→ [check-db] Loaded DATABASE_URL:', process.env.DATABASE_URL);

const { db } = require('../src/api/db/index.js');

(async () => {
  try {
    console.log('→ [check-db] Running db.execute("SELECT NOW()")');
    const res = await db.execute('SELECT NOW()');
    console.log('→ [check-db] db.execute result:', res);
  } catch (e) {
    console.error('→ [check-db] db.execute error:', e && e.message ? e.message : e);
  } finally {
    process.exit(0);
  }
})();