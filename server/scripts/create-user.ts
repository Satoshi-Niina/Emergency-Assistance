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

async function createNiinaUser() {
  try {
    console.log('剥 niina繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ蟄伜惠遒ｺ隱堺ｸｭ...');
    
    // 譌｢蟄倥・niina繝ｦ繝ｼ繧ｶ繝ｼ繧堤｢ｺ隱・
    const existingUser = await db.select().from(users).where(eq(users.username, 'niina')).limit(1);
    
    if (existingUser.length > 0) {
      console.log('笨・niina繝ｦ繝ｼ繧ｶ繝ｼ縺ｯ譌｢縺ｫ蟄伜惠縺励∪縺・', existingUser[0]);
      return;
    }
    
    console.log('統 niina繝ｦ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・荳ｭ...');
    
    // 繝代せ繝ｯ繝ｼ繝峨ｒ繝上ャ繧ｷ繝･蛹・
    const hashedPassword = await bcrypt.hash('0077', 10);
    
    // 繝ｦ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・
    const newUser = await db.insert(users).values({
      username: 'niina',
      password: hashedPassword,
      displayName: '譁ｰ邏・,
      role: 'admin',
      department: '繧ｷ繧ｹ繝・Β邂｡逅・Κ'
    }).returning();
    
    console.log('笨・niina繝ｦ繝ｼ繧ｶ繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆:', newUser[0]);
    
  } catch (error) {
    console.error('笶・繝ｦ繝ｼ繧ｶ繝ｼ菴懈・繧ｨ繝ｩ繝ｼ:', error);
  } finally {
    await client.end();
  }
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
createNiinaUser(); 