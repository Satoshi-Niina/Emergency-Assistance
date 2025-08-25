import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAI繧ｯ繝ｩ繧､繧｢繝ｳ繝医・蛻晄悄蛹厄ｼ育腸蠅・､画焚縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺ｿ・・
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn('[DEV] OpenAI client not initialized - API key not available');
    console.warn('[DEV] To enable AI-powered title and description generation, set OPENAI_API_KEY environment variable');
    console.warn('[DEV] The system will use fallback keyword-based generation instead');
}

// 霆贋ｸ｡繝｢繝・Ν縺ｮ繧ｵ繝ｳ繝励Ν繝・・繧ｿ
const vehicleModels = [
    { id: 'mt-100', name: 'MT-100蝙倶ｿ晉ｷ夊ｻ・, keywords: ['MT-100', 'MT100', 'MT 100'] },
    { id: 'mr-400', name: 'MR-400繧ｷ繝ｪ繝ｼ繧ｺ', keywords: ['MR-400', 'MR400', 'MR 400'] },
    { id: 'tc-250', name: 'TC-250菴懈･ｭ霆・, keywords: ['TC-250', 'TC250', 'TC 250'] },
    { id: 'ss-750', name: 'SS-750驥肴ｩ・, keywords: ['SS-750', 'SS750', 'SS 750'] },
];

// 逞・憾縺ｮ繧ｵ繝ｳ繝励Ν繝・・繧ｿ
const symptoms = [
    { id: 'engine-stop', description: '繧ｨ繝ｳ繧ｸ繝ｳ蛛懈ｭ｢', keywords: ['繧ｨ繝ｳ繧ｸ繝ｳ蛛懈ｭ｢', '繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ繧・, '繧ｨ繝ｳ繧ｸ繝ｳ蛻・ｌ', '繧ｨ繝ｳ繧ｸ繝ｳ縺瑚ｵｷ蜍輔＠縺ｪ縺・, '繧ｨ繝ｳ繧ｸ繝ｳ縺悟ｧ句虚縺励↑縺・] },
    { id: 'engine-noise', description: '逡ｰ髻ｳ', keywords: ['逡ｰ髻ｳ', '螟峨↑髻ｳ', '髻ｳ縺後☆繧・, '繝弱ャ繧ｭ繝ｳ繧ｰ', '繝舌Ν繝夜浹', '繝斐せ繝医Φ髻ｳ'] },
    { id: 'engine-overheat', description: '繧ｪ繝ｼ繝舌・繝偵・繝・, keywords: ['繧ｪ繝ｼ繝舌・繝偵・繝・, '豌ｴ貂ｩ荳頑・', '繧ｨ繝ｳ繧ｸ繝ｳ縺檎・縺・, '蜀ｷ蜊ｴ豌ｴ荳崎ｶｳ'] },
    { id: 'brake-failure', description: '繝悶Ξ繝ｼ繧ｭ荳崎憶', keywords: ['繝悶Ξ繝ｼ繧ｭ荳崎憶', '繝悶Ξ繝ｼ繧ｭ縺悟柑縺九↑縺・, '繝悶Ξ繝ｼ繧ｭ謨・囿', '繝悶Ξ繝ｼ繧ｭ縺瑚ｧ｣謾ｾ縺励↑縺・, '繝悶Ξ繝ｼ繧ｭ縺悟茜縺九↑縺・] },
    { id: 'brake-noise', description: '繝悶Ξ繝ｼ繧ｭ逡ｰ髻ｳ', keywords: ['繝悶Ξ繝ｼ繧ｭ逡ｰ髻ｳ', '繝悶Ξ繝ｼ繧ｭ縺九ｉ髻ｳ', '繝悶Ξ繝ｼ繧ｭ魑ｴ縺・] },
    { id: 'hydraulic-leak', description: '豐ｹ蝨ｧ貍上ｌ', keywords: ['豐ｹ蝨ｧ貍上ｌ', '繧ｪ繧､繝ｫ貍上ｌ', '貍乗ｲｹ', '豐ｹ縺梧ｼ上ｌ繧・, '繧ｪ繧､繝ｫ縺梧ｼ上ｌ繧・] },
    { id: 'hydraulic-pressure', description: '豐ｹ蝨ｧ荳崎ｶｳ', keywords: ['豐ｹ蝨ｧ荳崎ｶｳ', '豐ｹ蝨ｧ縺御ｽ弱＞', '豐ｹ蝨ｧ隴ｦ蜻・, '豐ｹ蝨ｧ菴惹ｸ・] },
    { id: 'electrical-failure', description: '髮ｻ豌礼ｳｻ邨ｱ謨・囿', keywords: ['髮ｻ豌礼ｳｻ邨ｱ', '髮ｻ陬・刀', '髮ｻ豌嶺ｸ崎憶', '髮ｻ豌玲腐髫・, '驟咲ｷ壻ｸ崎憶'] },
    { id: 'electrical-short', description: '髮ｻ豌励す繝ｧ繝ｼ繝・, keywords: ['髮ｻ豌励す繝ｧ繝ｼ繝・, '繧ｷ繝ｧ繝ｼ繝・, '驟咲ｷ壹す繝ｧ繝ｼ繝・, '髮ｻ豌礼↓闃ｱ'] },
    { id: 'transmission-failure', description: '螟蛾滓ｩ滓腐髫・, keywords: ['螟蛾滓ｩ滓腐髫・, '繧ｮ繧｢縺悟・繧峨↑縺・, '螟蛾滉ｸ崎憶', '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ謨・囿'] },
    { id: 'transmission-noise', description: '螟蛾滓ｩ溽焚髻ｳ', keywords: ['螟蛾滓ｩ溽焚髻ｳ', '繧ｮ繧｢髻ｳ', '螟蛾滄浹'] },
    { id: 'air-pressure', description: '遨ｺ豌怜悸荳崎ｶｳ', keywords: ['遨ｺ豌怜悸荳崎ｶｳ', '繧ｨ繧｢繝ｼ縺後◆縺ｾ繧峨↑縺・, '遨ｺ豌怜悸隴ｦ蜻・, '繧ｨ繧｢繝ｼ蝨ｧ菴惹ｸ・] },
    { id: 'battery-dead', description: '繝舌ャ繝・Μ繝ｼ荳翫′繧・, keywords: ['繝舌ャ繝・Μ繝ｼ荳翫′繧・, '繝舌ャ繝・Μ繝ｼ蛻・ｌ', '繝舌ャ繝・Μ繝ｼ荳崎ｶｳ', '髮ｻ蝨ｧ荳崎ｶｳ'] },
    { id: 'warning-light', description: '隴ｦ蜻顔・轤ｹ轣ｯ', keywords: ['隴ｦ蜻顔・', '隴ｦ蜻翫Λ繝ｳ繝・, '繧｢繝ｩ繝ｼ繝', '隴ｦ蜻企浹'] },
    { id: 'operation-failure', description: '謫堺ｽ應ｸ崎憶', keywords: ['謫堺ｽ應ｸ崎憶', '謫堺ｽ懊〒縺阪↑縺・, '蜍穂ｽ懊＠縺ｪ縺・, '蜿榊ｿ懊＠縺ｪ縺・] },
    { id: 'vibration', description: '謖ｯ蜍・, keywords: ['謖ｯ蜍・, '謠ｺ繧・, '縺後◆縺､縺・, '謖ｯ蜍輔☆繧・] },
    { id: 'smoke', description: '辣・, keywords: ['辣・, '逋ｽ辣・, '鮟堤・', '辣吶′蜃ｺ繧・] },
    { id: 'fuel-problem', description: '辯・侭蝠城｡・, keywords: ['辯・侭荳崎ｶｳ', '辯・侭蛻・ｌ', '繧ｬ繧ｽ繝ｪ繝ｳ荳崎ｶｳ', '霆ｽ豐ｹ荳崎ｶｳ'] },
    { id: 'cooling-problem', description: '蜀ｷ蜊ｴ蝠城｡・, keywords: ['蜀ｷ蜊ｴ豌ｴ荳崎ｶｳ', '蜀ｷ蜊ｴ豌ｴ貍上ｌ', '繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ', '蜀ｷ蜊ｴ荳崎憶'] },
];

// 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｵ繝ｳ繝励Ν繝・・繧ｿ
const components = [
    { id: 'engine', name: '繧ｨ繝ｳ繧ｸ繝ｳ', keywords: ['繧ｨ繝ｳ繧ｸ繝ｳ', 'engine', '繝｢繝ｼ繧ｿ繝ｼ', '蜴溷虚讖・] },
    { id: 'brake', name: '繝悶Ξ繝ｼ繧ｭ', keywords: ['繝悶Ξ繝ｼ繧ｭ', 'brake', '蛻ｶ蜍戊｣・ｽｮ', '蛻ｶ蜍募勣'] },
    { id: 'hydraulic', name: '豐ｹ蝨ｧ邉ｻ邨ｱ', keywords: ['豐ｹ蝨ｧ', 'hydraulic', '繧ｪ繧､繝ｫ', '豐ｹ', '豐ｹ蝨ｧ邉ｻ邨ｱ', '豐ｹ蝨ｧ陬・ｽｮ'] },
    { id: 'electrical', name: '髮ｻ豌礼ｳｻ邨ｱ', keywords: ['髮ｻ豌・, 'electrical', '髮ｻ陬・, '驟咲ｷ・, '髮ｻ豌礼ｳｻ邨ｱ', '髮ｻ陬・刀'] },
    { id: 'transmission', name: '螟蛾滓ｩ・, keywords: ['螟蛾滓ｩ・, 'transmission', '繧ｮ繧｢', '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ', '螟蛾溯｣・ｽｮ'] },
    { id: 'air-system', name: '遨ｺ豌礼ｳｻ邨ｱ', keywords: ['遨ｺ豌・, '繧ｨ繧｢繝ｼ', 'air', '遨ｺ豌礼ｳｻ邨ｱ', '繧ｨ繧｢繝ｼ邉ｻ邨ｱ'] },
    { id: 'battery', name: '繝舌ャ繝・Μ繝ｼ', keywords: ['繝舌ャ繝・Μ繝ｼ', 'battery', '闢・崕豎', '髮ｻ貅・] },
    { id: 'cooling', name: '蜀ｷ蜊ｴ邉ｻ邨ｱ', keywords: ['蜀ｷ蜊ｴ', 'cooling', '繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ', '蜀ｷ蜊ｴ豌ｴ', '蜀ｷ蜊ｴ邉ｻ邨ｱ'] },
    { id: 'fuel', name: '辯・侭邉ｻ邨ｱ', keywords: ['辯・侭', 'fuel', '繧ｬ繧ｽ繝ｪ繝ｳ', '霆ｽ豐ｹ', '辯・侭邉ｻ邨ｱ'] },
    { id: 'pump', name: '繝昴Φ繝・, keywords: ['繝昴Φ繝・, 'pump', '豐ｹ蝨ｧ繝昴Φ繝・, '辯・侭繝昴Φ繝・] },
    { id: 'motor', name: '繝｢繝ｼ繧ｿ繝ｼ', keywords: ['繝｢繝ｼ繧ｿ繝ｼ', 'motor', '髮ｻ蜍墓ｩ・, '鬧・虚繝｢繝ｼ繧ｿ繝ｼ'] },
    { id: 'sensor', name: '繧ｻ繝ｳ繧ｵ繝ｼ', keywords: ['繧ｻ繝ｳ繧ｵ繝ｼ', 'sensor', '讀懷・蝎ｨ', '諢溽衍蝎ｨ'] },
    { id: 'valve', name: '繝舌Ν繝・, keywords: ['繝舌Ν繝・, 'valve', '蠑・, '蛻ｶ蠕｡蠑・] },
    { id: 'filter', name: '繝輔ぅ繝ｫ繧ｿ繝ｼ', keywords: ['繝輔ぅ繝ｫ繧ｿ繝ｼ', 'filter', '豼ｾ驕主勣', '繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ', '繧ｪ繧､繝ｫ繝輔ぅ繝ｫ繧ｿ繝ｼ'] },
    { id: 'hose', name: '繝帙・繧ｹ', keywords: ['繝帙・繧ｹ', 'hose', '驟咲ｮ｡', '豐ｹ蝨ｧ繝帙・繧ｹ', '繧ｨ繧｢繝ｼ繝帙・繧ｹ'] },
];

/**
 * 繝・く繧ｹ繝医°繧峨さ繝ｳ繝昴・繝阪Φ繝磯未騾｣縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺吶ｋ
 */
export function extractComponentKeywords(text: string): string[] {
    const foundComponents: string[] = [];
    for (const component of components) {
        for (const keyword of component.keywords) {
            if (text.includes(keyword) && !foundComponents.includes(component.name)) {
                foundComponents.push(component.name);
                break;
            }
        }
    }
    return foundComponents;
}

/**
 * 繝・く繧ｹ繝医°繧臥裸迥ｶ髢｢騾｣縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺吶ｋ
 */
export function extractSymptomKeywords(text: string): string[] {
    const foundSymptoms: string[] = [];
    for (const symptom of symptoms) {
        for (const keyword of symptom.keywords) {
            if (text.includes(keyword) && !foundSymptoms.includes(symptom.description)) {
                foundSymptoms.push(symptom.description);
                break;
            }
        }
    }
    return foundSymptoms;
}

/**
 * 繝・く繧ｹ繝医°繧牙庄閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ繝｢繝・Ν繧貞愛蛻･縺吶ｋ
 */
export function detectPossibleModels(text: string): string[] {
    const foundModels: string[] = [];
    for (const model of vehicleModels) {
        for (const keyword of model.keywords) {
            if (text.includes(keyword) && !foundModels.includes(model.name)) {
                foundModels.push(model.name);
                break;
            }
        }
    }
    return foundModels;
}

/**
 * 譌･譛ｬ隱槭ち繧､繝医Ν繧堤函謌舌☆繧具ｼ育匱逕滉ｺ玖ｱ｡縺ｫ繧医ｊ霑代＞蜈ｷ菴鍋噪縺ｪ繧ｿ繧､繝医Ν・・
 */
async function generateJapaneseTitle(userMessages: string, allMessages?: string): Promise<string> {
    // 逕ｻ蜒上ョ繝ｼ繧ｿ・・ase64・峨′蜷ｫ縺ｾ繧後※縺・ｋ蝣ｴ蜷医・髯､螟悶＠縺ｦ繝・く繧ｹ繝医・縺ｿ繧呈歓蜃ｺ
    const textOnlyMessages = userMessages
        .split('\n')
        .filter(line => !line.trim().startsWith('data:image/'))
        .join('\n')
        .trim();
    
    // 繝・く繧ｹ繝医′谿九▲縺ｦ縺・↑縺・ｴ蜷医・縲∫判蜒上′蜈医↓騾∽ｿ｡縺輔ｌ縺溘→蛻､譁ｭ
    // 縺薙・蝣ｴ蜷医・縲∝・繝｡繝・そ繝ｼ繧ｸ縺九ｉ逋ｺ逕滉ｺ玖ｱ｡繧呈耳貂ｬ縺吶ｋ
    if (!textOnlyMessages) {
        // 蜈ｨ繝｡繝・そ繝ｼ繧ｸ・・I蠢懃ｭ斐ｂ蜷ｫ繧・峨°繧臥匱逕滉ｺ玖ｱ｡繧呈耳貂ｬ
        if (allMessages) {
            const allTextOnly = allMessages
                .split('\n')
                .filter(line => !line.trim().startsWith('data:image/'))
                .join('\n')
                .trim();
            
            if (allTextOnly) {
                // 蜈ｨ繝｡繝・そ繝ｼ繧ｸ縺九ｉ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ縺励※繧ｿ繧､繝医Ν繧堤函謌・
                const extractedComponents = extractComponentKeywords(allTextOnly);
                const extractedSymptoms = extractSymptomKeywords(allTextOnly);
                
                if (extractedComponents.length > 0 && extractedSymptoms.length > 0) {
                    const component = extractedComponents[0];
                    const symptom = extractedSymptoms[0];
                    
                    // 繧医ｊ蜈ｷ菴鍋噪縺ｪ繧ｿ繧､繝医Ν繧堤函謌・
                    if (symptom.includes('謨・囿') || symptom.includes('荳崎憶')) {
                        return `${component}謨・囿`;
                    } else if (symptom.includes('蛛懈ｭ｢') || symptom.includes('豁｢縺ｾ')) {
                        return `${component}蛛懈ｭ｢`;
                    } else if (symptom.includes('逡ｰ髻ｳ') || symptom.includes('髻ｳ')) {
                        return `${component}逡ｰ髻ｳ`;
                    } else if (symptom.includes('貍上ｌ') || symptom.includes('貍乗ｲｹ')) {
                        return `${component}貍上ｌ`;
                    } else if (symptom.includes('隴ｦ蜻・) || symptom.includes('繧｢繝ｩ繝ｼ繝')) {
                        return `${component}隴ｦ蜻柿;
                    } else if (symptom.includes('蜍穂ｽ應ｸ崎憶') || symptom.includes('蜍穂ｽ懊＠縺ｪ縺・)) {
                        return `${component}蜍穂ｽ應ｸ崎憶`;
                    } else if (symptom.includes('繧ｪ繝ｼ繝舌・繝偵・繝・) || symptom.includes('辭ｱ縺・)) {
                        return `${component}繧ｪ繝ｼ繝舌・繝偵・繝・;
                    } else {
                        return `${component}${symptom}`;
                    }
                } else if (extractedComponents.length > 0) {
                    // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・縺ｿ謚ｽ蜃ｺ縺ｧ縺阪◆蝣ｴ蜷医∽ｸ闊ｬ逧・↑謨・囿繧ｿ繧､繝医Ν繧堤函謌・
                    const component = extractedComponents[0];
                    return `${component}謨・囿`;
                } else if (extractedSymptoms.length > 0) {
                    // 逞・憾縺ｮ縺ｿ謚ｽ蜃ｺ縺ｧ縺阪◆蝣ｴ蜷・
                    const symptom = extractedSymptoms[0];
                    return `${symptom}逋ｺ逕歔;
                }
            }
        }
        
        // 謗ｨ貂ｬ縺ｧ縺阪↑縺・ｴ蜷医・縲∵凾髢灘ｸｯ縺ｫ蠢懊§縺滉ｸ闊ｬ逧・↑繧ｿ繧､繝医Ν繧堤函謌・
        const timestamp = new Date();
        const hour = timestamp.getHours();
        
        if (hour >= 6 && hour < 18) {
            return '菴懈･ｭ荳ｭ縺ｮ謨・囿蝣ｱ蜻・;
        } else {
            return '邱頑･謨・囿蝣ｱ蜻・;
        }
    }
    
    // 繧ｭ繝ｼ繝ｯ繝ｼ繝画歓蜃ｺ讖溯・繧剃ｽｿ逕ｨ縺励※逋ｺ逕滉ｺ玖ｱ｡縺ｮ蜀・ｮｹ繧貞・譫・
    const extractedComponents = extractComponentKeywords(textOnlyMessages);
    const extractedSymptoms = extractSymptomKeywords(textOnlyMessages);
    
    // 繧ｳ繝ｳ繝昴・繝阪Φ繝医→逞・憾縺ｮ荳｡譁ｹ縺梧歓蜃ｺ縺ｧ縺阪◆蝣ｴ蜷・
    if (extractedComponents.length > 0 && extractedSymptoms.length > 0) {
        const component = extractedComponents[0];
        const symptom = extractedSymptoms[0];
        
        // 繧医ｊ蜈ｷ菴鍋噪縺ｧ逋ｺ逕滉ｺ玖ｱ｡縺ｫ霑代＞繧ｿ繧､繝医Ν繧堤函謌・
        let title = '';
        
        // 逞・憾縺ｫ蠢懊§縺ｦ驕ｩ蛻・↑陦ｨ迴ｾ繧帝∈謚橸ｼ医ｈ繧雁・菴鍋噪縺ｫ・・
        if (symptom.includes('謨・囿') || symptom.includes('荳崎憶')) {
            title = `${component}謨・囿`;
        } else if (symptom.includes('蛛懈ｭ｢') || symptom.includes('豁｢縺ｾ') || symptom.includes('襍ｷ蜍輔＠縺ｪ縺・) || symptom.includes('蟋句虚縺励↑縺・)) {
            title = `${component}蛛懈ｭ｢`;
        } else if (symptom.includes('諤･縺ｫ蛛懈ｭ｢') || symptom.includes('遯∫┯蛛懈ｭ｢')) {
            title = `${component}諤･縺ｫ蛛懈ｭ｢`;
        } else if (symptom.includes('逡ｰ髻ｳ') || symptom.includes('髻ｳ') || symptom.includes('繝弱ャ繧ｭ繝ｳ繧ｰ') || symptom.includes('繝舌Ν繝夜浹')) {
            title = `${component}逡ｰ髻ｳ`;
        } else if (symptom.includes('貍上ｌ') || symptom.includes('貍乗ｲｹ') || symptom.includes('豐ｹ縺梧ｼ上ｌ繧・)) {
            title = `${component}貍上ｌ`;
        } else if (symptom.includes('隴ｦ蜻・) || symptom.includes('繧｢繝ｩ繝ｼ繝') || symptom.includes('隴ｦ蜻顔・')) {
            title = `${component}隴ｦ蜻柿;
        } else if (symptom.includes('蜍穂ｽ應ｸ崎憶') || symptom.includes('蜍穂ｽ懊＠縺ｪ縺・) || symptom.includes('謫堺ｽ應ｸ崎憶') || symptom.includes('蜿榊ｿ懊＠縺ｪ縺・)) {
            title = `${component}蜍穂ｽ應ｸ崎憶`;
        } else if (symptom.includes('繧ｪ繝ｼ繝舌・繝偵・繝・) || symptom.includes('豌ｴ貂ｩ荳頑・') || symptom.includes('辭ｱ縺・)) {
            title = `${component}繧ｪ繝ｼ繝舌・繝偵・繝・;
        } else if (symptom.includes('荳崎ｶｳ') || symptom.includes('菴惹ｸ・)) {
            title = `${component}荳崎ｶｳ`;
        } else if (symptom.includes('謖ｯ蜍・) || symptom.includes('謠ｺ繧・) || symptom.includes('縺後◆縺､縺・)) {
            title = `${component}謖ｯ蜍描;
        } else if (symptom.includes('辣・) || symptom.includes('逋ｽ辣・) || symptom.includes('鮟堤・')) {
            title = `${component}辣兪;
        } else if (symptom.includes('隗｣謾ｾ縺励↑縺・) || symptom.includes('蛻ｩ縺九↑縺・)) {
            title = `${component}隗｣謾ｾ縺励↑縺Я;
        } else if (symptom.includes('縺溘∪繧峨↑縺・) || symptom.includes('蝨ｧ蜉帑ｸ崎ｶｳ')) {
            title = `${component}蝨ｧ蜉帑ｸ崎ｶｳ`;
        } else {
            // 繧医ｊ蜈ｷ菴鍋噪縺ｪ陦ｨ迴ｾ繧定ｩｦ陦・
            const userWords = textOnlyMessages.toLowerCase();
            if (userWords.includes('諤･縺ｫ') || userWords.includes('遯∫┯')) {
                title = `${component}諤･縺ｫ${symptom}`;
            } else if (userWords.includes('螳悟・縺ｫ') || userWords.includes('蜈ｨ縺・)) {
                title = `${component}螳悟・${symptom}`;
            } else {
                title = `${component}${symptom}`;
            }
        }
        
        // 髟ｷ縺募宛髯・
        if (title.length > 35) {
            title = title.substring(0, 35);
        }
        
        return title;
    }
    
    // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・縺ｿ謚ｽ蜃ｺ縺ｧ縺阪◆蝣ｴ蜷・
    if (extractedComponents.length > 0) {
        const component = extractedComponents[0];
        // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ蜈ｷ菴鍋噪縺ｪ逞・憾繧呈爾縺・
        const userWords = textOnlyMessages.toLowerCase();
        if (userWords.includes('蛛懈ｭ｢') || userWords.includes('豁｢縺ｾ')) {
            return `${component}蛛懈ｭ｢`;
        } else if (userWords.includes('謨・囿') || userWords.includes('荳崎憶')) {
            return `${component}謨・囿`;
        } else if (userWords.includes('逡ｰ髻ｳ') || userWords.includes('髻ｳ')) {
            return `${component}逡ｰ髻ｳ`;
        } else {
            return `${component}繝医Λ繝悶Ν`;
        }
    }
    
    // 逞・憾縺ｮ縺ｿ謚ｽ蜃ｺ縺ｧ縺阪◆蝣ｴ蜷・
    if (extractedSymptoms.length > 0) {
        const symptom = extractedSymptoms[0];
        return `${symptom}逋ｺ逕歔;
    }
    
    // 繧ｭ繝ｼ繝ｯ繝ｼ繝画歓蜃ｺ縺後〒縺阪↑縺・ｴ蜷医・縲√Θ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｮ譛蛻昴・陦後ｒ菴ｿ逕ｨ
    const firstMessage = textOnlyMessages.split('\n')[0].trim();
    if (firstMessage && firstMessage.length > 0) {
        // 髟ｷ縺吶℃繧句ｴ蜷医・遏ｭ邵ｮ
        if (firstMessage.length > 35) {
            return firstMessage.substring(0, 35);
        }
        return firstMessage;
    }
    
    // 譛邨ゅヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ
    return '霆贋ｸ｡繝医Λ繝悶Ν';
}

/**
 * 繝√Ε繝・ヨ螻･豁ｴ繧貞ｱ･豁ｴ邂｡逅・I逕ｨ縺ｫ繝輔か繝ｼ繝槭ャ繝医☆繧・
 */
export async function formatChatHistoryForHistoryUI(chat: any, messages: any, messageMedia: any, machineInfo: any) {
    // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ繝・く繧ｹ繝医・縺ｿ繧呈歓蜃ｺ・育判蜒上ｒ髯､螟厄ｼ・
    const userMessages = messages.filter((m: any) => !m.isAiResponse);
    const userTextMessages = userMessages
        .map((m: any) => m.content)
        .filter(content => !content.trim().startsWith('data:image/'))
        .join('\n');
    
    const allText = messages.map((m: any) => m.content).join(' ');
    
    // 譌･譛ｬ隱槭ち繧､繝医Ν繧堤函謌撰ｼ育判蜒上・縺ｿ縺ｮ蝣ｴ蜷医・蜈ｨ繝｡繝・そ繝ｼ繧ｸ縺九ｉ謗ｨ貂ｬ・・
    const title = await generateJapaneseTitle(userTextMessages, allText);
    
    // 蝠城｡後・隧ｳ邏ｰ隱ｬ譏弱ｒ逕滓・・・PT繧剃ｽｿ繧上★縺ｫ繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ・・
    const extractedComponents = extractComponentKeywords(allText);
    const extractedSymptoms = extractSymptomKeywords(allText);
    const possibleModels = detectPossibleModels(allText);
    
    // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ・育判蜒上ｒ髯､螟厄ｼ・
    let problemDescription = userTextMessages;
    
    // 髟ｷ縺吶℃繧句ｴ蜷医・遏ｭ邵ｮ
    if (problemDescription.length > 200) {
        problemDescription = problemDescription.substring(0, 200) + '...';
    }
    
    // 遨ｺ縺ｮ蝣ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
    if (!problemDescription || problemDescription.trim().length === 0) {
        problemDescription = extractedSymptoms.length > 0 
            ? `${extractedSymptoms.join('縺ｨ')}縺ｮ逞・憾縺悟ｱ蜻翫＆繧後※縺・∪縺吶Ａ
            : '隧ｳ邏ｰ縺ｪ逞・憾縺ｯ蝣ｱ蜻翫＆繧後※縺・∪縺帙ｓ縲・;
    }

    // 莨夊ｩｱ螻･豁ｴ繧堤ｰ｡貎斐↓謨ｴ逅・
    const conversationHistory = messages.map((message: any) => {
        // 繝｡繝・ぅ繧｢諠・ｱ繧貞叙蠕・
        let mediaInfo = [];
        if (messageMedia && typeof messageMedia === 'object') {
            const messageMediaItems = messageMedia[message.id] || [];
            mediaInfo = messageMediaItems.map((media: any) => ({
                id: media.id,
                type: media.type,
                filename: media.filename,
                path: media.path
            }));
        }
        
        return {
            id: message.id,
            content: message.content,
            isAiResponse: message.isAiResponse,
            timestamp: message.createdAt,
            media: mediaInfo
        };
    });

    // 螻･豁ｴ邂｡逅・I逕ｨ縺ｮ繝・・繧ｿ讒矩
    const historyData = {
        chat_id: chat.id,
        user_id: chat.userId,
        title: title,
        problem_description: problemDescription,
        machine_type: machineInfo?.machineTypeName || '',
        machine_number: machineInfo?.machineNumber || '',
        extracted_components: extractedComponents,
        extracted_symptoms: extractedSymptoms,
        possible_models: possibleModels,
        conversation_history: conversationHistory,
        export_timestamp: new Date().toISOString(),
        metadata: {
            total_messages: messages.length,
            user_messages: messages.filter((m: any) => !m.isAiResponse).length,
            ai_messages: messages.filter((m: any) => m.isAiResponse).length,
            total_media: typeof messageMedia === 'object' ? 
                Object.values(messageMedia).flat().length : 
                (Array.isArray(messageMedia) ? messageMedia.length : 0),
            export_format_version: "2.0"
        }
    };

    return historyData;
}

/**
 * 繝√Ε繝・ヨ螻･豁ｴ繧貞､夜Κ繧ｷ繧ｹ繝・Β逕ｨ縺ｫ繝輔か繝ｼ繝槭ャ繝医☆繧具ｼ亥ｾ捺擂縺ｮ蠖｢蠑擾ｼ・
 */
export async function formatChatHistoryForExternalSystem(chat: any, messages: any, messageMedia: any, lastExport: any) {
    const allText = messages.map((m: any) => m.content).join(' ');
    const extractedComponents = extractComponentKeywords(allText);
    const extractedSymptoms = extractSymptomKeywords(allText);
    const possibleModels = detectPossibleModels(allText);

    let primaryProblem = '';
    let problemDescription = '';

    if (openai) {
        try {
            const userMessages = messages.filter((m: any) => !m.isAiResponse).map((m: any) => m.content).join('\n');
            const prompt = `
莉･荳九・驩・％菫晏ｮ育畑霆贋ｸ｡縺ｮ繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺ｫ髢｢縺吶ｋ莨夊ｩｱ縺ｧ縺吶・
縺薙・莨夊ｩｱ縺九ｉ縲∽ｸｻ隕√↑蝠城｡後→蝠城｡後・隧ｳ邏ｰ縺ｪ隱ｬ譏弱ｒ譌･譛ｬ隱槭〒謚ｽ蜃ｺ縺励※縺上□縺輔＞縲・
謚ｽ蜃ｺ邨先棡縺ｯ莉･荳九・JSON繝輔か繝ｼ繝槭ャ繝医〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "primary_problem": "邁｡貎斐↑蝠城｡後・繧ｿ繧､繝医Ν・・5-20譁・ｭ礼ｨ句ｺｦ・・,
  "problem_description": "蝠城｡後・隧ｳ邏ｰ隱ｬ譏趣ｼ・0-100譁・ｭ礼ｨ句ｺｦ・・
}

莨夊ｩｱ・・
${userMessages}
`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || '{"primary_problem":"荳肴・縺ｪ蝠城｡・,"problem_description":"隧ｳ邏ｰ諠・ｱ縺ｪ縺・}';
            const result = JSON.parse(content);
            primaryProblem = result.primary_problem;
            problemDescription = result.problem_description;
        } catch (error) {
            console.error('蝠城｡梧歓蜃ｺ繧ｨ繝ｩ繝ｼ:', error);
            // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・↓騾ｲ繧
        }
    }
    
    // OpenAI縺悟茜逕ｨ縺ｧ縺阪↑縺・ｴ蜷医ｄ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
    if (!primaryProblem || !problemDescription) {
        const extractedComponents = extractComponentKeywords(allText);
        const extractedSymptoms = extractSymptomKeywords(allText);
        
        primaryProblem = extractedComponents.length > 0 && extractedSymptoms.length > 0
            ? `${extractedComponents[0]}縺ｮ${extractedSymptoms[0]}`
            : '霆贋ｸ｡繝医Λ繝悶Ν';
            
        problemDescription = extractedSymptoms.length > 0
            ? `${extractedSymptoms.join('縺ｨ')}縺ｮ逞・憾縺悟ｱ蜻翫＆繧後※縺・∪縺吶Ａ
            : '隧ｳ邏ｰ縺ｪ逞・憾縺ｯ蝣ｱ蜻翫＆繧後※縺・∪縺帙ｓ縲・;
    }

    let environmentContext = '';
    if (openai) {
        try {
            const contextPrompt = `
莉･荳九・驩・％菫晏ｮ育畑霆贋ｸ｡縺ｮ繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺ｫ髢｢縺吶ｋ莨夊ｩｱ縺ｧ縺吶・
縺薙・莨夊ｩｱ縺九ｉ縲∬ｻ贋ｸ｡縺ｮ迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｄ迺ｰ蠅・↓髢｢縺吶ｋ諠・ｱ繧・0-80譁・ｭ礼ｨ句ｺｦ縺ｧ邁｡貎斐↓縺ｾ縺ｨ繧√※縺上□縺輔＞縲・
萓九∴縺ｰ縲瑚ｻ贋ｸ｡縺ｯ笳銀雷縺ｮ迥ｶ諷九〒笆ｳ笆ｳ縺ｮ逞・憾縺檎匱逕溘＠縺ｦ縺・ｋ縲阪→縺・▲縺溷ｽ｢蠑上〒縺吶・

莨夊ｩｱ・・
${messages.slice(0, 10).map((m: any) => m.content).join('\n')}
`;

            const contextResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: contextPrompt }],
            });

            environmentContext = contextResponse.choices[0].message.content?.trim() || '莨夊ｩｱ蜀・ｮｹ縺九ｉ迺ｰ蠅・ュ蝣ｱ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
        } catch (error) {
            console.error('迺ｰ蠅・ュ蝣ｱ縺ｮ逕滓・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
            environmentContext = '莨夊ｩｱ縺九ｉ迺ｰ蠅・ュ蝣ｱ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
        }
    } else {
        environmentContext = 'OpenAI API縺悟茜逕ｨ縺ｧ縺阪↑縺・◆繧√∫腸蠅・ュ蝣ｱ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
    }

    const conversationHistory = messages.map((message: any) => {
        // 繧ｳ繝ｳ繝・Φ繝・・縺ｮ逕ｻ蜒上ヱ繧ｹ繧呈､懷・
        let updatedContent = message.content;
        
        // 逕ｻ蜒上ヱ繧ｹ繧呈ｭ｣隕剰｡ｨ迴ｾ縺ｧ謚ｽ蜃ｺ - 繝代ち繝ｼ繝ｳ繧呈僑蠑ｵ縺励※逶ｸ蟇ｾ繝代せ縺ｨ邨ｶ蟇ｾ繝代せ縺ｮ荳｡譁ｹ縺ｫ蟇ｾ蠢・
        const imagePathRegex = /(\/|\.\/)?(knowledge-base|public)\/images\/[^)\s"'\n]+\.(svg|png|jpg|jpeg)/g;
        const imagePaths = message.content.match(imagePathRegex) || [];
        
        console.log(`繝｡繝・そ繝ｼ繧ｸID ${message.id}: ${imagePaths.length}蛟九・逕ｻ蜒上ヱ繧ｹ繧呈､懷・`);
        
        // Base64繧ｨ繝ｳ繧ｳ繝ｼ繝峨＠縺溽判蜒上ョ繝ｼ繧ｿ繧剃ｿ晄戟縺吶ｋ繝槭ャ繝・
        const base64Images: { [key: string]: string } = {};
        
        // 蜷・判蜒上ヱ繧ｹ縺ｫ蟇ｾ縺励※Base64繧ｨ繝ｳ繧ｳ繝ｼ繝峨ｒ螳溯｡・
        for (const imagePath of imagePaths) {
            try {
                // 繝代せ繧呈ｭ｣隕丞喧
                const normalizedPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;
                const fullPath = path.join(__dirname, '../../', normalizedPath);
                
                if (fs.existsSync(fullPath)) {
                    const imageBuffer = fs.readFileSync(fullPath);
                    const base64Data = imageBuffer.toString('base64');
                    const fileExtension = path.extname(imagePath).slice(1);
                    const mimeType = fileExtension === 'svg' ? 'image/svg+xml' : `image/${fileExtension}`;
                    base64Images[imagePath] = `data:${mimeType};base64,${base64Data}`;
                    console.log(`逕ｻ蜒上ｒBase64繧ｨ繝ｳ繧ｳ繝ｼ繝・ ${imagePath}`);
                } else {
                    console.warn(`逕ｻ蜒上ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${fullPath}`);
                }
            } catch (error) {
                console.error(`逕ｻ蜒上・Base64繧ｨ繝ｳ繧ｳ繝ｼ繝我ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ: ${imagePath}`, error);
            }
        }
        
        // 繝｡繝・ぅ繧｢諠・ｱ繧定ｿｽ蜉
        let mediaInfo = [];
        if (messageMedia && typeof messageMedia === 'object') {
            // messageMedia縺後が繝悶ず繧ｧ繧ｯ繝医・蝣ｴ蜷茨ｼ医Γ繝・そ繝ｼ繧ｸID繧偵く繝ｼ縺ｨ縺吶ｋ・・
            const messageMediaItems = messageMedia[message.id] || [];
            mediaInfo = messageMediaItems.map((media: any) => ({
                id: media.id,
                type: media.type,
                filename: media.filename,
                path: media.path
            }));
        } else if (Array.isArray(messageMedia)) {
            // messageMedia縺碁・蛻励・蝣ｴ蜷茨ｼ亥ｾ捺擂縺ｮ蠖｢蠑擾ｼ・
            const messageMediaItems = messageMedia.filter((media: any) => media.messageId === message.id);
            mediaInfo = messageMediaItems.map((media: any) => ({
                id: media.id,
                type: media.type,
                filename: media.filename,
                path: media.path
            }));
        }
        
        return {
            id: message.id,
            content: updatedContent,
            isAiResponse: message.isAiResponse,
            timestamp: message.createdAt,
            media: mediaInfo,
            base64Images: Object.keys(base64Images).length > 0 ? base64Images : undefined
        };
    });

    // 譛邨ら噪縺ｪ繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ繧呈ｧ狗ｯ・
    const exportData = {
        chat_id: chat.id,
        user_id: chat.userId,
        export_timestamp: new Date().toISOString(),
        last_export_timestamp: lastExport ? lastExport.timestamp.toISOString() : null,
        primary_problem: primaryProblem,
        problem_description: problemDescription,
        extracted_components: extractedComponents,
        extracted_symptoms: extractedSymptoms,
        possible_models: possibleModels,
        environment_context: environmentContext,
        conversation_history: conversationHistory,
        metadata: {
            total_messages: messages.length,
            user_messages: messages.filter((m: any) => !m.isAiResponse).length,
            ai_messages: messages.filter((m: any) => m.isAiResponse).length,
            total_media: typeof messageMedia === 'object' ? 
                Object.values(messageMedia).flat().length : 
                (Array.isArray(messageMedia) ? messageMedia.length : 0),
            export_format_version: "1.0"
        }
    };

    return exportData;
} 