import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

/*
Usage (PowerShell example):
  $env:DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require";
  npx tsx server/scripts/verify-user-password.ts niina G&896845a

Prints whether the supplied password matches the stored hash/plaintext.
*/

async function main() {
  const [,, username, password] = process.argv;
  if (!username || !password) {
    console.error('Usage: tsx server/scripts/verify-user-password.ts <username> <password>');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const r = await client.query('SELECT id, username, password, role FROM users WHERE username=$1 LIMIT 1', [username]);
    if (r.rowCount === 0) {
      console.log('NOT_FOUND');
      return;
    }
    const row = r.rows[0];
    const hash: string = row.password || '';
    const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
    let ok = false;
    if (isBcrypt) {
      ok = await bcrypt.compare(password, hash).catch(()=>false);
    } else {
      ok = (password === hash);
    }
    console.log(JSON.stringify({ username: row.username, role: row.role, isBcrypt, match: ok, hashPrefix: hash.slice(0,7) }));
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(99); });
