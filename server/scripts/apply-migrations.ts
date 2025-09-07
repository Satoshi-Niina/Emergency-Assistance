import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('🔍 Connecting to database...');
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  console.log('🔧 Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('✅ Migrations completed');

  await client.end();
}

main().catch(console.error);
