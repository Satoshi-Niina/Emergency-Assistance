// 蠢懈･蜃ｦ鄂ｮ諠・ｱAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・萓・
import type { NextApiRequest, NextApiResponse } from 'next';

interface EmergencyProcedure {
  id: string;
  title: string;
  description: string;
  steps: string[];
  safetyNotes: string[];
  requiredTools: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

// 繧ｵ繝ｳ繝励Ν蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ
const emergencyProceduresData: EmergencyProcedure[] = [
  {
    id: 'ep_001',
    title: '繝舌ャ繝・Μ繝ｼ蜈・崕縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '繝舌ャ繝・Μ繝ｼ縺悟ｼｱ縺｣縺溷ｴ蜷医・蠢懈･蜈・崕謇矩・,
    steps: [
      '螳牙・遒ｺ隱・ 菴懈･ｭ迺ｰ蠅・・遒ｺ隱・,
      '蜈・崕蝎ｨ縺ｮ貅門ｙ: 驕ｩ蛻・↑蜈・崕蝎ｨ繧堤畑諢・,
      '謗･邯・ 豁｣讌ｵ繝ｻ雋讌ｵ繧呈ｭ｣縺励￥謗･邯・,
      '蜈・崕髢句ｧ・ 菴朱崕豬√〒蜈・崕髢句ｧ・,
      '逶｣隕・ 蜈・崕迥ｶ豕√・螳壽悄逧・↑遒ｺ隱・,
      '螳御ｺ・｢ｺ隱・ 髮ｻ蝨ｧ貂ｬ螳壹↓繧医ｋ螳御ｺ・｢ｺ隱・
    ],
    safetyNotes: [
      '蜈・崕荳ｭ縺ｯ轣ｫ豌怜宍遖・,
      '驕主・髮ｻ縺ｫ豕ｨ諢・,
      '蜈・崕蝎ｨ縺ｮ螳壽ｼ繧堤｢ｺ隱・,
      '菴懈･ｭ荳ｭ縺ｯ謠帶ｰ励ｒ遒ｺ菫・
    ],
    requiredTools: ['蜈・崕蝎ｨ', '髮ｻ蝨ｧ險・, '菫晁ｭｷ蜈ｷ'],
    estimatedTime: 30,
    riskLevel: 'medium',
    category: '髮ｻ豌礼ｳｻ'
  },
  {
    id: 'ep_002',
    title: '辯・侭貍上ｌ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '辯・侭貍上ｌ縺檎匱逕溘＠縺溷ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '蜊ｳ蠎ｧ縺ｫ繧ｨ繝ｳ繧ｸ繝ｳ繧貞●豁｢',
      '轣ｫ豌励ｒ螳悟・縺ｫ髯､蜴ｻ',
      '貍上ｌ邂・園縺ｮ迚ｹ螳・,
      '蠢懈･逧・↑貍上ｌ豁｢繧・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡',
      '螳牙・遒ｺ菫昴・邯咏ｶ・
    ],
    safetyNotes: [
      '邨ｶ蟇ｾ縺ｫ轣ｫ豌励ｒ菴ｿ逕ｨ縺励↑縺・,
      '謠帶ｰ励ｒ蜊∝・縺ｫ陦後≧',
      '髱咎崕豌励↓豕ｨ諢・,
      '蟆る摩螳ｶ縺ｮ蛻ｰ逹縺ｾ縺ｧ蠕・ｩ・
    ],
    requiredTools: ['貍上ｌ豁｢繧√ユ繝ｼ繝・, '髦ｲ隴ｷ蜈ｷ', '謠帶ｰ苓ｨｭ蛯・],
    estimatedTime: 15,
    riskLevel: 'critical',
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ'
  },
  {
    id: 'ep_003',
    title: '豐ｹ蝨ｧ貍上ｌ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β縺九ｉ縺ｮ貍上ｌ縺ｫ蟇ｾ縺吶ｋ蠢懈･蟇ｾ蠢・,
    steps: [
      '繧ｷ繧ｹ繝・Β縺ｮ蛛懈ｭ｢',
      '貍上ｌ邂・園縺ｮ遒ｺ隱・,
      '蠢懈･逧・↑貍上ｌ豁｢繧・,
      '豐ｹ蝨ｧ縺ｮ遒ｺ隱・,
      '螳牙・遒ｺ隱・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡'
    ],
    safetyNotes: [
      '鬮伜悸豐ｹ縺ｫ豕ｨ諢・,
      '逧ｮ閹壹∈縺ｮ謗･隗ｦ繧帝∩縺代ｋ',
      '驕ｩ蛻・↑菫晁ｭｷ蜈ｷ繧剃ｽｿ逕ｨ',
      '菴懈･ｭ迺ｰ蠅・・貂・ｽ比ｿ晄戟'
    ],
    requiredTools: ['貍上ｌ豁｢繧∝王', '菫晁ｭｷ蜈ｷ', '貂・祉逕ｨ蜈ｷ'],
    estimatedTime: 20,
    riskLevel: 'high',
    category: '豐ｹ蝨ｧ邉ｻ'
  },
  {
    id: 'ep_004',
    title: '繝悶Ξ繝ｼ繧ｭ逡ｰ蟶ｸ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '繝悶Ξ繝ｼ繧ｭ縺ｮ蜉ｹ縺阪′謔ｪ縺・ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '螳牙・縺ｪ蝣ｴ謇縺ｸ縺ｮ遘ｻ蜍・,
      '繧ｨ繝ｳ繧ｸ繝ｳ縺ｮ蛛懈ｭ｢',
      '繝悶Ξ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β縺ｮ遒ｺ隱・,
      '蠢懈･逧・↑隱ｿ謨ｴ',
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡',
      '菴ｿ逕ｨ遖∵ｭ｢縺ｮ蠕ｹ蠎・
    ],
    safetyNotes: [
      '邨ｶ蟇ｾ縺ｫ驕玖ｻ｢縺励↑縺・,
      '螳牙・縺ｪ蝣ｴ謇縺ｫ遘ｻ蜍・,
      '蟆る摩螳ｶ縺ｮ蛻ｰ逹縺ｾ縺ｧ蠕・ｩ・,
      '莉悶・菴懈･ｭ蜩｡縺ｫ蜻ｨ遏･'
    ],
    requiredTools: ['繝悶Ξ繝ｼ繧ｭ隱ｿ謨ｴ蟾･蜈ｷ', '螳牙・讓呵ｭ・],
    estimatedTime: 25,
    riskLevel: 'critical',
    category: '襍ｰ陦檎ｳｻ'
  },
  {
    id: 'ep_005',
    title: '繧ｨ繝ｳ繧ｸ繝ｳ驕守・縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '繧ｨ繝ｳ繧ｸ繝ｳ縺碁℃辭ｱ縺励◆蝣ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '繧ｨ繝ｳ繧ｸ繝ｳ縺ｮ蛛懈ｭ｢',
      '蜀ｷ蜊ｴ繧ｷ繧ｹ繝・Β縺ｮ遒ｺ隱・,
      '蜀ｷ蜊ｴ豌ｴ縺ｮ陬懷・',
      '貂ｩ蠎ｦ縺ｮ逶｣隕・,
      '蜴溷屏縺ｮ迚ｹ螳・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡'
    ],
    safetyNotes: [
      '鬮俶ｸｩ縺ｫ豕ｨ諢・,
      '蜀ｷ蜊ｴ豌ｴ縺ｮ蜿悶ｊ謇ｱ縺・↓豕ｨ諢・,
      '繧・￠縺ｩ縺ｫ豕ｨ諢・,
      '驕ｩ蛻・↑蜀ｷ蜊ｴ譎る俣繧堤｢ｺ菫・
    ],
    requiredTools: ['蜀ｷ蜊ｴ豌ｴ', '貂ｩ蠎ｦ險・, '菫晁ｭｷ蜈ｷ'],
    estimatedTime: 30,
    riskLevel: 'high',
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ'
  },
  {
    id: 'ep_006',
    title: '髮ｻ豌礼ｳｻ邨ｱ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '髮ｻ豌礼ｳｻ邨ｱ縺ｮ謨・囿縺ｫ蟇ｾ縺吶ｋ蠢懈･蟇ｾ蠢・,
    steps: [
      '髮ｻ貅舌・驕ｮ譁ｭ',
      '謨・囿邂・園縺ｮ迚ｹ螳・,
      '蠢懈･逧・↑菫ｮ逅・,
      '蜍穂ｽ懃｢ｺ隱・,
      '螳牙・遒ｺ隱・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡'
    ],
    safetyNotes: [
      '諢滄崕縺ｫ豕ｨ諢・,
      '驕ｩ蛻・↑蟾･蜈ｷ繧剃ｽｿ逕ｨ',
      '菴懈･ｭ迺ｰ蠅・・遒ｺ隱・,
      '菫晁ｭｷ蜈ｷ縺ｮ逹逕ｨ'
    ],
    requiredTools: ['髮ｻ豌怜ｷ･蜈ｷ', '菫晁ｭｷ蜈ｷ', '貂ｬ螳壼勣'],
    estimatedTime: 20,
    riskLevel: 'medium',
    category: '髮ｻ豌礼ｳｻ'
  },
  {
    id: 'ep_007',
    title: '繝悶Ξ繝ｼ繧ｭ繝代ャ繝画束閠励・蠢懈･蜃ｦ鄂ｮ',
    description: '繝悶Ξ繝ｼ繧ｭ繝代ャ繝峨′鞫ｩ閠励＠縺溷ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '螳牙・縺ｪ蝣ｴ謇縺ｸ縺ｮ遘ｻ蜍・,
      '繝悶Ξ繝ｼ繧ｭ繝代ャ繝峨・遒ｺ隱・,
      '蠢懈･逧・↑隱ｿ謨ｴ',
      '菴ｿ逕ｨ蛻ｶ髯舌・險ｭ螳・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡',
      '驛ｨ蜩∽ｺ､謠帙・貅門ｙ'
    ],
    safetyNotes: [
      '邨ｶ蟇ｾ縺ｫ鬮倬溯ｵｰ陦後＠縺ｪ縺・,
      '繝悶Ξ繝ｼ繧ｭ霍晞屬縺碁聞縺上↑繧九％縺ｨ繧定ｪ崎ｭ・,
      '螳牙・縺ｪ蝣ｴ謇縺ｧ縺ｮ縺ｿ菴ｿ逕ｨ',
      '蟆る摩螳ｶ縺ｮ蛻ｰ逹縺ｾ縺ｧ蠕・ｩ・
    ],
    requiredTools: ['繝悶Ξ繝ｼ繧ｭ隱ｿ謨ｴ蟾･蜈ｷ', '螳牙・讓呵ｭ・, '貂ｬ螳壼勣'],
    estimatedTime: 15,
    riskLevel: 'high',
    category: '繝悶Ξ繝ｼ繧ｭ邉ｻ'
  },
  {
    id: 'ep_008',
    title: '繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ逡ｰ蟶ｸ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ縺ｫ逡ｰ蟶ｸ縺檎匱逕溘＠縺溷ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '繧ｨ繝ｳ繧ｸ繝ｳ縺ｮ蛛懈ｭ｢',
      '繧ｪ繧､繝ｫ繝ｬ繝吶Ν縺ｮ遒ｺ隱・,
      '繧ｪ繧､繝ｫ蜩∬ｳｪ縺ｮ遒ｺ隱・,
      '蠢懈･逧・↑隱ｿ謨ｴ',
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡',
      '菴ｿ逕ｨ蛻ｶ髯舌・險ｭ螳・
    ],
    safetyNotes: [
      '逡ｰ蟶ｸ髻ｳ縺後☆繧句ｴ蜷医・菴ｿ逕ｨ遖∵ｭ｢',
      '繧ｪ繧､繝ｫ貍上ｌ縺ｫ豕ｨ諢・,
      '驕手ｲ闕ｷ驕玖ｻ｢繧帝∩縺代ｋ',
      '蟆る摩螳ｶ縺ｮ險ｺ譁ｭ繧貞ｾ・▽'
    ],
    requiredTools: ['繧ｪ繧､繝ｫ繝ｬ繝吶Ν繧ｲ繝ｼ繧ｸ', '菫晁ｭｷ蜈ｷ', '貂・祉逕ｨ蜈ｷ'],
    estimatedTime: 25,
    riskLevel: 'medium',
    category: '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ邉ｻ'
  },
  {
    id: 'ep_009',
    title: '蜀ｷ蜊ｴ豌ｴ貍上ｌ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '蜀ｷ蜊ｴ豌ｴ縺梧ｼ上ｌ縺ｦ縺・ｋ蝣ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '繧ｨ繝ｳ繧ｸ繝ｳ縺ｮ蛛懈ｭ｢',
      '貍上ｌ邂・園縺ｮ迚ｹ螳・,
      '蠢懈･逧・↑貍上ｌ豁｢繧・,
      '蜀ｷ蜊ｴ豌ｴ縺ｮ陬懷・',
      '貂ｩ蠎ｦ縺ｮ逶｣隕・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡'
    ],
    safetyNotes: [
      '鬮俶ｸｩ縺ｫ豕ｨ諢・,
      '繧・￠縺ｩ縺ｫ豕ｨ諢・,
      '驕ｩ蛻・↑蜀ｷ蜊ｴ譎る俣繧堤｢ｺ菫・,
      '貍上ｌ邂・園縺ｮ螳悟・菫ｮ蠕ｩ縺ｾ縺ｧ菴ｿ逕ｨ遖∵ｭ｢'
    ],
    requiredTools: ['貍上ｌ豁｢繧∝王', '蜀ｷ蜊ｴ豌ｴ', '貂ｩ蠎ｦ險・, '菫晁ｭｷ蜈ｷ'],
    estimatedTime: 20,
    riskLevel: 'high',
    category: '蜀ｷ蜊ｴ邉ｻ'
  },
  {
    id: 'ep_010',
    title: '襍ｰ陦瑚｣・ｽｮ逡ｰ蟶ｸ縺ｮ蠢懈･蜃ｦ鄂ｮ',
    description: '襍ｰ陦瑚｣・ｽｮ縺ｫ逡ｰ蟶ｸ縺檎匱逕溘＠縺溷ｴ蜷医・邱頑･蟇ｾ蠢・,
    steps: [
      '螳牙・縺ｪ蝣ｴ謇縺ｸ縺ｮ遘ｻ蜍・,
      '逡ｰ蟶ｸ邂・園縺ｮ迚ｹ螳・,
      '蠢懈･逧・↑隱ｿ謨ｴ',
      '菴ｿ逕ｨ蛻ｶ髯舌・險ｭ螳・,
      '蟆る摩螳ｶ縺ｸ縺ｮ騾｣邨｡',
      '驛ｨ蜩∽ｺ､謠帙・貅門ｙ'
    ],
    safetyNotes: [
      '逡ｰ蟶ｸ髻ｳ縺後☆繧句ｴ蜷医・菴ｿ逕ｨ遖∵ｭ｢',
      '謖ｯ蜍輔′豼縺励＞蝣ｴ蜷医・蛛懈ｭ｢',
      '螳牙・縺ｪ蝣ｴ謇縺ｧ縺ｮ縺ｿ菴ｿ逕ｨ',
      '蟆る摩螳ｶ縺ｮ蛻ｰ逹縺ｾ縺ｧ蠕・ｩ・
    ],
    requiredTools: ['隱ｿ謨ｴ蟾･蜈ｷ', '螳牙・讓呵ｭ・, '貂ｬ螳壼勣'],
    estimatedTime: 30,
    riskLevel: 'medium',
    category: '襍ｰ陦檎ｳｻ'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmergencyProcedure[] | { error: string }>
) {
  if (req.method === 'GET') {
    // 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｫ繧医ｋ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
    const { category, riskLevel } = req.query;
    
    let filteredData = emergencyProceduresData;
    
    if (category) {
      filteredData = filteredData.filter(item => 
        item.category.toLowerCase().includes(category.toString().toLowerCase())
      );
    }
    
    if (riskLevel) {
      filteredData = filteredData.filter(item => 
        item.riskLevel === riskLevel
      );
    }
    
    res.status(200).json(filteredData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}


