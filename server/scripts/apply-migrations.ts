import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

async function main() {
  // __dirname 相当を取得（ESM）
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // 確実に server/.env を読み込む
  const serverEnvPath = path.resolve(__dirname, '../.env');
  dotenv.config({ path: serverEnvPath });
  // ルート .env にもフォールバック
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('🔍 Connecting to database...');
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  // server/migrations を指すように解決
  const migrationsFolder = path.resolve(__dirname, '../migrations');
  console.log('🔧 Running migrations from:', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('✅ Migrations completed');

  await client.end();
}

main().catch(console.error);
