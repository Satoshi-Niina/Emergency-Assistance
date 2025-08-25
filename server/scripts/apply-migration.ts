import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM蟇ｾ蠢懊・ __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 繝・・繧ｿ繝吶・繧ｹ謗･邯夊ｨｭ螳・
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

async function applyMigration() {
  const client = postgres(getDatabaseUrl(), {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('剥 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...');
    
    // 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ縺ｮ繝代せ・域怙譁ｰ迚医ｒ菴ｿ逕ｨ・・
    const migrationPath = path.join(__dirname, '../../migrations/0003_fix_schema_final.sql');
    
    // users繝・・繝悶Ν逕ｨ縺ｮ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ縺ｮ繝代せ
    const usersMigrationPath = path.join(__dirname, '../../migrations/0004_add_users_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('剥 繝｡繧､繝ｳ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｮ溯｡御ｸｭ...');
    
    // 繝｡繧､繝ｳ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｮ溯｡・
    await client.unsafe(migrationSQL);
    
    // users繝・・繝悶Ν逕ｨ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｮ溯｡・
    if (fs.existsSync(usersMigrationPath)) {
        console.log('剥 users繝・・繝悶Ν逕ｨ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｮ溯｡御ｸｭ...');
        const usersMigrationSQL = fs.readFileSync(usersMigrationPath, 'utf-8');
        await client.unsafe(usersMigrationSQL);
    } else {
        console.log('笞・・users繝・・繝悶Ν逕ｨ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
    }
    
    console.log('笨・繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ螳御ｺ・＠縺ｾ縺励◆');
    
    // 遒ｺ隱咲畑繧ｯ繧ｨ繝ｪ
    console.log('剥 繝・・繝悶Ν讒矩繧堤｢ｺ隱堺ｸｭ...');
    
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('machines', 'machine_types', 'history_items', 'users')
      ORDER BY table_name
    `;
    
    console.log('搭 蟄伜惠縺吶ｋ繝・・繝悶Ν:', tables.map(t => t.table_name));
    
    // machines 繝・・繝悶Ν縺ｮ繧ｫ繝ｩ繝遒ｺ隱・
    const machineColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'machines' 
      ORDER BY ordinal_position
    `;
    
    console.log('搭 machines 繝・・繝悶Ν縺ｮ繧ｫ繝ｩ繝:');
    machineColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // history_items 繝・・繝悶Ν縺ｮ繧ｫ繝ｩ繝遒ｺ隱・
    const historyColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'history_items' 
      ORDER BY ordinal_position
    `;
    
    console.log('搭 history_items 繝・・繝悶Ν縺ｮ繧ｫ繝ｩ繝:');
    historyColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // 繧ｵ繝ｳ繝励Ν繝・・繧ｿ縺ｮ遒ｺ隱・
    const machineCount = await client`SELECT COUNT(*) as count FROM machines`;
    const machineTypeCount = await client`SELECT COUNT(*) as count FROM machine_types`;
    const historyCount = await client`SELECT COUNT(*) as count FROM history_items`;
    const userCount = await client`SELECT COUNT(*) as count FROM users`;
    
    console.log('投 繝・・繧ｿ莉ｶ謨ｰ:');
    console.log(`  - machines: ${machineCount[0].count}莉ｶ`);
    console.log(`  - machine_types: ${machineTypeCount[0].count}莉ｶ`);
    console.log(`  - history_items: ${historyCount[0].count}莉ｶ`);
    console.log(`  - users: ${userCount[0].count}莉ｶ`);
    
  } catch (error) {
    console.error('笶・繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigration()
    .then(() => {
      console.log('脂 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ蜃ｦ逅・′螳御ｺ・＠縺ｾ縺励◆');
      process.exit(0);
    })
    .catch((error) => {
      console.error('徴 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ蜃ｦ逅・〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
      process.exit(1);
    });
} 