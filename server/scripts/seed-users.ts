/**
 * ユーザー初期投入 / 更新スクリプト
 * Option A: パスワードポリシー適合 (大文字/小文字/数字/記号 各1 + 8文字以上)
 * 実行例 (PowerShell):
 *   $env:DATABASE_URL="<your db url>"; npm run seed:users --prefix server
 *
 * 注意: 本番用固定パスワードをソースに残すのは推奨されません。デプロイ後は必ず変更してください。
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

interface SeedUserDef { username: string; password: string; displayName: string; role: string; department?: string | null; }

// 追加 / 更新したいユーザー (パスワードはポリシー準拠に修正済)
const seedUsers: SeedUserDef[] = [
  { username: 'niina',    password: 'G&896845a',  displayName: 'システム管理者', role: 'system_admin', department: 'システム' },
  { username: 'takabeni', password: 'Takabeni1!', displayName: '運用管理者',     role: 'operator',     department: '運用' },
  { username: 'takabeni2',password: 'Takabeni2!', displayName: '一般ユーザー',   role: 'user',         department: '利用' }
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL が設定されていません');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('📦 Connected');

  // 既存ロールのマッピング (admin→system_admin, employee→operator)
  console.log('🔄 既存ロール変換: admin→system_admin, employee→operator');
  await client.query(`UPDATE users SET role='system_admin' WHERE role='admin';`);
  await client.query(`UPDATE users SET role='operator' WHERE role='employee';`);

  const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  for (const u of seedUsers) {
    if (!passwordPolicy.test(u.password)) {
      console.warn(`⚠️ パスワードがポリシー不適合のためスキップ: ${u.username}`);
      continue;
    }
    console.log(`🔐 Hashing password for ${u.username}`);
    const hashed = await bcrypt.hash(u.password, 10);
    const sql = `INSERT INTO users (username, password, display_name, role, department)
                VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (username) DO UPDATE
                SET password=EXCLUDED.password, display_name=EXCLUDED.display_name, role=EXCLUDED.role, department=EXCLUDED.department`;
    await client.query(sql, [u.username, hashed, u.displayName, u.role, u.department ?? null]);
    console.log(`✅ Upserted user: ${u.username} (${u.role})`);
  }

  // 監査用簡易一覧
  const { rows } = await client.query(`SELECT username, role, created_at FROM users WHERE username = ANY($1::text[]) ORDER BY username`, [seedUsers.map(u => u.username)]);
  console.table(rows);

  await client.end();
  console.log('🎉 Done');
}

main().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
