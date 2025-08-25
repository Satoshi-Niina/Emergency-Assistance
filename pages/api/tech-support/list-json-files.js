"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function handler(req, res) {
    try {
        // 豁｣縺励＞knowledge-base/json繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ繧定ｨｭ螳・
        const metadataDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
        // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
        if (!fs_1.default.existsSync(metadataDir)) {
            fs_1.default.mkdirSync(metadataDir, { recursive: true });
        }
        // JSON繝輔ぃ繧､繝ｫ縺ｮ荳隕ｧ繧貞叙蠕暦ｼ亥ｮ滄圀縺ｫ蟄伜惠縺吶ｋ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ・・
        const files = fs_1.default.readdirSync(metadataDir)
            .filter(file => file.endsWith('_metadata.json'))
            .filter(file => {
            const filePath = path_1.default.join(metadataDir, file);
            return fs_1.default.existsSync(filePath);
        })
            .sort((a, b) => {
            // 譛譁ｰ縺ｮ繝輔ぃ繧､繝ｫ繧貞・鬆ｭ縺ｫ
            const statA = fs_1.default.statSync(path_1.default.join(metadataDir, a));
            const statB = fs_1.default.statSync(path_1.default.join(metadataDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
        });
        res.status(200).json(files);
    }
    catch (error) {
        console.error('Error listing JSON files:', error);
        res.status(500).json({ error: 'Failed to list JSON files' });
    }
}
