import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../db/schema.js';
import 'dotenv/config';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('🔍 Connecting to database...');
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  console.log('👤 Creating test user...');
  await db.insert(users).values({
    username: 'niina',
    password: '$2b$10$FPWHaHMFsqCFIkS1Sf69kujTqFhLrC7Qpqv1lvqSnpPtc4mmYh9mq', // hashed '0077'
    displayName: '新名',
    role: 'admin'
  });

  console.log('✅ Test user created');
  await client.end();
}

main().catch(console.error);
