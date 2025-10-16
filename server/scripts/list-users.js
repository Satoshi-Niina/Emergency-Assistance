#!/usr/bin/env node
import 'dotenv/config';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

(async () => {
  try {
    console.log('DATABASE_URL=', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
    const result = await db.select().from(users).limit(50);
    console.log('Users:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err);
    process.exit(1);
  }
})();
