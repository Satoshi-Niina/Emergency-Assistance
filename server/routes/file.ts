import { Router } from 'express';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
router.post('/delete', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ繝代せ縺梧欠螳壹＆繧後※縺・∪縺帙ｓ' });
        }
        // 螳牙・縺ｮ縺溘ａ縲√ヱ繧ｹ縺梧欠螳壹＆繧後◆繝・ぅ繝ｬ繧ｯ繝医Μ蜀・↓縺ゅｋ縺薙→繧堤｢ｺ隱・
        const normalizedPath: any = path.normalize(filePath);
        const baseDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
        const absolutePath: any = path.join(__dirname, '../../', normalizedPath);
        if (!absolutePath.startsWith(baseDir)) {
            return res.status(403).json({ error: '險ｱ蜿ｯ縺輔ｌ縺ｦ縺・↑縺・ョ繧｣繝ｬ繧ｯ繝医Μ縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺・ });
        }
        // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
        await fsPromises.access(absolutePath);
        // 繝輔ぃ繧､繝ｫ縺ｮ蜑企勁
        await fsPromises.unlink(absolutePath);
        res.status(200).json({ message: '繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆' });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: '繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
        }
        console.error('繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繝輔ぃ繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});
export default router;
