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

async function testLogin() {
  try {
    const username = 'niina';
    const password = '0077';
    
    console.log('柏 繝ｭ繧ｰ繧､繝ｳ繝・せ繝磯幕蟋・', { username, password });
    
    // 繝・・繧ｿ繝吶・繧ｹ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ繧呈､懃ｴ｢
    console.log('剥 繝ｦ繝ｼ繧ｶ繝ｼ讀懃ｴ｢荳ｭ...');
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('笶・繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', username);
      return;
    }
    
    const foundUser = user[0];
    console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆:', {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
      password: foundUser.password.substring(0, 20) + '...',
      passwordLength: foundUser.password.length
    });
    
    // 繝代せ繝ｯ繝ｼ繝峨メ繧ｧ繝・け
    console.log('柏 繝代せ繝ｯ繝ｼ繝画､懆ｨｼ荳ｭ...');
    
    // bcrypt縺ｧ繝上ャ繧ｷ繝･蛹悶＆繧後◆繝代せ繝ｯ繝ｼ繝峨ｒ繝√ぉ繝・け
    try {
      const bcryptValid = await bcrypt.compare(password, foundUser.password);
      console.log('柏 bcrypt讀懆ｨｼ邨先棡:', bcryptValid);
      
      if (bcryptValid) {
        console.log('笨・bcrypt隱崎ｨｼ謌仙粥・・);
        return;
      }
    } catch (error) {
      console.log('笶・bcrypt讀懆ｨｼ繧ｨ繝ｩ繝ｼ:', error);
    }
    
    // 蟷ｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝峨ｒ繝√ぉ繝・け
    const plainTextValid = (foundUser.password === password);
    console.log('柏 蟷ｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝画､懆ｨｼ邨先棡:', plainTextValid);
    
    if (plainTextValid) {
      console.log('笨・蟷ｳ譁・ヱ繧ｹ繝ｯ繝ｼ繝芽ｪ崎ｨｼ謌仙粥・・);
    } else {
      console.log('笶・隱崎ｨｼ螟ｱ謨・);
      console.log('統 隧ｳ邏ｰ:', {
        inputPassword: password,
        storedPassword: foundUser.password,
        inputLength: password.length,
        storedLength: foundUser.password.length,
        isHashed: foundUser.password.startsWith('$2b$')
      });
    }
    
  } catch (error) {
    console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
  } finally {
    await client.end();
  }
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
testLogin(); 