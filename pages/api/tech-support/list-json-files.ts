import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 豁｣縺励＞knowledge-base/json繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ繧定ｨｭ螳・
    const metadataDir = path.join(process.cwd(), 'knowledge-base', 'json');
    
    // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // JSON繝輔ぃ繧､繝ｫ縺ｮ荳隕ｧ繧貞叙蠕暦ｼ亥ｮ滄圀縺ｫ蟄伜惠縺吶ｋ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ・・
    const files = fs.readdirSync(metadataDir)
      .filter(file => file.endsWith('_metadata.json'))
      .filter(file => {
        const filePath = path.join(metadataDir, file);
        return fs.existsSync(filePath);
      })
      .sort((a, b) => {
        // 譛譁ｰ縺ｮ繝輔ぃ繧､繝ｫ繧貞・鬆ｭ縺ｫ
        const statA = fs.statSync(path.join(metadataDir, a));
        const statB = fs.statSync(path.join(metadataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    res.status(200).json(files);
  } catch (error) {
    console.error('Error listing JSON files:', error);
    res.status(500).json({ error: 'Failed to list JSON files' });
  }
} 