import bcrypt from 'bcryptjs';
import db from '../db/db.js';

async function main() {
  try {
    const password = process.env.SEED_NIINA_PASSWORD;
    if (!password) {
      console.error('SEED_NIINA_PASSWORD is not set. Set it in environment to run this script.');
      process.exit(1);
    }
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    console.log('Generated hash for niina');

    // Use db.sql tagged template for safe parameterization
    await db.sql`UPDATE users SET password=${hash} WHERE username=${'niina'}`;
    console.log('Password updated for niina');
  } catch (err) {
    console.error('Error updating password:', err);
    process.exit(1);
  }
}

main();
