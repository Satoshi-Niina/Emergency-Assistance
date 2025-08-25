import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../db/schema.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

// 繝・・繧ｿ繝吶・繧ｹ謗･邯・
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('笶・DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function updateNiinaPassword() {
  try {
    console.log('剥 niina繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ迴ｾ蝨ｨ縺ｮ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ...');
    
    // 譌｢蟄倥・niina繝ｦ繝ｼ繧ｶ繝ｼ繧堤｢ｺ隱・
    const existingUser = await db.select().from(users).where(eq(users.username, 'niina')).limit(1);
    
    if (existingUser.length === 0) {
      console.log('笶・niina繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      return;
    }
    
    const user = existingUser[0];
    console.log('統 迴ｾ蝨ｨ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ:', {
      id: user.id,
      username: user.username,
      password: user.password,
      passwordLength: user.password.length,
      displayName: user.displayName,
      role: user.role
    });
    
    // 繝代せ繝ｯ繝ｼ繝峨ｒ繝上ャ繧ｷ繝･蛹・
    const hashedPassword = await bcrypt.hash('0077', 10);
    console.log('柏 繝上ャ繧ｷ繝･蛹悶＆繧後◆繝代せ繝ｯ繝ｼ繝・', hashedPassword.substring(0, 20) + '...');
    
    // 繝代せ繝ｯ繝ｼ繝峨ｒ譖ｴ譁ｰ
    const updatedUser = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'niina'))
      .returning();
    
    console.log('笨・繝代せ繝ｯ繝ｼ繝峨′豁｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆:', {
      id: updatedUser[0].id,
      username: updatedUser[0].username,
      password: updatedUser[0].password.substring(0, 20) + '...',
      displayName: updatedUser[0].displayName,
      role: updatedUser[0].role
    });
    
    // 繝代せ繝ｯ繝ｼ繝画､懆ｨｼ繝・せ繝・
    const isValid = await bcrypt.compare('0077', updatedUser[0].password);
    console.log('柏 繝代せ繝ｯ繝ｼ繝画､懆ｨｼ繝・せ繝・', isValid);
    
  } catch (error) {
    console.error('笶・繝代せ繝ｯ繝ｼ繝画峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
  } finally {
    await client.end();
  }
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
updateNiinaPassword(); 