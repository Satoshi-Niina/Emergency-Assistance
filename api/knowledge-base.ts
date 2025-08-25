// 繝翫Ξ繝・ず繝吶・繧ｹAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・萓・
import type { NextApiRequest, NextApiResponse } from 'next';

interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  lastUpdated: Date;
  source: string;
}

// 繧ｵ繝ｳ繝励Ν繝翫Ξ繝・ず繝吶・繧ｹ繝・・繧ｿ
const knowledgeBaseData: KnowledgeBaseItem[] = [
  {
    id: 'kb_001',
    title: '繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ險ｺ譁ｭ謇矩・,
    content: '繧ｨ繝ｳ繧ｸ繝ｳ縺悟ｧ句虚縺励↑縺・ｴ蜷医・谿ｵ髫守噪險ｺ譁ｭ謇矩・ゅヰ繝・ユ繝ｪ繝ｼ縲∫㏍譁吶√せ繧ｿ繝ｼ繧ｿ繝ｼ縲∫せ轣ｫ繧ｷ繧ｹ繝・Β縺ｮ鬆・〒遒ｺ隱阪☆繧九・,
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ',
    keywords: ['繧ｨ繝ｳ繧ｸ繝ｳ', '蟋句虚', '繝舌ャ繝・Μ繝ｼ', '辯・侭', '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ'],
    lastUpdated: new Date('2024-01-15'),
    source: '謚陦薙・繝九Η繧｢繝ｫ'
  },
  {
    id: 'kb_002',
    title: '繝舌ャ繝・Μ繝ｼ髮ｻ蝨ｧ縺ｮ貂ｬ螳壽婿豕・,
    content: '繝舌ャ繝・Μ繝ｼ縺ｮ髮ｻ蝨ｧ貂ｬ螳壽焔鬆・・2V莉･荳翫′豁｣蟶ｸ縲・0V莉･荳九・蜈・崕縺悟ｿ・ｦ√・,
    category: '髮ｻ豌礼ｳｻ',
    keywords: ['繝舌ャ繝・Μ繝ｼ', '髮ｻ蝨ｧ', '貂ｬ螳・, '蜈・崕'],
    lastUpdated: new Date('2024-01-10'),
    source: '菫晏ｮ域焔鬆・嶌'
  },
  {
    id: 'kb_003',
    title: '辯・侭繧ｷ繧ｹ繝・Β縺ｮ轤ｹ讀懈婿豕・,
    content: '辯・侭繝輔ぅ繝ｫ繧ｿ繝ｼ縲∫㏍譁吶・繝ｳ繝励√う繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ繝ｼ縺ｮ轤ｹ讀懈焔鬆・・,
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ',
    keywords: ['辯・侭', '繝輔ぅ繝ｫ繧ｿ繝ｼ', '繝昴Φ繝・, '繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｿ繝ｼ'],
    lastUpdated: new Date('2024-01-20'),
    source: '轤ｹ讀懊・繝九Η繧｢繝ｫ'
  },
  {
    id: 'kb_004',
    title: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ繧ｷ繧ｹ繝・Β縺ｮ謨・囿險ｺ譁ｭ',
    content: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ蜍穂ｽ懃｢ｺ隱阪→謨・囿邂・園縺ｮ迚ｹ螳壽婿豕輔・,
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ',
    keywords: ['繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ', '謨・囿', '險ｺ譁ｭ', '蜍穂ｽ懃｢ｺ隱・],
    lastUpdated: new Date('2024-01-12'),
    source: '謨・囿險ｺ譁ｭ繧ｬ繧､繝・
  },
  {
    id: 'kb_005',
    title: '螳牙・菴懈･ｭ縺ｮ蝓ｺ譛ｬ蜴溷援',
    content: '菫晏ｮ井ｽ懈･ｭ譎ゅ・螳牙・遒ｺ隱堺ｺ矩・→菴懈･ｭ謇矩・・,
    category: '螳牙・',
    keywords: ['螳牙・', '菴懈･ｭ', '遒ｺ隱・, '謇矩・],
    lastUpdated: new Date('2024-01-08'),
    source: '螳牙・繝槭ル繝･繧｢繝ｫ'
  },
  {
    id: 'kb_006',
    title: '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β縺ｮ轤ｹ讀懈婿豕・,
    content: '豐ｹ蝨ｧ繝昴Φ繝励√す繝ｪ繝ｳ繝繝ｼ縲・・邂｡縺ｮ轤ｹ讀懊→繝｡繝ｳ繝・リ繝ｳ繧ｹ謇矩・・,
    category: '豐ｹ蝨ｧ邉ｻ',
    keywords: ['豐ｹ蝨ｧ', '繝昴Φ繝・, '繧ｷ繝ｪ繝ｳ繝繝ｼ', '驟咲ｮ｡'],
    lastUpdated: new Date('2024-01-18'),
    source: '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β繝槭ル繝･繧｢繝ｫ'
  },
  {
    id: 'kb_007',
    title: '繝悶Ξ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β縺ｮ轤ｹ讀・,
    content: '繝悶Ξ繝ｼ繧ｭ繝代ャ繝峨√ョ繧｣繧ｹ繧ｯ縲∵ｲｹ蝨ｧ縺ｮ轤ｹ讀懈婿豕輔・,
    category: '襍ｰ陦檎ｳｻ',
    keywords: ['繝悶Ξ繝ｼ繧ｭ', '繝代ャ繝・, '繝・ぅ繧ｹ繧ｯ', '豐ｹ蝨ｧ'],
    lastUpdated: new Date('2024-01-14'),
    source: '繝悶Ξ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β繧ｬ繧､繝・
  },
  {
    id: 'kb_008',
    title: '螳壽悄轤ｹ讀懊・螳滓命隕・・,
    content: '譛域ｬ｡縲∝ｹｴ谺｡轤ｹ讀懊・螳滓命鬆・岼縺ｨ蛻､螳壼渕貅悶・,
    category: '轤ｹ讀・,
    keywords: ['螳壽悄轤ｹ讀・, '譛域ｬ｡', '蟷ｴ谺｡', '蛻､螳壼渕貅・],
    lastUpdated: new Date('2024-01-16'),
    source: '轤ｹ讀懷渕貅匁嶌'
  },
  {
    id: 'kb_009',
    title: '繝悶Ξ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β謨・囿險ｺ譁ｭ',
    content: '繝悶Ξ繝ｼ繧ｭ縺ｮ蜉ｹ縺阪′謔ｪ縺・ｴ蜷医・谿ｵ髫守噪險ｺ譁ｭ謇矩・ゅヶ繝ｬ繝ｼ繧ｭ繝代ャ繝峨・鞫ｩ閠励√ヶ繝ｬ繝ｼ繧ｭ繝輔Ν繝ｼ繝峨・蜉｣蛹悶√ヶ繝ｬ繝ｼ繧ｭ繝帙・繧ｹ縺ｮ謳榊す繧堤｢ｺ隱阪☆繧九・,
    category: '繝悶Ξ繝ｼ繧ｭ邉ｻ',
    keywords: ['繝悶Ξ繝ｼ繧ｭ', '蜉ｹ縺・, '繝代ャ繝・, '繝輔Ν繝ｼ繝・, '繝帙・繧ｹ', '鞫ｩ閠・],
    lastUpdated: new Date('2024-01-22'),
    source: '繝悶Ξ繝ｼ繧ｭ繧ｷ繧ｹ繝・Β謚陦薙・繝九Η繧｢繝ｫ'
  },
  {
    id: 'kb_010',
    title: '繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ逡ｰ蟶ｸ險ｺ譁ｭ',
    content: '繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ縺ｮ逡ｰ蟶ｸ髻ｳ繧・柑邇・ｽ惹ｸ九・險ｺ譁ｭ譁ｹ豕輔ゅが繧､繝ｫ繝ｬ繝吶Ν縲√が繧､繝ｫ蜩∬ｳｪ縲∝・驛ｨ驛ｨ蜩√・轤ｹ讀懈焔鬆・・,
    category: '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ邉ｻ',
    keywords: ['繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ', '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ', '繧ｪ繧､繝ｫ', '逡ｰ蟶ｸ髻ｳ', '蜉ｹ邇・, '貊代ｊ'],
    lastUpdated: new Date('2024-01-24'),
    source: '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ謚陦薙・繝九Η繧｢繝ｫ'
  },
  {
    id: 'kb_011',
    title: '蜀ｷ蜊ｴ繧ｷ繧ｹ繝・Β謨・囿險ｺ譁ｭ',
    content: '繧ｨ繝ｳ繧ｸ繝ｳ繧ｪ繝ｼ繝舌・繝偵・繝医・蜴溷屏險ｺ譁ｭ縲ょ・蜊ｴ豌ｴ縺ｮ貍上ｌ縲√Λ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ縺ｮ隧ｰ縺ｾ繧翫√え繧ｩ繝ｼ繧ｿ繝ｼ繝昴Φ繝励・謨・囿繧堤｢ｺ隱阪☆繧九・,
    category: '蜀ｷ蜊ｴ邉ｻ',
    keywords: ['蜀ｷ蜊ｴ', '繧ｪ繝ｼ繝舌・繝偵・繝・, '繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ', '繧ｦ繧ｩ繝ｼ繧ｿ繝ｼ繝昴Φ繝・, '蜀ｷ蜊ｴ豌ｴ', '貍上ｌ'],
    lastUpdated: new Date('2024-01-26'),
    source: '蜀ｷ蜊ｴ繧ｷ繧ｹ繝・Β謚陦薙・繝九Η繧｢繝ｫ'
  },
  {
    id: 'kb_012',
    title: '襍ｰ陦瑚｣・ｽｮ謨・囿險ｺ譁ｭ',
    content: '襍ｰ陦梧凾縺ｮ逡ｰ蟶ｸ髻ｳ繧・険蜍輔・險ｺ譁ｭ譁ｹ豕輔ゅメ繧ｧ繝ｼ繝ｳ縺ｮ莨ｸ縺ｳ縲√せ繝励Ο繧ｱ繝・ヨ縺ｮ鞫ｩ閠励√Ο繝ｼ繝ｩ繝ｼ縺ｮ謳榊す繧堤｢ｺ隱阪☆繧九・,
    category: '襍ｰ陦檎ｳｻ',
    keywords: ['襍ｰ陦・, '繝√ぉ繝ｼ繝ｳ', '繧ｹ繝励Ο繧ｱ繝・ヨ', '繝ｭ繝ｼ繝ｩ繝ｼ', '逡ｰ蟶ｸ髻ｳ', '謖ｯ蜍・, '鞫ｩ閠・],
    lastUpdated: new Date('2024-01-28'),
    source: '襍ｰ陦瑚｣・ｽｮ謚陦薙・繝九Η繧｢繝ｫ'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<KnowledgeBaseItem[] | { error: string }>
) {
  if (req.method === 'GET') {
    // 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｫ繧医ｋ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
    const { category, keyword } = req.query;
    
    let filteredData = knowledgeBaseData;
    
    if (category) {
      filteredData = filteredData.filter(item => 
        item.category.toLowerCase().includes(category.toString().toLowerCase())
      );
    }
    
    if (keyword) {
      filteredData = filteredData.filter(item =>
        item.keywords.some(k => 
          k.toLowerCase().includes(keyword.toString().toLowerCase())
        ) ||
        item.title.toLowerCase().includes(keyword.toString().toLowerCase()) ||
        item.content.toLowerCase().includes(keyword.toString().toLowerCase())
      );
    }
    
    res.status(200).json(filteredData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}


