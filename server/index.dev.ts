import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ・亥━蜈磯・ｽ埼・ｼ・
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
];

console.log('肌 髢狗匱迺ｰ蠅・ｵｷ蜍・- 迺ｰ蠅・､画焚隱ｭ縺ｿ霎ｼ縺ｿ髢句ｧ・);
console.log('刀 迴ｾ蝨ｨ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ:', process.cwd());
console.log('刀 __dirname:', __dirname);

// 蜷・ヱ繧ｹ縺ｧ.env繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
let loadedEnvFile = null;
for (const envPath of envPaths) {
  try {
    const result = await import('dotenv').then(dotenv => dotenv.config({ path: envPath }));
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedEnvFile = envPath;
      console.log('笨・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ謌仙粥:', envPath);
      break;
    }
  } catch (error) {
    console.log('笞・・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ螟ｱ謨・', envPath, error.message);
  }
}

if (!loadedEnvFile) {
  console.log('笞・・迺ｰ蠅・､画焚繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ゅョ繝輔か繝ｫ繝亥､繧剃ｽｿ逕ｨ縺励∪縺吶・);
  console.log('剥 隧ｦ陦後＠縺溘ヱ繧ｹ:', envPaths);
}

// 驥崎ｦ√↑迺ｰ蠅・､画焚縺ｮ遒ｺ隱・
console.log('肌 迺ｰ蠅・､画焚遒ｺ隱・', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  loadedEnvFile
});

// DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・↑縺・ｴ蜷医・繧ｨ繝ｩ繝ｼ縺ｧ蛛懈ｭ｢
if (!process.env.DATABASE_URL) {
  console.error('笶・閾ｴ蜻ｽ逧・お繝ｩ繝ｼ: DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
  console.error('肌 隗｣豎ｺ譁ｹ豕・ .env繝輔ぃ繧､繝ｫ繧剃ｽ懈・縺励．ATABASE_URL繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞');
  console.error('統 萓・ DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance');
  process.exit(1);
}

// 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧定ｵｷ蜍・
import app from './app.js';

const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('噫 髢狗匱繧ｵ繝ｼ繝舌・襍ｷ蜍穂ｸｭ...');
console.log('肌 迺ｰ蠅・ｨｭ螳・', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT,
  isDevelopment: isDevelopment
});

// 繧ｵ繝ｼ繝舌・繧定ｵｷ蜍・
app.listen(PORT, '0.0.0.0', () => {
  console.log('笨・髢狗匱繧ｵ繝ｼ繝舌・縺梧ｭ｣蟶ｸ縺ｫ襍ｷ蜍輔＠縺ｾ縺励◆');
  console.log('倹 繧ｵ繝ｼ繝舌・URL:', `http://localhost:${PORT}`);
  console.log('肌 髢狗匱迺ｰ蠅・', isDevelopment ? '譛牙柑' : '辟｡蜉ｹ');
  console.log('投 繝倥Ν繧ｹ繝√ぉ繝・け:', `http://localhost:${PORT}/api/health`);
  console.log('柏 隱崎ｨｼ繝・ヰ繝・げ:', `http://localhost:${PORT}/api/auth/debug/env`);
});

// 繧ｰ繝ｬ繝ｼ繧ｹ繝輔Ν繧ｷ繝｣繝・ヨ繝繧ｦ繝ｳ
process.on('SIGTERM', () => {
  console.log('尅 SIGTERM蜿嶺ｿ｡ - 繧ｵ繝ｼ繝舌・繧偵す繝｣繝・ヨ繝繧ｦ繝ｳ荳ｭ...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('尅 SIGINT蜿嶺ｿ｡ - 繧ｵ繝ｼ繝舌・繧偵す繝｣繝・ヨ繝繧ｦ繝ｳ荳ｭ...');
  process.exit(0);
});