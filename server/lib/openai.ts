import OpenAI from "openai";
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ・育嶌蟇ｾ繝代せ縺ｧ謖・ｮ夲ｼ・
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// 隍・焚縺ｮ蝣ｴ謇縺九ｉ.env繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

// API繧ｭ繝ｼ縺ｮ蜿門ｾ・
const apiKey = process.env.OPENAI_API_KEY;

// 繝・ヰ繝・げ逕ｨ繝ｭ繧ｰ繧呈怏蜉ｹ蛹・
console.log("[DEBUG] OpenAI initialization - API KEY exists:", apiKey ? "YES" : "NO");
console.log("[DEBUG] OpenAI API KEY prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND");
console.log("[DEBUG] Environment variables:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  NODE_ENV: process.env.NODE_ENV,
  PWD: __dirname
});

// 髢狗匱迺ｰ蠅・〒縺ｯAPI繧ｭ繝ｼ縺後↑縺上※繧ょ虚菴懊☆繧九ｈ縺・↓譚｡莉ｶ莉倥″蛻晄悄蛹・
let openai: OpenAI | null = null;
if (apiKey && apiKey !== 'dev-mock-key' && apiKey !== 'your-openai-api-key-here' && apiKey.startsWith('sk-')) {
  try {
    openai = new OpenAI({
      apiKey: apiKey,
    });
    console.log("[DEBUG] OpenAI client initialized successfully");
  } catch (error) {
    console.error("[DEBUG] OpenAI client initialization failed:", error);
    openai = null;
  }
} else {
  console.log("[DEV] OpenAI client not initialized - API key not available or is mock key");
  console.log("[DEBUG] API Key validation:", {
    exists: !!apiKey,
    isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
    startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
    keyLength: apiKey ? apiKey.length : 0
  });
}

// 繝・ヰ繝・げ逕ｨ・唹penAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・迥ｶ諷九ｒ遒ｺ隱・
console.log("[DEBUG] Final OpenAI client status:", {
  clientExists: !!openai,
  apiKeyExists: !!apiKey,
  apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND'
});

// OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・迥ｶ諷九ｒ螟夜Κ縺九ｉ遒ｺ隱阪☆繧矩未謨ｰ
export function getOpenAIClientStatus() {
  return {
    clientExists: !!openai,
    apiKeyExists: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
    apiKeyLength: apiKey ? apiKey.length : 0,
    isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
    startsWithSk: apiKey ? apiKey.startsWith('sk-') : false
  };
}

// 髢狗匱迺ｰ蠅・畑縺ｮ繧医ｊ蟆る摩逧・〒蜍慕噪縺ｪ繝｢繝・け繝ｬ繧ｹ繝昴Φ繧ｹ
const getMockResponse = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();
  
  // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繝ｼ繧ｹ縺ｮ蜍慕噪繝ｬ繧ｹ繝昴Φ繧ｹ逕滓・
  if (lowerPrompt.includes('蠢懈･蜃ｦ鄂ｮ') || lowerPrompt.includes('邱頑･') || lowerPrompt.includes('謨・囿')) {
    const vehicleTypes = ['霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ', '繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・', '繝舌Λ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ'];
    const randomVehicle = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    
    return `圷 **邱頑･蟇ｾ蠢懊Δ繝ｼ繝・* - ${randomVehicle}縺ｮ謨・囿蟇ｾ蠢懊↓縺､縺・※

**縲仙叉蠎ｧ縺ｫ螳溯｡後☆縺ｹ縺榊ｮ牙・遒ｺ隱阪・*
1. 閥 菴懈･ｭ蛹ｺ蝓溘・螳牙・遒ｺ菫晢ｼ亥・霆願ｦ句ｼｵ蜩｡驟咲ｽｮ遒ｺ隱搾ｼ・
2. 閥 讖滓｢ｰ縺ｮ螳悟・蛛懈ｭ｢遒ｺ隱搾ｼ医お繝ｳ繧ｸ繝ｳ蛛懈ｭ｢縲√ヶ繝ｬ繝ｼ繧ｭ遒ｺ隱搾ｼ・
3. 閥 蜻ｨ蝗ｲ菴懈･ｭ蜩｡縺ｸ縺ｮ螳牙・謖・､ｺ莨晞＃

**縲仙ｿ懈･險ｺ譁ｭ謇矩・・*
1. **逞・憾縺ｮ隧ｳ邏ｰ遒ｺ隱・*・・
   - 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ縺ｮ蜀・ｮｹ險倬鹸
   - 逡ｰ髻ｳ繝ｻ謖ｯ蜍輔・閾ｭ縺・・譛臥┌
   - 逶ｴ蜑阪・菴懈･ｭ蜀・ｮｹ縺ｨ逋ｺ逕溘ち繧､繝溘Φ繧ｰ

2. **蝓ｺ譛ｬ繝√ぉ繝・け鬆・岼**・・
   - 豐ｹ蝨ｧ邉ｻ邨ｱ縺ｮ豐ｹ驥上・蝨ｧ蜉帷｢ｺ隱・
   - 髮ｻ豌礼ｳｻ邨ｱ縺ｮ謗･邯夂憾豕・
   - 謫咲ｸｦ邉ｻ邨ｱ縺ｮ蜍穂ｽ懃｢ｺ隱・

**縲千樟蝣ｴ蛻､譁ｭ蝓ｺ貅悶・*
- 笨・霆ｽ蠕ｮ縺ｪ隱ｿ謨ｴ縺ｧ蠕ｩ譌ｧ蜿ｯ閭ｽ 竊・迴ｾ蝣ｴ蟇ｾ蠢懃ｶ夊｡・
- 笞・・蟆る摩遏･隴倥′蠢・ｦ・竊・謖・ｻ､謇繝ｻ菫晏ｮ亥渕蝨ｰ縺ｸ騾｣邨｡
- 圻 螳牙・縺ｫ荳榊ｮ・竊・蜊ｳ蠎ｧ縺ｫ菴懈･ｭ荳ｭ豁｢繝ｻ讖滓｢ｰ蝗樣・

**縲先悽譬ｼ驕狗畑譎ゅ・讖溯・縲・*
螳滄圀縺ｮ繧ｷ繧ｹ繝・Β縺ｧ縺ｯ縲∬ｻ贋ｸ｡蝗ｺ譛峨・謚陦楢ｳ・侭縺ｨ驕主悉縺ｮ謨・囿莠倶ｾ九ｒ蝓ｺ縺ｫ縲√ｈ繧雁・菴鍋噪縺ｧ蜊ｳ蠎ｧ縺ｫ螳溯｡悟庄閭ｽ縺ｪ蟇ｾ蠢懈焔鬆・ｒ謠蝉ｾ帙＠縺ｾ縺吶・

菴輔°蜈ｷ菴鍋噪縺ｪ逞・憾繧・ｻ贋ｸ｡縺ｫ縺､縺・※謨吶∴縺ｦ縺・◆縺縺代ｌ縺ｰ縲√ｈ繧願ｩｳ邏ｰ縺ｪ蟇ｾ蠢懊ｒ縺疲｡亥・縺ｧ縺阪∪縺吶Ａ;
  }
  
  // 霆贋ｸ｡蛻･縺ｮ蟆る摩逧・ｯｾ蠢・
  if (lowerPrompt.includes('繧ｿ繧､繧ｿ繝ｳ繝代・') || lowerPrompt.includes('遯∝崋')) {
    return `肌 **繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・蟆る摩蟇ｾ蠢・*

**縲千ｪ∝崋菴懈･ｭ縺ｧ縺ｮ荳闊ｬ逧・↑繝医Λ繝悶Ν縲・*
1. **遯∝崋繝ｦ繝九ャ繝井ｸ崎ｪｿ**・・
   - 謖ｯ蜍募捉豕｢謨ｰ縺ｮ逡ｰ蟶ｸ 竊・豐ｹ蝨ｧ繝昴Φ繝礼ｳｻ邨ｱ遒ｺ隱・
   - 遯∝崋豺ｱ蠎ｦ荳崎憶 竊・繝ｪ繝輔ヨ讖滓ｧ九・豐ｹ蝨ｧ貍上ｌ繝√ぉ繝・け
   - 蟾ｦ蜿ｳ繝舌Λ繝ｳ繧ｹ荳崎憶 竊・貂ｬ螳夊｣・ｽｮ縺ｮ譬｡豁｣遒ｺ隱・

2. **襍ｰ陦檎ｳｻ繝医Λ繝悶Ν**・・
   - 霆碁％縺九ｉ閼ｱ邱壼だ蜷・竊・霆願ｼｪ繝輔Λ繝ｳ繧ｸ鞫ｩ閠礼｢ｺ隱・
   - 騾溷ｺｦ蛻ｶ蠕｡荳崎憶 竊・繧ｨ繝ｳ繧ｸ繝ｳ蝗櫁ｻ｢謨ｰ繝ｻ螟蛾滓ｩ溽｢ｺ隱・

**縲千樟蝣ｴ縺ｧ縺ｮ霑・溷ｯｾ蠢懊・繧､繝ｳ繝医・*
- 豐ｹ蝨ｧ邉ｻ・壻ｽ懷虚豐ｹ貂ｩ蠎ｦ85邃・ｻ･荳狗ｶｭ謖√′驥崎ｦ・
- 髮ｻ豌礼ｳｻ・壼宛蠕｡逶､縺ｮ貉ｿ豌怜ｯｾ遲也｢ｺ隱・
- 讖滓｢ｰ邉ｻ・壼推驛ｨ繧ｰ繝ｪ繧ｹ陬懃ｵｦ迥ｶ豕√・螳壽悄遒ｺ隱・

繧医ｊ蜈ｷ菴鍋噪縺ｪ逞・憾繧偵♀閨槭°縺帙￥縺縺輔＞縲ょｮ滄圀縺ｮ迴ｾ蝣ｴ邨碁ｨ薙↓蝓ｺ縺･縺・◆蟇ｾ蠢懊ｒ縺疲署譯医＠縺ｾ縺吶Ａ;
  }

  if (lowerPrompt.includes('繝｢繝ｼ繧ｿ繧ｫ繝ｼ') || lowerPrompt.includes('霆碁％霆・)) {
    return `嘯 **霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ謚陦薙し繝昴・繝・*

**縲舌お繝ｳ繧ｸ繝ｳ邉ｻ邨ｱ縺ｮ蝓ｺ譛ｬ險ｺ譁ｭ縲・*
1. **蟋句虚荳崎憶**・・
   - 繝舌ャ繝・Μ繝ｼ髮ｻ蝨ｧ遒ｺ隱搾ｼ・4V邉ｻ邨ｱ豁｣蟶ｸ蛟､遒ｺ隱搾ｼ・
   - 辯・侭邉ｻ邨ｱ縺ｮ豌ｴ豺ｷ蜈･繝√ぉ繝・け
   - 繧ｨ繧｢繧ｯ繝ｪ繝ｼ繝翫・縺ｮ逶ｮ隧ｰ縺ｾ繧顔｢ｺ隱・

2. **襍ｰ陦御ｸｭ縺ｮ逡ｰ蟶ｸ**・・
   - 蜃ｺ蜉帑ｸ崎ｶｳ 竊・謗呈ｰ苓牡繝ｻ髻ｳ縺ｮ遒ｺ隱・
   - 謖ｯ蜍慕焚蟶ｸ 竊・繧ｨ繝ｳ繧ｸ繝ｳ繝槭え繝ｳ繝育せ讀・
   - 驕守・ 竊・蜀ｷ蜊ｴ豌ｴ蠕ｪ迺ｰ繝ｻ繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ貂・祉

**縲先ｲｹ蝨ｧ菴懈･ｭ陬・ｽｮ縺ｮ轤ｹ讀懊・*
- PTO・医ヱ繝ｯ繝ｼ繝・う繧ｯ繧ｪ繝包ｼ峨・謗･邯夂｢ｺ隱・
- 菴懷虚豐ｹ縺ｮ邊伜ｺｦ繝ｻ豎壹ｌ蜈ｷ蜷医メ繧ｧ繝・け
- 蜷・す繝ｪ繝ｳ繝繝ｼ縺ｮ繧ｹ繝医Ο繝ｼ繧ｯ遒ｺ隱・

迴ｾ蝣ｴ縺ｧ縺ｮ蜈ｷ菴鍋噪縺ｪ荳榊・蜷育裸迥ｶ繧呈蕗縺医※縺・◆縺縺代ｌ縺ｰ縲∫ｵ碁ｨ薙↓蝓ｺ縺･縺・◆蟇ｾ蜃ｦ豕輔ｒ縺疲署譯医〒縺阪∪縺吶Ａ;
  }
  
  // 荳闊ｬ逧・↑謖ｨ諡ｶ縺ｸ縺ｮ蟆る摩逧・↑蟇ｾ蠢・
  if (lowerPrompt.includes('縺薙ｓ縺ｫ縺｡縺ｯ') || lowerPrompt.includes('hello')) {
    return `縺薙ｓ縺ｫ縺｡縺ｯ・・延驕謎ｿ晏ｮ郁ｻ贋ｸ｡謚陦薙し繝昴・繝医す繧ｹ繝・Β縺ｧ縺吶・

**縲仙ｯｾ蠢懷庄閭ｽ縺ｪ蟆る摩鬆伜沺縲・*
肌 霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ・医お繝ｳ繧ｸ繝ｳ繝ｻ豐ｹ蝨ｧ繝ｻ髮ｻ豌礼ｳｻ邨ｱ・・
肌 繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・・育ｪ∝崋繝ｻ謨ｴ豁｣繝ｻ驕灘ｺ頑紛逅・ｼ・
肌 繝舌Λ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ・磯・遏ｳ繝ｻ謨ｴ蠖｢菴懈･ｭ・・
肌 繝ｬ繝ｼ繝ｫ蜑頑ｭ｣霆翫・貅ｶ謗･霆顔ｭ峨・迚ｹ谿願ｻ贋ｸ｡

**縲千ｷ頑･譎ょｯｾ蠢懊・*
謨・囿繝ｻ繝医Λ繝悶Ν逋ｺ逕滓凾縺ｯ縲檎ｷ頑･縲阪梧腐髫懊咲ｭ峨・繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ蜷ｫ繧√※縺碑ｳｪ蝠上￥縺縺輔＞縲・
螳牙・遒ｺ隱坂・蠢懈･蟇ｾ蠢懌・譛ｬ譬ｼ菫ｮ逅・・谿ｵ髫守噪蟇ｾ蠢懊ｒ繧ｵ繝昴・繝医＠縺ｾ縺吶・

縺ｩ縺ｮ繧医≧縺ｪ霆贋ｸ｡縺ｮ縺ｩ縺ｮ繧医≧縺ｪ逞・憾縺ｫ縺､縺・※縺雁峅繧翫〒縺励ｇ縺・°・・
迴ｾ蝣ｴ縺ｮ迥ｶ豕√ｒ隧ｳ縺励￥謨吶∴縺ｦ縺・◆縺縺代ｌ縺ｰ縲∝ｮ溯ｷｵ逧・↑繧｢繝峨ヰ繧､繧ｹ繧呈署萓帙＞縺溘＠縺ｾ縺吶Ａ;
  }
  
  // 繧医ｊ蜍慕噪縺ｪ繝・ヵ繧ｩ繝ｫ繝医Ξ繧ｹ繝昴Φ繧ｹ
  const responses = [
    `剥 **謚陦楢ｨｺ譁ｭ繧ｵ繝昴・繝域ｺ門ｙ螳御ｺ・*

迴ｾ蝨ｨ縺ｮ逞・憾繧・ｻ贋ｸ｡諠・ｱ繧定ｩｳ縺励￥謨吶∴縺ｦ縺上□縺輔＞・・
- 霆贋ｸ｡縺ｮ遞ｮ鬘橸ｼ医Δ繝ｼ繧ｿ繧ｫ繝ｼ縲√ち繧､繧ｿ繝ｳ繝代・遲会ｼ・
- 逋ｺ逕溘＠縺ｦ縺・ｋ逞・憾縺ｮ隧ｳ邏ｰ
- 菴懈･ｭ迺ｰ蠅・ｼ亥､ｩ蛟吶∵凾髢灘ｸｯ縲∽ｽ懈･ｭ蜀・ｮｹ・・

邨碁ｨ楢ｱ雁ｯ後↑菫晏ｮ域橿陦楢・・隕也せ縺ｧ縲∫樟蝣ｴ縺ｧ蜊ｳ蠎ｧ縺ｫ螳溯｡悟庄閭ｽ縺ｪ蟇ｾ蠢懃ｭ悶ｒ縺疲署譯医＠縺ｾ縺吶Ａ,

    `笞呻ｸ・**菫晏ｮ郁ｻ贋ｸ｡謚陦鍋嶌隲・ｪ灘哨**

縺ｩ縺ｮ繧医≧縺ｪ謚陦鍋噪隱ｲ鬘後〒縺雁峅繧翫〒縺励ｇ縺・°・・
- 謨・囿險ｺ譁ｭ繝ｻ蠢懈･菫ｮ逅・
- 螳壽悄轤ｹ讀懊・莠磯亟菫晏・
- 菴懈･ｭ蜉ｹ邇・髄荳翫・繧｢繝峨ヰ繧､繧ｹ
- 螳牙・菴懈･ｭ謇矩・・遒ｺ隱・

迴ｾ蝣ｴ縺ｮ螳滓ュ縺ｫ蜊ｳ縺励◆縲∝ｮ溯ｷｵ逧・↑繧ｽ繝ｪ繝･繝ｼ繧ｷ繝ｧ繝ｳ繧呈署萓帙＞縺溘＠縺ｾ縺吶Ａ,

    `屏・・**迴ｾ蝣ｴ謚陦楢・し繝昴・繝・*

菫晏ｮ郁ｻ贋ｸ｡縺ｮ繝医Λ繝悶Ν隗｣豎ｺ繧偵♀謇倶ｼ昴＞縺励∪縺吶・
逞・憾縺ｮ隧ｳ邏ｰ繧偵♀閨槭°縺帙￥縺縺輔＞・・
- 縺・▽縲√←縺ｮ繧医≧縺ｪ迥ｶ豕√〒逋ｺ逕溘＠縺溘°
- 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ繧・焚髻ｳ縺ｮ譛臥┌
- 逶ｴ蜑阪↓陦後▲縺ｦ縺・◆菴懈･ｭ蜀・ｮｹ

20蟷ｴ莉･荳翫・迴ｾ蝣ｴ邨碁ｨ薙ｒ蝓ｺ縺ｫ縲∝柑譫懃噪縺ｪ蟇ｾ蠢懈婿豕輔ｒ縺疲｡亥・縺励∪縺吶Ａ
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * OpenAI API縺ｫ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡縺励※蠢懃ｭ斐ｒ蜿門ｾ励☆繧矩未謨ｰ
 * @param prompt 繝励Ο繝ｳ繝励ヨ譁・ｭ怜・
 * @param useKnowledgeBase 繝翫Ξ繝・ず繝吶・繧ｹ繧剃ｽｿ逕ｨ縺吶ｋ縺九←縺・°
 * @returns OpenAI API縺九ｉ縺ｮ蠢懃ｭ斐ユ繧ｭ繧ｹ繝・
 */
export async function processOpenAIRequest(prompt: string, useKnowledgeBase: boolean = true): Promise<string> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available, returning development message');
      console.log('[DEBUG] OpenAI client status:', {
        clientExists: !!openai,
        apiKeyExists: !!process.env.OPENAI_API_KEY,
        apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND'
      });
      return getMockResponse(prompt);
    }

    console.log('[DEBUG] OpenAI client is available, proceeding with API call');

    // 繧ｳ繝ｳ繝・く繧ｹ繝亥・譫舌ｒ螳溯｡・
    let contextAnalysis;
    try {
      const { analyzeUserContext, adjustSystemPromptForContext } = await import('./context-analyzer.js');
      contextAnalysis = analyzeUserContext(prompt);
      console.log('[DEBUG] Context analysis:', contextAnalysis);
    } catch (error) {
      console.warn('[WARN] Context analyzer not available, using default settings');
      contextAnalysis = null;
    }

    // 繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧定ｨｭ螳・
    let systemPrompt = "縺ゅ↑縺溘・菫晏ｮ育畑霆頑髪謠ｴ繧ｷ繧ｹ繝・Β縺ｮ荳驛ｨ縺ｨ縺励※讖溯・縺吶ｋAI繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝医〒縺吶ゅΘ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠上↓蟇ｾ縺励※縲∵ｭ｣遒ｺ縺ｧ螳溽畑逧・↑蝗樒ｭ斐ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・;

    // 繝翫Ξ繝・ず繝吶・繧ｹ縺九ｉ髢｢騾｣諠・ｱ繧貞叙蠕励＠縺ｦ蜷ｫ繧√ｋ
    if (useKnowledgeBase) {
      try {
        const { generateSystemPromptWithKnowledge } = await import('./knowledge-base.js');
        systemPrompt = await generateSystemPromptWithKnowledge(prompt);
        
        // 繧ｳ繝ｳ繝・く繧ｹ繝亥・譫千ｵ先棡縺ｧ繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧定ｪｿ謨ｴ
        if (contextAnalysis) {
          const { adjustSystemPromptForContext } = await import('./context-analyzer.js');
          systemPrompt = adjustSystemPromptForContext(systemPrompt, contextAnalysis);
        }
      } catch (error) {
        console.error('繝翫Ξ繝・ず繝吶・繧ｹ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
        // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・蝓ｺ譛ｬ逧・↑繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧剃ｽｿ逕ｨ
        systemPrompt = "縺ゅ↑縺溘・菫晏ｮ育畑霆頑髪謠ｴ繧ｷ繧ｹ繝・Β縺ｮ荳驛ｨ縺ｨ縺励※讖溯・縺吶ｋAI繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝医〒縺吶ゅΘ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠上↓蟇ｾ縺励※縲∵ｭ｣遒ｺ縺ｧ螳溽畑逧・↑蝗樒ｭ斐ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・;
      }
    }

    // 繧ｳ繝ｳ繝・く繧ｹ繝医↓蝓ｺ縺･縺・◆蜍慕噪繝代Λ繝｡繝ｼ繧ｿ險ｭ螳・
    const temperature = contextAnalysis?.suggestedResponseStyle.temperature || (useKnowledgeBase ? 0.3 : 0.5);
    const maxTokens = contextAnalysis?.suggestedResponseStyle.maxTokens || (useKnowledgeBase ? 3000 : 2000);

    // OpenAI API蜻ｼ縺ｳ蜃ｺ縺・
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: 0.9, // 繧医ｊ螟壽ｧ倥↑陦ｨ迴ｾ繧貞庄閭ｽ縺ｫ縺吶ｋ
      frequency_penalty: 0.1, // 蜷後§陦ｨ迴ｾ縺ｮ郢ｰ繧願ｿ斐＠繧帝∩縺代ｋ
      presence_penalty: 0.1, // 譁ｰ縺励＞讎ょｿｵ縺ｮ蟆主・繧剃ｿ・ｲ
    });

    // Remove detailed API response receiving logging
    // console.log('OpenAI API繝ｬ繧ｹ繝昴Φ繧ｹ蜿嶺ｿ｡:', {
    //   id: response.id,
    //   model: response.model,
    //   usage: response.usage,
    //   choicesLength: response.choices?.length
    // });

    // 繝ｬ繧ｹ繝昴Φ繧ｹ縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
    const responseText = response.choices[0].message.content || '';
    // Remove OpenAI response logging
    // console.log('OpenAI蠢懃ｭ斐ｒ蜿嶺ｿ｡縺励∪縺励◆:', responseText.substring(0, 100) + '...');
    return responseText;
  } catch (error) {
    console.error('OpenAI API Error Details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
      stack: error.stack
    });

    // 迚ｹ螳壹・繧ｨ繝ｩ繝ｼ繧ｿ繧､繝励↓蠢懊§縺溘Γ繝・そ繝ｼ繧ｸ繧定ｿ斐☆
    if (error.code === 'insufficient_quota') {
      return 'OpenAI API縺ｮ繧ｯ繧ｩ繝ｼ繧ｿ縺御ｸ崎ｶｳ縺励※縺・∪縺吶・;
    } else if (error.code === 'invalid_api_key') {
      return 'OpenAI API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶・;
    } else if (error.code === 'rate_limit_exceeded') {
      return 'OpenAI API縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝亥宛髯舌↓驕斐＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥蠕・▲縺ｦ縺九ｉ蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・;
    } else if (error.message?.includes('timeout')) {
      return 'OpenAI API縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝医′繧ｿ繧､繝繧｢繧ｦ繝医＠縺ｾ縺励◆縲・;
    } else if (error.status === 401) {
      return 'OpenAI API繧ｭ繝ｼ縺ｮ隱崎ｨｼ縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・;
    } else if (error.status === 429) {
      return 'OpenAI API縺ｮ繝ｬ繝ｼ繝亥宛髯舌↓驕斐＠縺ｾ縺励◆縲・;
    } else if (error.status >= 500) {
      return 'OpenAI API繧ｵ繝ｼ繝舌・縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
    } else {
      return `OpenAI API繧ｨ繝ｩ繝ｼ: ${error.message || 'Unknown error'}`;
    }
  }
}

/**
 * 繝・く繧ｹ繝医ｒ隕∫ｴ・☆繧九・繝ｫ繝代・髢｢謨ｰ
 * @param text 隕∫ｴ・☆繧九ユ繧ｭ繧ｹ繝・
 * @returns 隕∫ｴ・＆繧後◆繝・く繧ｹ繝・
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available for text summarization');
      return '髢狗匱迺ｰ蠅・〒縺ｯ繝・く繧ｹ繝郁ｦ∫ｴ・ｩ溯・縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲・;
    }

    // 髟ｷ縺吶℃繧九ユ繧ｭ繧ｹ繝医ｒ蛻・ｊ隧ｰ繧√ｋ
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "縺ゅ↑縺溘・謚陦捺枚譖ｸ縺ｮ隕∫ｴ・ｒ陦後≧蟆る摩螳ｶ縺ｧ縺吶よ枚遶縺ｮ隕∫せ繧剃ｿ昴■縺ｪ縺後ｉ縲∫ｰ｡貎斐↓隕∫ｴ・＠縺ｦ縺上□縺輔＞縲・ 
        },
        { 
          role: "user", 
          content: `莉･荳九・繝・く繧ｹ繝医ｒ100隱樒ｨ句ｺｦ縺ｫ隕∫ｴ・＠縺ｦ縺上□縺輔＞:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('繝・く繧ｹ繝郁ｦ∫ｴ・お繝ｩ繝ｼ:', error.message);
    return '隕∫ｴ・・逕滓・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
  }
}

/**
 * 繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ逕滓・縺吶ｋ繝倥Ν繝代・髢｢謨ｰ
 * @param text 繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ逕滓・縺吶ｋ繝・く繧ｹ繝・
 * @returns 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・驟榊・
 */
export async function generateKeywords(text: string): Promise<string[]> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available for keyword generation');
      return ['髢狗匱迺ｰ蠅・, '繧ｭ繝ｼ繝ｯ繝ｼ繝臥函謌・, '蛻ｩ逕ｨ荳榊庄'];
    }

    // 髟ｷ縺吶℃繧九ユ繧ｭ繧ｹ繝医ｒ蛻・ｊ隧ｰ繧√ｋ
    const truncatedText = text.length > 4000 ? text.substring(0, 4004) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "縺ゅ↑縺溘・謚陦捺枚譖ｸ縺九ｉ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺吶ｋ蟆る摩螳ｶ縺ｧ縺吶ゆｸ弱∴繧峨ｌ縺溘ユ繧ｭ繧ｹ繝医°繧峨∵､懃ｴ｢縺ｫ蠖ｹ遶九▽驥崎ｦ√↑繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺励※縺上□縺輔＞縲・ 
        },
        { 
          role: "user", 
          content: `莉･荳九・繝・く繧ｹ繝医°繧峨∵怙繧る㍾隕√↑5縲・0蛟九・繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺励゛SON驟榊・蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞縲ょｰる摩逕ｨ隱槭ｄ蝗ｺ譛牙錐隧槭ｒ蜆ｪ蜈医＠縺ｦ縺上□縺輔＞:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }, // 蠑ｷ蛻ｶ逧・↓JSON繧ｪ繝悶ず繧ｧ繧ｯ繝医→縺励※霑斐☆
    });

    const content = response.choices[0].message.content || '{"keywords": []}';
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.keywords)) {
        return parsed.keywords;
      } else if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error('繧ｭ繝ｼ繝ｯ繝ｼ繝芽ｧ｣譫舌お繝ｩ繝ｼ:', e);
      return [];
    }
  } catch (error) {
    console.error('繧ｭ繝ｼ繝ｯ繝ｼ繝臥函謌舌お繝ｩ繝ｼ:', error.message);
    return [];
  }
}

/**
 * 讀懃ｴ｢繧ｯ繧ｨ繝ｪ繧堤函謌舌☆繧矩未謨ｰ
 * @param text 蜈・・繝・く繧ｹ繝・
 * @returns 譛驕ｩ蛹悶＆繧後◆讀懃ｴ｢繧ｯ繧ｨ繝ｪ
 */
/**
 * 繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨せ繝・ャ繝怜ｽ｢蠑上・繝ｬ繧ｹ繝昴Φ繧ｹ繧堤函謌舌☆繧・
 */
export async function generateStepResponse(keyword: string): Promise<{
  title: string;
  steps: { description: string }[];
}> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available for step response generation');
      return {
        title: keyword,
        steps: [{ description: "髢狗匱迺ｰ蠅・〒縺ｯ繧ｹ繝・ャ繝礼函謌先ｩ溯・縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲・ }]
      };
    }

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "縺ゅ↑縺溘・菫晏ｮ育畑霆翫・蟆る摩螳ｶ縺ｧ縺吶ゅく繝ｼ繝ｯ繝ｼ繝峨↓蝓ｺ縺･縺・※縲∝・菴鍋噪縺ｪ謇矩・ｒ隱ｬ譏弱＠縺ｦ縺上□縺輔＞縲・
        },
        {
          role: "user",
          content: `莉･荳九・繧ｭ繝ｼ繝ｯ繝ｼ繝峨↓髢｢縺吶ｋ蟇ｾ蠢懈焔鬆・ｒ縲・-5縺､縺ｮ繧ｹ繝・ャ繝励↓蛻・￠縺ｦ隱ｬ譏弱＠縺ｦ縺上□縺輔＞:\n${keyword}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '';
    const result = JSON.parse(content);
    return {
      title: result.title || keyword,
      steps: result.steps || []
    };
  } catch (error) {
    console.error('繧ｹ繝・ャ繝励Ξ繧ｹ繝昴Φ繧ｹ逕滓・繧ｨ繝ｩ繝ｼ:', error);
    return {
      title: keyword,
      steps: [{ description: "繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・ }]
    };
  }
}

export async function generateSearchQuery(text: string): Promise<string> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available for search query generation');
      return text.substring(0, 50); // 髢狗匱迺ｰ蠅・〒縺ｯ蜈・・繝・く繧ｹ繝医・荳驛ｨ繧定ｿ斐☆
    }

    // 髟ｷ縺吶℃繧九ユ繧ｭ繧ｹ繝医ｒ蛻・ｊ隧ｰ繧√ｋ
    const truncatedText = text.length > 200 ? text.substring(0, 200) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a search query optimization expert. Generate optimal search queries for search engines from user questions or text." 
        },
        { 
          role: "user", 
          content: `Extract optimal search keywords (5-10 words) from the following text for searching related technical documents. Prioritize technical terms and exclude unnecessary conjunctions and prepositions:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const query = response.choices[0].message.content?.trim() || truncatedText;
    return query;
  } catch (error) {
    console.error('Search query generation error:', error.message);
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・蜈・・繝・く繧ｹ繝医ｒ霑斐☆
    return text;
  }
}

/**
 * 霆贋ｸ｡逕ｻ蜒上ｒ蛻・梵縺吶ｋ髢｢謨ｰ
 * @param base64Image Base64繧ｨ繝ｳ繧ｳ繝ｼ繝峨＆繧後◆逕ｻ蜒上ョ繝ｼ繧ｿ
 * @returns 蛻・梵邨先棡
 */
export async function analyzeVehicleImage(base64Image: string): Promise<any> {
  try {
    // OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医′蛻ｩ逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
    if (!openai) {
      console.log('[DEV] OpenAI client not available for vehicle image analysis');
      return {
        analysis: '髢狗匱迺ｰ蠅・〒縺ｯ逕ｻ蜒丞・譫先ｩ溯・縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲・,
        success: false,
        error: 'OpenAI client not available'
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 繝薙ず繝ｧ繝ｳ讖溯・繧呈戟縺､繝｢繝・Ν繧剃ｽｿ逕ｨ
      messages: [
        {
          role: "system",
          content: "縺ゅ↑縺溘・霆贋ｸ｡逕ｻ蜒丞・譫舌・蟆る摩螳ｶ縺ｧ縺吶ゆｿ晏ｮ育畑霆翫・菴懈･ｭ逕ｨ霆贋ｸ｡繝ｻ迚ｹ谿願ｻ贋ｸ｡縺ｮ逕ｻ蜒上ｒ蛻・梵縺励∬ｻ贋ｸ｡縺ｮ繧ｿ繧､繝励∫憾諷九∫音蠕ｴ繧定ｩｳ邏ｰ縺ｫ隱ｬ譏弱＠縺ｦ縺上□縺輔＞縲・
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "縺薙・霆贋ｸ｡縺ｮ逕ｻ蜒上ｒ蛻・梵縺励※縲∬ｻ贋ｸ｡縺ｮ遞ｮ鬘槭∫憾諷九∫岼遶九▽迚ｹ蠕ｴ縲√♀繧医・閠・∴繧峨ｌ繧狗畑騾斐↓縺､縺・※隧ｳ邏ｰ縺ｫ隱ｬ譏弱＠縺ｦ縺上□縺輔＞縲ゆｿ晏ｮ育畑霆翫・蝣ｴ蜷医・縲√◎縺ｮ遞ｮ鬘橸ｼ郁ｻ碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ縲√・繝ｫ繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・縲√ヰ繝ｩ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ縺ｪ縺ｩ・峨ｂ迚ｹ螳壹＠縺ｦ縺上□縺輔＞縲・
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    return {
      analysis: response.choices[0].message.content || '',
      success: true
    };
  } catch (error) {
    console.error('霆贋ｸ｡逕ｻ蜒丞・譫舌お繝ｩ繝ｼ:', error.message);
    return {
      analysis: '逕ｻ蜒上・蛻・梵荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
      success: false,
      error: error.message
    };
  }
}

// OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医ｒ繧ｨ繧ｯ繧ｹ繝昴・繝・
export { openai };