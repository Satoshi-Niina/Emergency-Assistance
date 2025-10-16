#!/usr/bin/env node
// Usage: node set-password.js <username> <newPassword>
// Ensure DATABASE_URL env var is set, or adjust connection in ../db/index.js

import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const [,, username, newPassword] = process.argv;
if (!username || !newPassword) {
  console.error('Usage: node set-password.js <username> <newPassword>');
  process.exit(1);
}

(async () => {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword, saltRounds);
    console.log(`Updating password for ${username}...`);
    const updated = await db.update(users).set({ password: hash }).where(eq(users.username, username)).returning();
    if (!updated || updated.length === 0) {
      console.error('No user updated. Check username.');
      process.exit(2);
    }
    console.log('Password updated and hashed for user:', username);
    process.exit(0);
  } catch (err) {
    console.error('Error updating password:', err);
    process.exit(3);
  }
})();
