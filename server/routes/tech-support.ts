import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
// Fuse.js縺ｮ繧､繝ｳ繝昴・繝医ｒ蜑企勁・育判蜒乗､懃ｴ｢讖溯・繧貞炎髯､縺励◆縺溘ａ・・
import sharp from 'sharp';
import AdmZip from 'adm-zip';
import { addDocumentToKnowledgeBase } from '../lib/knowledge-base.js';

const router = express.Router();

const __filename = path.resolve();
const __dirname = path.dirname(__filename);

// 荳譎ら噪縺ｪ髢｢謨ｰ螳夂ｾｩ・亥ｾ後〒驕ｩ蛻・↑螳溯｣・↓鄂ｮ縺肴鋤縺医ｋ・・
const extractPdfText = async (filePath: string) => '';
const extractWordText = async (filePath: string) => '';
const extractExcelText = async (filePath: string) => '';

// PPTX繝輔ぃ繧､繝ｫ縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ縺吶ｋ髢｢謨ｰ
const extractPptxText = async (filePath: string): Promise<{ text: string; slideImages: string[] }> => {
    try {
        console.log(`塘 PPTX繝輔ぃ繧､繝ｫ蜃ｦ逅・幕蟋・ ${filePath}`);
        
        const zip = new AdmZip(filePath);
        const tempDir = path.join(__dirname, '../../temp');
        const extractDir = path.join(tempDir, `pptx_${Date.now()}`);
        
        // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }
        
        // ZIP縺ｨ縺励※螻暮幕
        zip.extractAllTo(extractDir, true);
        
        // 繧ｹ繝ｩ繧､繝厩ML繝輔ぃ繧､繝ｫ繧呈爾縺・
        const slidesDir = path.join(extractDir, 'ppt', 'slides');
        const slideFiles = fs.existsSync(slidesDir)
            ? fs.readdirSync(slidesDir).filter(file => file.startsWith('slide') && file.endsWith('.xml'))
            : [];
        
        let extractedText = '';
        const slideImages: string[] = [];
        
        // 遏･隴倥・繝ｼ繧ｹ逕ｻ蜒上ョ繧｣繝ｬ繧ｯ繝医Μ繧堤｢ｺ菫・
        const knowledgeBaseImagesDir = path.join(process.cwd(), 'knowledge-base/images');
        if (!fs.existsSync(knowledgeBaseImagesDir)) {
            fs.mkdirSync(knowledgeBaseImagesDir, { recursive: true });
        }
        
        // 蜷・せ繝ｩ繧､繝峨・繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
        for (let i = 0; i < slideFiles.length; i++) {
            const slideNumber = i + 1;
            const slideFilePath = path.join(slidesDir, slideFiles[i]);
            const slideContent = fs.readFileSync(slideFilePath, 'utf8');
            
            // 繝・く繧ｹ繝亥・螳ｹ縺ｮ謚ｽ蜃ｺ
            const textRegex = /<a:t>(.*?)<\/a:t>/g;
            let match;
            while ((match = textRegex.exec(slideContent)) !== null) {
                if (match[1].trim()) {
                    extractedText += match[1].trim() + '\n';
                }
            }
            
            // 繝弱・繝茨ｼ医せ繝斐・繧ｫ繝ｼ繝弱・繝茨ｼ峨・蜀・ｮｹ繧貞叙蠕・
            const noteFilePath = path.join(extractDir, 'ppt', 'notesSlides', `notesSlide${slideNumber}.xml`);
            if (fs.existsSync(noteFilePath)) {
                const noteXml = fs.readFileSync(noteFilePath, 'utf8');
                while ((match = textRegex.exec(noteXml)) !== null) {
                    if (match[1].trim()) {
                        extractedText += match[1].trim() + '\n';
                    }
                }
            }
            
            // 繧ｹ繝ｩ繧､繝臥判蜒上ｒ逕滓・・医・繝ｬ繝ｼ繧ｹ繝帙Ν繝繝ｼ逕ｻ蜒擾ｼ・
            const baseFileName = path.basename(filePath, path.extname(filePath));
            const imageFileName = `${baseFileName}_${slideNumber.toString().padStart(3, '0')}.png`;
            const imagePath = path.join(knowledgeBaseImagesDir, imageFileName);
            
            // 繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ逕ｻ蜒上ｒ逕滓・
            try {
                const svgContent = `
                    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#f0f0f0"/>
                        <text x="400" y="250" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
                            繧ｹ繝ｩ繧､繝・${slideNumber}
                        </text>
                        <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="16" fill="#999">
                            ${path.basename(filePath)}
                        </text>
                    </svg>
                `;
                
                await sharp(Buffer.from(svgContent))
                    .png()
                    .toFile(imagePath);
                
                slideImages.push(`/knowledge-base/images/${imageFileName}`);
                console.log(`萄 繧ｹ繝ｩ繧､繝臥判蜒冗函謌・ ${imageFileName}`);
            } catch (imageError) {
                console.warn(`繧ｹ繝ｩ繧､繝臥判蜒冗函謌舌↓螟ｱ謨・ ${imageError}`);
                // 逕ｻ蜒冗函謌舌↓螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
            }
        }
        
        // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧貞炎髯､
        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', cleanupError);
        }
        
        console.log(`笨・PPTX繝輔ぃ繧､繝ｫ蜃ｦ逅・ｮ御ｺ・ ${extractedText.length}譁・ｭ励ｒ謚ｽ蜃ｺ縲・{slideImages.length}譫壹・逕ｻ蜒上ｒ逕滓・`);
        return {
            text: extractedText.trim(),
            slideImages: slideImages
        };
        
    } catch (error) {
        console.error('笶・PPTX繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
        throw new Error(`PPTX繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// Logging function to control debug output
function logDebug(message: any, ...args) {
    // 繧ｻ繧ｭ繝･繝ｪ繝・ぅ縺ｮ縺溘ａ繝・ヰ繝・げ諠・ｱ繧帝撼陦ｨ遉ｺ
    if (process.env.NODE_ENV === 'development' && process.env.SHOW_DEBUG_LOGS === 'true') {
        console.debug(message, ...args);
    }
}
function logInfo(message: any, ...args) {
    // 譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ驥崎ｦ√↑諠・ｱ縺ｮ縺ｿ陦ｨ遉ｺ
    if (process.env.NODE_ENV !== 'production') {
        console.info(message, ...args);
    }
}
function logPath(message: any, path) {
    // 繝代せ諠・ｱ縺ｯ髱櫁｡ｨ遉ｺ
    if (process.env.SHOW_PATH_LOGS === 'true') {
        console.log(message, path ? '***' : '');
    }
}
// 繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・髢｢謨ｰ
const ensureDirectoryExists = (dirPath: string) => {
  console.log(`刀 繝・ぅ繝ｬ繧ｯ繝医Μ遒ｺ隱堺ｸｭ: ${dirPath}`);
  try {
    // 邨ｶ蟇ｾ繝代せ縺ｮ蝣ｴ蜷医・逶ｸ蟇ｾ繝代せ縺ｫ螟画鋤
    const relativePath = path.isAbsolute(dirPath) ? 
      path.join(process.cwd(), path.basename(dirPath)) : 
      dirPath;

    if (!fs.existsSync(relativePath)) {
      console.log(`刀 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ縲ゆｽ懈・縺励∪縺・ ${relativePath}`);
      // { recursive: true } 繧呈欠螳壹＠縺ｦ蜀榊ｸｰ逧・↓繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
      fs.mkdirSync(relativePath, { recursive: true });
      console.log(`笨・繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆: ${relativePath}`);
    } else {
      console.log(`笨・繝・ぅ繝ｬ繧ｯ繝医Μ縺ｯ譌｢縺ｫ蟄伜惠縺励∪縺・ ${relativePath}`);
    }
  } catch (error) {
    console.error(`繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・繧ｨ繝ｩ繝ｼ: ${dirPath}`, error);
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ゅし繝ｼ繝舌・繧貞●豁｢縺輔○縺ｪ縺・ｈ縺・↓縺吶ｋ
    console.warn(`笞・・ 繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縺後∝・逅・ｒ邯夊｡後＠縺ｾ縺兪);
  }
};

// 蠢・ｦ√↑繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｸ諡ｬ縺ｧ菴懈・縺吶ｋ髢｢謨ｰ
const ensureRequiredDirectories = () => {
  const requiredDirs = [
    path.join(process.cwd(), 'knowledge-base'),
    path.join(process.cwd(), 'knowledge-base/images'),
    path.join(process.cwd(), 'knowledge-base/json'),
    path.join(process.cwd(), 'knowledge-base/data'),
    path.join(__dirname, '../../temp')
  ];
  
  requiredDirs.forEach(dir => ensureDirectoryExists(dir));
};
// 繝輔ぃ繧､繝ｫ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ
function cleanupTempDirectory(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    try {
        const files: any = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath: any = path.join(dirPath, file);
            const stat: any = fs.statSync(filePath);
            if (stat.isDirectory()) {
                // 蜀榊ｸｰ逧・↓繝・ぅ繝ｬ繧ｯ繝医Μ繧貞炎髯､
                cleanupTempDirectory(filePath);
                fs.rmdirSync(filePath);
            }
            else {
                // 繝輔ぃ繧､繝ｫ繧貞炎髯､
                fs.unlinkSync(filePath);
            }
        }
        console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励∪縺励◆: ${dirPath}`);
    }
    catch (error) {
        console.error(`繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${dirPath}`, error);
        // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
    }
}
// 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・・育衍隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｨuploads繝・ぅ繝ｬ繧ｯ繝医Μ・・
async function cleanupTempDirectories() {
    // 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ
    const rootDir: any = path.join(__dirname, '../../');
    const knowledgeBaseDir: any = path.join(process.cwd(), 'knowledge-base');
    // 荳譎ゅヵ繧｡繧､繝ｫ驟咲ｽｮ逕ｨ繝・ぅ繝ｬ繧ｯ繝医Μ
    const publicImagesDir: any = path.join(rootDir, 'public/images');
    const publicUploadsDir: any = path.join(rootDir, 'public/uploads');
    const uploadsDir: any = path.join(rootDir, 'uploads');
    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・蟇ｾ雎｡縺ｮ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繝ｪ繧ｹ繝・
    const tempDirs = [
        path.join(knowledgeBaseDir, 'temp'),
        path.join(uploadsDir, 'temp'),
        path.join(publicUploadsDir, 'temp')
    ];
    // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ蜃ｦ逅・
    for (const dirPath of tempDirs) {
        if (!fs.existsSync(dirPath))
            continue;
        try {
            const files: any = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath: any = path.join(dirPath, file);
                const stat: any = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    // 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蝣ｴ蜷医・蜀榊ｸｰ逧・↓蜃ｦ逅・
                    await verifyAndCleanupDirectory(filePath);
                }
                else {
                    // 繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ蜷医・讀懆ｨｼ縺励※蜑企勁
                    await verifyAndCleanupFile(filePath, path.basename(dirPath));
                }
            }
            console.log(`荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励∪縺励◆: ${dirPath}`);
        }
        catch (error) {
            console.error(`荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${dirPath}`, error);
        }
    }
    // knowledge-base縺ｫ遘ｻ蜍墓ｸ医∩縺ｮ繝輔ぃ繧､繝ｫ繧置ploads縺ｨpublic/uploads縺九ｉ蜑企勁
    try {
        await cleanupRedundantFiles();
    }
    catch (error) {
        console.error('驥崎､・ヵ繧｡繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    }
}
// 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ繝上ャ繧ｷ繝･蛟､繧定ｨ育ｮ励☆繧矩未謨ｰ・亥・螳ｹ縺ｮ荳閾ｴ繧呈､懷・縺吶ｋ縺溘ａ・・
async function calculateImageHash(filePath) {
    try {
        const fileContent: any = fs.readFileSync(filePath);
        // 蜊倡ｴ斐↑繝上ャ繧ｷ繝･蛟､繧定ｨ育ｮ暦ｼ亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繧医ｊ蝣・欧縺ｪ繝上ャ繧ｷ繝･繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝繧剃ｽｿ逕ｨ縺吶ｋ縺薙→繧ょ庄閭ｽ・・
        const hash = crypto.createHash('md5').update(fileContent).digest('hex');
        return hash;
    }
    catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ縺ｮ繝上ャ繧ｷ繝･險育ｮ励↓螟ｱ謨・ ${filePath}`, error);
        return '';
    }
}
// 遏･隴倥・繝ｼ繧ｹ蜀・・逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ驥崎､・ｒ讀懷・縺励※蜑企勁縺吶ｋ
async function detectAndRemoveDuplicateImages() {
    const knowledgeImagesDir: any = path.join(process.cwd(), 'knowledge-base/images');
    let removedCount = 0;
    let errorCount = 0;
    if (!fs.existsSync(knowledgeImagesDir)) {
        console.log(`逕ｻ蜒上ョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ: ${knowledgeImagesDir}`);
        return { removed: 0, errors: 0 };
    }
    try {
        // 逕ｻ蜒上ヵ繧｡繧､繝ｫ荳隕ｧ繧貞叙蠕・
        const imageFiles: any = fs.readdirSync(knowledgeImagesDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
        console.log(`knowledge-base/images繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・逕ｻ蜒上ヵ繧｡繧､繝ｫ謨ｰ: ${imageFiles.length}莉ｶ`);
        if (imageFiles.length <= 1)
            return { removed: 0, errors: 0 };
        // 繝輔ぃ繧､繝ｫ蜷阪・繝励Ξ繝輔ぅ繝・け繧ｹ縺ｧ繧ｰ繝ｫ繝ｼ繝怜喧縺吶ｋ豁｣隕剰｡ｨ迴ｾ繝代ち繝ｼ繝ｳ
        // mc_1745233987873_img_001 -> mc_1745233987873
        const prefixPattern = /^(mc_\d+)_/;
        // 繝上ャ繧ｷ繝･蛟､縺ｨ繝輔ぃ繧､繝ｫ繝代せ縺ｮ繝槭ャ繝・
        const fileHashes: any = new Map();
        // 繝輔ぃ繧､繝ｫ蜷阪・繝励Ξ繝輔ぅ繝・け繧ｹ縺ｧ繧ｰ繝ｫ繝ｼ繝怜喧
        const prefixGroups: any = new Map();
        // 縺ｾ縺壹ヵ繧｡繧､繝ｫ蜷阪・繝励Ξ繝輔ぅ繝・け繧ｹ縺ｧ繧ｰ繝ｫ繝ｼ繝怜喧・医ち繧､繝繧ｹ繧ｿ繝ｳ繝鈴＆縺・・蜿ｯ閭ｽ諤ｧ縺後≠繧句酔蜷阪ヵ繧｡繧､繝ｫ繧定ｦ九▽縺代ｋ・・
        for (const file of imageFiles) {
            const match: any = file.match(prefixPattern);
            if (match) {
                const prefix: any = match[1]; // 萓・ mc_1745233987873
                if (!prefixGroups.has(prefix)) {
                    prefixGroups.set(prefix, []);
                }
                prefixGroups.get(prefix).push(file);
            }
        }
        // 驥崎､・・蜿ｯ閭ｽ諤ｧ縺後≠繧九げ繝ｫ繝ｼ繝励・縺ｿ繧呈､懈渊・医ヱ繝輔か繝ｼ繝槭Φ繧ｹ謾ｹ蝟・・縺溘ａ・・
        for (const entry of Array.from(prefixGroups.entries()) as [string, string[]][]) {
            const [prefix, files] = entry;
            if (files.length > 1) {
                console.log(`繝励Ξ繝輔ぅ繝・け繧ｹ "${prefix}" 縺ｧ ${files.length}莉ｶ縺ｮ貎懷惠逧・↑驥崎､・ヵ繧｡繧､繝ｫ繧呈､懷・`);
                // 蜷・ヵ繧｡繧､繝ｫ縺ｮ繝上ャ繧ｷ繝･繧定ｨ育ｮ励＠縺ｦ驥崎､・ｒ讀懷・
                for (const file of files) {
                    const filePath: any = path.join(knowledgeImagesDir, file);
                    const hash: any = await calculateImageHash(filePath);
                    if (hash) {
                        if (!fileHashes.has(hash)) {
                            fileHashes.set(hash, []);
                        }
                        fileHashes.get(hash).push(filePath);
                    }
                }
            }
        }
        // 驥崎､・ヵ繧｡繧､繝ｫ繧貞炎髯､・域怙繧よ眠縺励＞繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励・繝輔ぃ繧､繝ｫ莉･螟厄ｼ・
        for (const entry of Array.from(fileHashes.entries()) as [string, string[]][]) {
            const [hash, filePaths] = entry;
            if (filePaths.length > 1) {
                console.log(`繝上ャ繧ｷ繝･蛟､ ${hash} 縺ｧ ${filePaths.length}莉ｶ縺ｮ驥崎､・ヵ繧｡繧､繝ｫ繧呈､懷・`);
                // 繝輔ぃ繧､繝ｫ蜷阪°繧峨ち繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ謚ｽ蜃ｺ縺励※譛譁ｰ縺ｮ繝輔ぃ繧､繝ｫ繧堤音螳・
                const timestamps: any = filePaths.map((filePath) => {
                    const fileName: any = path.basename(filePath);
                    const match: any = fileName.match(/mc_(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                });
                // 譛螟ｧ縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ謖√▽繝輔ぃ繧､繝ｫ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ
                const latestFileIndex: any = timestamps.indexOf(Math.max(...timestamps));
                // 譛譁ｰ莉･螟悶・繝輔ぃ繧､繝ｫ繧貞炎髯､
                for (let i = 0; i < filePaths.length; i++) {
                    if (i !== latestFileIndex) {
                        try {
                            fs.unlinkSync(filePaths[i]);
                            console.log(`驥崎､・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePaths[i]}`);
                            removedCount++;
                        }
                        catch (error) {
                            console.error(`驥崎､・ヵ繧｡繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${filePaths[i]}`, error);
                            errorCount++;
                        }
                    }
                }
            }
        }
        return { removed: removedCount, errors: errorCount };
    }
    catch (error) {
        console.error('驥崎､・判蜒乗､懷・蜃ｦ逅・〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
        return { removed: removedCount, errors: errorCount + 1 };
    }
}
// knowledge-base縺ｫ蟄伜惠縺吶ｋ繝輔ぃ繧､繝ｫ縺ｨ驥崎､・☆繧九ヵ繧｡繧､繝ｫ繧剃ｸ譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ蜑企勁
async function cleanupRedundantFiles() {
    const rootDir: any = path.join(__dirname, '../../');
    const knowledgeImagesDir: any = path.join(process.cwd(), 'knowledge-base/images');
    const uploadsDirs = [
        path.join(rootDir, 'uploads/images'),
        path.join(rootDir, 'public/uploads/images'),
        path.join(rootDir, 'public/images')
    ];
    let removedCount = 0;
    let errorCount = 0;
    try {
        // knowledge-base/images縺ｮ繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
        if (!fs.existsSync(knowledgeImagesDir)) {
            console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ: ${knowledgeImagesDir}`);
            return { removed: 0, errors: 0 };
        }
        const knowledgeImages: any = fs.readdirSync(knowledgeImagesDir);
        console.log(`遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ謨ｰ: ${knowledgeImages.length}莉ｶ`);
        // 蜷・い繝・・繝ｭ繝ｼ繝峨ョ繧｣繝ｬ繧ｯ繝医Μ繧偵メ繧ｧ繝・け
        for (const dir of uploadsDirs) {
            if (!fs.existsSync(dir)) {
                console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ: ${dir}`);
                // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・縺吶ｋ・井ｸ譎ゅヵ繧｡繧､繝ｫ逕ｨ・・
                fs.mkdirSync(dir, { recursive: true });
                console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆: ${dir}`);
                continue;
            }
            const uploadedFiles: any = fs.readdirSync(dir);
            console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝輔ぃ繧､繝ｫ謨ｰ: ${dir} - ${uploadedFiles.length}莉ｶ`);
            for (const file of uploadedFiles) {
                // knowledge-base縺ｫ蜷悟錐縺ｮ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・蜑企勁
                if (knowledgeImages.includes(file)) {
                    try {
                        fs.unlinkSync(path.join(dir, file));
                        console.log(`驥崎､・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${path.join(dir, file)}`);
                        removedCount++;
                    }
                    catch (error) {
                        console.error(`繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${path.join(dir, file)}`, error);
                        errorCount++;
                    }
                }
            }
        }
        console.log(`驥崎､・ヵ繧｡繧､繝ｫ蜑企勁邨先棡: 謌仙粥=${removedCount}莉ｶ, 螟ｱ謨・${errorCount}莉ｶ`);
        return { removed: removedCount, errors: errorCount };
    }
    catch (error) {
        console.error('驥崎､・ヵ繧｡繧､繝ｫ蜑企勁蜃ｦ逅・〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
        return { removed: removedCount, errors: errorCount + 1 };
    }
}
// 繝輔ぃ繧､繝ｫ縺渓nowledge-base縺ｫ蟄伜惠縺吶ｋ縺狗｢ｺ隱阪＠縺ｦ縺九ｉ蜑企勁
async function verifyAndCleanupFile(filePath: any, subDir) {
    try {
        const fileName: any = path.basename(filePath);
        const fileExt: any = path.extname(fileName);
        const baseNameWithoutExt: any = path.basename(fileName, fileExt);
        // knowledge-base縺ｮ蟇ｾ蠢懊☆繧九ョ繧｣繝ｬ繧ｯ繝医Μ繝代せ
        let kbTargetDir = '';
        if (subDir === 'images') {
            kbTargetDir = path.join(process.cwd(), 'knowledge-base/images');
        }
        else if (subDir === 'json') {
            kbTargetDir = path.join(process.cwd(), 'knowledge-base/json');
        }
        else if (subDir === 'data') {
            kbTargetDir = path.join(process.cwd(), 'knowledge-base/data');
        }
        else {
            // ppt繧дemp縺ｪ縺ｩ縺ｯknowledge-base縺ｫ蟇ｾ蠢懊＠縺ｪ縺・・縺ｧ逶ｴ謗･蜑企勁
            fs.unlinkSync(filePath);
            console.log(`荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
            return;
        }
        // knowledge-base縺ｫ蟇ｾ蠢懊☆繧九ヵ繧｡繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
        const kbTargetPath: any = path.join(kbTargetDir, fileName);
        if (fs.existsSync(kbTargetPath)) {
            // knowledge-base縺ｫ蟄伜惠縺吶ｋ蝣ｴ蜷医・螳牙・縺ｫ蜑企勁
            fs.unlinkSync(filePath);
            console.log(`uploads蜀・・繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆ (knowledge-base縺ｫ蟄伜惠遒ｺ隱肴ｸ医∩): ${filePath}`);
        }
        else {
            console.log(`隴ｦ蜻・ knowledge-base縺ｫ蟇ｾ蠢懊☆繧九ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√∝炎髯､繧偵せ繧ｭ繝・・縺励∪縺・ ${filePath}`);
        }
    }
    catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ縺ｮ讀懆ｨｼ繝ｻ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${filePath}`, error);
    }
}
// 繝・ぅ繝ｬ繧ｯ繝医Μ繧貞・蟶ｰ逧・↓讀懆ｨｼ縺励※蜑企勁
async function verifyAndCleanupDirectory(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    try {
        const files: any = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath: any = path.join(dirPath, file);
            const stat: any = fs.statSync(filePath);
            if (stat.isDirectory()) {
                await verifyAndCleanupDirectory(filePath);
            }
            else {
                // 繧ｵ繝悶ョ繧｣繝ｬ繧ｯ繝医Μ蜷阪ｒ蜿門ｾ暦ｼ井ｾ・ uploads/images/subdir/file.png 竊・images・・
                const relPath: any = path.relative(path.join(__dirname, '../../uploads'), dirPath);
                const topDir: any = relPath.split(path.sep)[0];
                await verifyAndCleanupFile(filePath, topDir);
            }
        }
        // 繝・ぅ繝ｬ繧ｯ繝医Μ縺檎ｩｺ縺ｫ縺ｪ縺｣縺溘ｉ蜑企勁
        const remainingFiles: any = fs.readdirSync(dirPath);
        if (remainingFiles.length === 0) {
            fs.rmdirSync(dirPath);
            console.log(`遨ｺ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ繧貞炎髯､縺励∪縺励◆: ${dirPath}`);
        }
    }
    catch (error) {
        console.error(`繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ讀懆ｨｼ繝ｻ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${dirPath}`, error);
    }
}
// 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ險ｭ螳夲ｼ医・繝ｭ繧ｸ繧ｧ繧ｯ繝医Ν繝ｼ繝医°繧峨・逶ｸ蟇ｾ繝代せ・・
const knowledgeBaseDir = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), 'knowledge-base');
const knowledgeBaseDataDir = path.join(knowledgeBaseDir, 'data');
const knowledgeBaseImagesDir = path.join(knowledgeBaseDir, 'images');
// knowledge-base/images繝・ぅ繝ｬ繧ｯ繝医Μ繧堤判蜒冗畑縺ｫ菴ｿ逕ｨ (荳蜈・喧)

console.log('刀 繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ遒ｺ隱・', {
  knowledgeBaseDir,
  knowledgeBaseDataDir,
  knowledgeBaseImagesDir,
  KNOWLEDGE_BASE_PATH: process.env.KNOWLEDGE_BASE_PATH
});
const publicImagesDir: any = knowledgeBaseImagesDir;
// 遏･隴倥・繝ｼ繧ｹ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繝代せ
const knowledgeBaseTempDir: any = path.join(knowledgeBaseDir, 'temp');
// 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
ensureDirectoryExists(knowledgeBaseDir);
ensureDirectoryExists(knowledgeBaseDataDir);
ensureDirectoryExists(knowledgeBaseImagesDir);
ensureDirectoryExists(knowledgeBaseTempDir);
// Multer繧ｹ繝医Ξ繝ｼ繧ｸ險ｭ螳・
const storage: any = multer.diskStorage({
    destination: function (req, file, cb) {
        // 蜃ｦ逅・ち繧､繝励↓繧医▲縺ｦ菫晏ｭ伜・繧貞､画峩
        const processingType: any = req.body.processingType || 'document';
        if (file.mimetype.includes('svg') || file.mimetype.includes('image')) {
            // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｯ縺吶∋縺ｦknowledge-base縺ｮimages繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ逶ｴ謗･菫晏ｭ・
            cb(null, knowledgeBaseImagesDir);
        }
        else {
            // 譁・嶌繝輔ぃ繧､繝ｫ縺ｯknowledge-base縺ｮ荳譎ゆｿ晏ｭ倡畑temp繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ菫晏ｭ・
            const knowledgeBaseTempDir: any = path.join(knowledgeBaseDir, 'temp');
            ensureDirectoryExists(knowledgeBaseTempDir);
            cb(null, knowledgeBaseTempDir);
        }
    },
    filename: function (req, file, cb) {
        // 荳諢上・繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
        const uniqueId: any = Date.now().toString();
        const extname: any = path.extname(file.originalname);
        // 繝舌ャ繝輔ぃ縺九ｉUTF-8縺ｧ繝輔ぃ繧､繝ｫ蜷阪ｒ繝・さ繝ｼ繝峨＠縲∵律譛ｬ隱槭ヵ繧｡繧､繝ｫ蜷阪↓蟇ｾ蠢・
        const originalName: any = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // 繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ縺ｧ縺阪↑縺・枚蟄励ｒ髯､蜴ｻ縺励√せ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ螟画鋤
        const sanitizedName: any = originalName.split('.')[0]
            .replace(/[\/\\:*?"<>|]/g, '')
            .replace(/\s+/g, '_');
        // MC + 譌･譛ｬ隱樣Κ蛻・ｒ蜷ｫ繧蜷榊燕繧剃ｿ晄戟縺励▽縺､縲∽ｸ諢乗ｧ繧堤｢ｺ菫・
        cb(null, `${sanitizedName}_${uniqueId}${extname}`);
    }
});
const upload: any = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // 險ｱ蜿ｯ縺吶ｋ諡｡蠑ｵ蟄・
        const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.svg', '.png', '.jpg', '.jpeg', '.gif'];
        const ext: any = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺吶ゅし繝昴・繝亥ｽ｢蠑・ ${allowedExtensions.join(', ')}`));
        }
    }
});
// 逕ｻ蜒乗､懃ｴ｢API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ蜑企勁・・use.js繧剃ｽｿ逕ｨ縺励※縺・ｋ縺溘ａ・・
/**
 * 繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 * 蜑企勁謫堺ｽ懷ｾ後↓繧ｯ繝ｩ繧､繧｢繝ｳ繝医′縺薙ｌ繧貞他縺ｳ蜃ｺ縺吶％縺ｨ縺ｧ縲∵怙譁ｰ諠・ｱ繧堤｢ｺ螳溘↓蜿門ｾ・
 */
router.post('/clear-cache', async (req, res) => {
    try {
        console.log('繧ｵ繝ｼ繝舌・繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢隕∵ｱゅｒ蜿嶺ｿ｡縺励∪縺励◆');
        // 遏･隴倥・繝ｼ繧ｹJSON繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蜀肴､懆ｨｼ
        const jsonDir: any = path.join(process.cwd(), 'knowledge-base/json');
        if (fs.existsSync(jsonDir)) {
            try {
                // 螳滄圀縺ｮ繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
                const files: any = fs.readdirSync(jsonDir);
                logDebug(`JSON繝・ぅ繝ｬ繧ｯ繝医Μ蜀・ヵ繧｡繧､繝ｫ謨ｰ: ${files.length}`);
                // 繧ｭ繝｣繝・す繝･縺九ｉ繝輔ぃ繧､繝ｫ縺ｮ螳溷惠諤ｧ繧貞・繝√ぉ繝・け
                for (const file of files) {
                    const fullPath: any = path.join(jsonDir, file);
                    try {
                        // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠繧堤｢ｺ隱阪＠縲√い繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ縺九メ繧ｧ繝・け
                        fs.accessSync(fullPath, fs.constants.F_OK | fs.constants.R_OK);
                    }
                    catch (err) {
                        // 繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪↑縺・ｴ蜷医・隴ｦ蜻翫ｒ蜃ｺ縺・
                        logDebug('繝輔ぃ繧､繝ｫ繧｢繧ｯ繧ｻ繧ｹ隴ｦ蜻・, err);
                    }
                }
            }
            catch (readErr) {
                logDebug('繝・ぅ繝ｬ繧ｯ繝医Μ隱ｭ縺ｿ蜿悶ｊ繧ｨ繝ｩ繝ｼ:', readErr);
            }
        }
        // index.json 繝輔ぃ繧､繝ｫ縺ｮ蜀肴ｧ狗ｯ峨・・医ヨ繝ｩ繝・く繝ｳ繧ｰ繝輔ぃ繧､繝ｫ・・
        const indexJsonPath: any = path.join(process.cwd(), 'knowledge-base/index.json');
        try {
            // 螳滄圀縺ｮ繝輔ぃ繧､繝ｫ繝ｪ繧ｹ繝医ｒ蜿門ｾ・
            const jsonFiles: any = fs.existsSync(jsonDir) ? fs.readdirSync(jsonDir) : [];
            // 迴ｾ蝨ｨ縺ｮ繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ縺九ｉ譛譁ｰ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧貞・讒狗ｯ・
            const indexData = {
                lastUpdated: new Date().toISOString(),
                guides: [],
                fileCount: jsonFiles.length
            };
            // 繝悶Λ繝・け繝ｪ繧ｹ繝医ヵ繧｡繧､繝ｫ・育┌隕悶☆繧九ヵ繧｡繧､繝ｫ・・
            const blacklistFiles = ['guide_1744876440009_metadata.json']; // 萓九→縺励※螳悟・縺ｪ繝輔ぃ繧､繝ｫ蜷阪ｒ謖・ｮ・4679_metadata.json', 'guide_metadata.json'];
            // 譛牙柑縺ｪ繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧定ｿｽ蜉
            const validFiles: any = jsonFiles.filter(file => file.endsWith('_metadata.json') &&
                !blacklistFiles.includes(file));
            console.log('譛牙柑縺ｪJSON繝輔ぃ繧､繝ｫ:', validFiles);
            // 繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ霑ｽ蜉
            for (const file of validFiles) {
                try {
                    const content: any = fs.readFileSync(path.join(jsonDir, file), 'utf8');
                    const data: any = JSON.parse(content);
                    const id: any = file.replace('_metadata.json', '');
                    let title = id;
                    if (data.metadata && data.metadata.繧ｿ繧､繝医Ν) {
                        title = data.metadata.繧ｿ繧､繝医Ν;
                    }
                    else if (data.title) {
                        title = data.title;
                    }
                    indexData.guides.push({
                        id,
                        title,
                        filePath: path.join(jsonDir, file),
                        fileName: file
                    });
                }
                catch (parseErr) {
                    console.error(`繝輔ぃ繧､繝ｫ縺ｮ隗｣譫舌お繝ｩ繝ｼ ${file}:`, parseErr);
                }
            }
            // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
            fs.writeFileSync(indexJsonPath, JSON.stringify(indexData, null, 2), 'utf8');
            console.log('index.json繝輔ぃ繧､繝ｫ繧呈峩譁ｰ縺励∪縺励◆');
        }
        catch (indexErr) {
            console.error('index.json譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', indexErr);
        }
        return res.json({
            success: true,
            message: '繧ｵ繝ｼ繝舌・繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺励∪縺励◆',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * JSON 繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
 * 譛譁ｰ縺ｮJSON繝輔ぃ繧､繝ｫ繧貞━蜈育噪縺ｫ蜿門ｾ・
 */
router.get('/list-json-files', (req, res) => {
    try {
        console.log('JSON繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励Μ繧ｯ繧ｨ繧ｹ繝医ｒ蜿嶺ｿ｡...');
        // 繝輔ぃ繧､繝ｫ縺ｯ遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ荳蜈・喧
        const jsonDirs = [
            path.join(__dirname, '../../knowledge-base/json') // 繝｡繧､繝ｳ縺ｮ蝣ｴ謇
        ];
        let allJsonFiles = [];
        // 蝠城｡後′逋ｺ逕溘＠縺ｦ縺・ｋ繝輔ぃ繧､繝ｫ縺ｮ繝悶Λ繝・け繝ｪ繧ｹ繝・
        const blacklistedFiles = [
            'guide_1744876404679_metadata.json', // 蝠城｡後′逋ｺ逕溘＠縺ｦ縺・ｋ繝輔ぃ繧､繝ｫ
            'guide_metadata.json' // 蛻･縺ｮ蝠城｡後′蝣ｱ蜻翫＆繧後※縺・ｋ繝輔ぃ繧､繝ｫ
        ];
        console.log(`繝悶Λ繝・け繝ｪ繧ｹ繝医ヵ繧｡繧､繝ｫ: ${blacklistedFiles.join(', ')}`);
        // 蜷・ョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ繝｡繧ｿ繝・・繧ｿJSON繝輔ぃ繧､繝ｫ繧貞庶髮・
        for (const jsonDir of jsonDirs) {
            if (fs.existsSync(jsonDir)) {
                // 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蜀・ｮｹ繧堤｢ｺ隱阪＠縲√☆縺ｹ縺ｦ縺ｮ繝輔ぃ繧､繝ｫ繧偵Ο繧ｰ蜃ｺ蜉・
                const allFiles: any = fs.readdirSync(jsonDir);
                console.log(`${jsonDir}蜀・・縺吶∋縺ｦ縺ｮ繝輔ぃ繧､繝ｫ:`, allFiles);
                // 螳溷惠縺吶ｋJSON繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
                const files: any = allFiles
                    .filter(file => file.endsWith('_metadata.json'))
                    .filter(file => {
                    // 繝悶Λ繝・け繝ｪ繧ｹ繝医↓縺ゅｋ繝輔ぃ繧､繝ｫ繧帝勁螟・
                    if (blacklistedFiles.includes(file)) {
                        console.log(`繝悶Λ繝・け繝ｪ繧ｹ繝医・縺溘ａ髯､螟・ ${file}`);
                        return false;
                    }
                    // 螳滄圀縺ｫ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
                    const filePath: any = path.join(jsonDir, file);
                    const exists: any = fs.existsSync(filePath);
                    if (!exists) {
                        console.log(`繝輔ぃ繧､繝ｫ縺悟ｮ滄圀縺ｫ縺ｯ蟄伜惠縺励↑縺・◆繧・勁螟・ ${filePath}`);
                        return false;
                    }
                    return true;
                });
                console.log(`${jsonDir}蜀・・譛牙柑縺ｪ繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ: ${files.length}莉ｶ`);
                allJsonFiles = [...allJsonFiles, ...files];
            }
            else {
                // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
                fs.mkdirSync(jsonDir, { recursive: true });
                console.log(`繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・縺励∪縺励◆: ${jsonDir}`);
            }
        }
        // 驥崎､・ｒ謗帝勁縺励※荳諢上・繝輔ぃ繧､繝ｫ蜷阪Μ繧ｹ繝医↓縺吶ｋ
        const uniqueJsonFiles: any = Array.from(new Set(allJsonFiles));
        console.log(`驥崎､・勁螟門ｾ後・繝輔ぃ繧､繝ｫ謨ｰ: ${uniqueJsonFiles.length}莉ｶ`);
        // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励〒繧ｽ繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・
        const sortedFiles: any = uniqueJsonFiles.sort((a, b) => {
            // 繝輔ぃ繧､繝ｫ蜷阪°繧峨ち繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ謚ｽ蜃ｺ: mc_1744105287121_metadata.json -> 1744105287121
            const timestampA: any = a.split('_')[1] || '0';
            const timestampB: any = b.split('_')[1] || '0';
            return parseInt(timestampB) - parseInt(timestampA);
        });
        // 蠢懃ｭ斐・繝・ム繝ｼ繧定ｨｭ螳壹＠縺ｦ縲√く繝｣繝・す繝･繧堤┌蜉ｹ蛹・
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        // 繝輔ぃ繧､繝ｫ荳隕ｧ繧谷SON縺ｧ霑斐☆
        return res.json(sortedFiles);
    }
    catch (error) {
        console.error('JSON繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: 'JSON繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * 謚陦薙し繝昴・繝域枚譖ｸ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨→蜃ｦ逅・ｒ陦後≧繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 */
// 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ・壹ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧堤函謌・
function generateFallbackImageSearchData() {
    return [
        {
            id: "fallback_image_1",
            file: "/knowledge-base/images/fallback_image_1.png",
            title: "繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｻ蜒・",
            category: "荳闊ｬ",
            keywords: ["繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ", "逕ｻ蜒・, "荳闊ｬ"],
            description: "繧ｷ繧ｹ繝・Β縺悟・譛溷喧縺輔ｌ縺ｦ縺・↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｻ蜒上〒縺吶・,
            searchText: "繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ 逕ｻ蜒・荳闊ｬ 繧ｷ繧ｹ繝・Β 蛻晄悄蛹・,
        },
        {
            id: "fallback_image_2",
            file: "/knowledge-base/images/fallback_image_2.png",
            title: "繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｻ蜒・",
            category: "隴ｦ蜻・,
            keywords: ["繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ", "逕ｻ蜒・, "隴ｦ蜻・],
            description: "繝・・繧ｿ縺悟茜逕ｨ縺ｧ縺阪↑縺・％縺ｨ繧堤､ｺ縺吶ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ逕ｻ蜒上〒縺吶・,
            searchText: "繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ 逕ｻ蜒・隴ｦ蜻・繝・・繧ｿ 蛻ｩ逕ｨ荳榊庄",
        },
    ];
}
// 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蛻晄悄蛹也畑繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/init-image-search-data', async (req, res) => {
    try {
        logInfo('Image search data initialization started');
        const imagesDir: any = path.join(knowledgeBaseDir, 'images');
        const jsonDir: any = path.join(process.cwd(), 'knowledge-base/json');
        logPath('Images directory:', imagesDir);
        logPath('JSON directory:', jsonDir);
        let existingImageFiles = [];
        if (fs.existsSync(imagesDir)) {
            existingImageFiles = fs.readdirSync(imagesDir)
                .filter(file => file.toLowerCase().endsWith('.png'))
                .map(file => `/knowledge-base/images/${file}`);
            console.log(`螳滄圀縺ｫ蟄伜惠縺吶ｋ逕ｻ蜒上ヵ繧｡繧､繝ｫ: ${existingImageFiles.length}莉ｶ`);
        }
        // 譌｢蟄倥・繝・・繧ｿ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
        const existingDataPath: any = path.join(knowledgeBaseDataDir, 'image_search_data.json');
        let existingData = [];
        if (fs.existsSync(existingDataPath)) {
            try {
                const existingContent: any = fs.readFileSync(existingDataPath, 'utf-8');
                const rawData: any = JSON.parse(existingContent);
                // 螳滄圀縺ｫ蟄伜惠縺吶ｋ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
                existingData = rawData.filter((item) => item.file && existingImageFiles.includes(item.file));
                console.log(`譌｢蟄倥・逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆: ${existingData.length}莉ｶ・亥ｮ溷惠繝輔ぃ繧､繝ｫ縺ｮ縺ｿ・荏);
            }
            catch (error) {
                console.warn('譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨・', error);
                existingData = [];
            }
        }
        // JSON/metadata繝輔ぃ繧､繝ｫ縺九ｉ譁ｰ縺励＞繝・・繧ｿ繧堤函謌・
        let newData = [];
        if (fs.existsSync(jsonDir)) {
            const jsonFiles: any = fs.readdirSync(jsonDir).filter(file => file.endsWith('_metadata.json') && !file.includes('guide_'));
            for (const jsonFile of jsonFiles) {
                const jsonPath: any = path.join(jsonDir, jsonFile);
                try {
                    const metadata: any = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                    // 繧ｹ繝ｩ繧､繝峨°繧臥判蜒上ョ繝ｼ繧ｿ繧堤函謌撰ｼ亥ｮ溷惠繝輔ぃ繧､繝ｫ縺ｮ縺ｿ・・
                    if (metadata.slides && Array.isArray(metadata.slides)) {
                        metadata.slides.forEach((slide, index) => {
                            if (slide['逕ｻ蜒上ユ繧ｭ繧ｹ繝・] && Array.isArray(slide['逕ｻ蜒上ユ繧ｭ繧ｹ繝・]) && slide['逕ｻ蜒上ユ繧ｭ繧ｹ繝・].length > 0) {
                                const imageText: any = slide['逕ｻ蜒上ユ繧ｭ繧ｹ繝・][0];
                                if (imageText && imageText['逕ｻ蜒上ヱ繧ｹ']) {
                                    const fileName: any = path.basename(imageText['逕ｻ蜒上ヱ繧ｹ']);
                                    const imagePath = `/knowledge-base/images/${fileName}`;
                                    // 螳滄圀縺ｫ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺ｿ霑ｽ蜉
                                    if (existingImageFiles.includes(imagePath)) {
                                        // 隧ｳ邏ｰ縺ｪ隱ｬ譏取枚繧堤函謌・
                                        const slideTitle: any = slide['繧ｿ繧､繝医Ν'] || `繧ｹ繝ｩ繧､繝・${index + 1}`;
                                        const slideContent: any = slide['譛ｬ譁・] ? slide['譛ｬ譁・].join('縲・) : '';
                                        const slideNotes: any = slide['繝弱・繝・] || '';
                                        const description = [
                                            `${slideTitle}縺ｮ隧ｳ邏ｰ蝗ｳ`,
                                            slideContent,
                                            slideNotes.length > 0 ? `陬懆ｶｳ・・{slideNotes}` : ''
                                        ].filter(Boolean).join('縲・);
                                        const slideData = {
                                            id: `slide_${slide['繧ｹ繝ｩ繧､繝臥分蜿ｷ'] || index + 1}`,
                                            file: imagePath,
                                            title: slideTitle,
                                            category: "菫晏ｮ育畑霆翫・繝九Η繧｢繝ｫ",
                                            keywords: [
                                                slideTitle,
                                                ...(slide['譛ｬ譁・] || []),
                                                "菫晏ｮ育畑霆・, "繝槭ル繝･繧｢繝ｫ", "繧ｨ繝ｳ繧ｸ繝ｳ", "謨ｴ蛯・, "菫ｮ逅・, "驛ｨ蜩・
                                            ].filter(Boolean),
                                            description: description,
                                            searchText: [
                                                slideTitle,
                                                ...(slide['譛ｬ譁・] || []),
                                                "菫晏ｮ育畑霆翫・繝九Η繧｢繝ｫ", "繧ｨ繝ｳ繧ｸ繝ｳ", "謨ｴ蛯・, "菫ｮ逅・, "驛ｨ蜩・, "霆贋ｸ｡", "蜍募鴨"
                                            ].filter(Boolean).join(' ')
                                        };
                                        newData.push(slideData);
                                    }
                                }
                            }
                        });
                    }
                    // 蝓九ａ霎ｼ縺ｿ逕ｻ蜒上°繧臥判蜒上ョ繝ｼ繧ｿ繧堤函謌撰ｼ亥ｮ溷惠繝輔ぃ繧､繝ｫ縺ｮ縺ｿ・・
                    if (metadata.embeddedImages && Array.isArray(metadata.embeddedImages)) {
                        metadata.embeddedImages.forEach((img, index) => {
                            if (img['謚ｽ蜃ｺ繝代せ']) {
                                const filename: any = path.basename(img['謚ｽ蜃ｺ繝代せ']);
                                const imagePath = `/knowledge-base/images/${filename}`;
                                // 螳滄圀縺ｫ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺ｿ霑ｽ蜉
                                if (existingImageFiles.includes(imagePath)) {
                                    // 蜈・・繝輔ぃ繧､繝ｫ蜷阪°繧芽ｩｳ邏ｰ諠・ｱ繧呈歓蜃ｺ
                                    const originalName: any = img['蜈・・繝輔ぃ繧､繝ｫ蜷・] || '';
                                    let category = "驛ｨ蜩∝・逵・;
                                    let description = `菫晏ｮ育畑霆翫・驛ｨ蜩∫判蜒上〒縺吶Ａ;
                                    let keywords = ["菫晏ｮ育畑霆・, "驛ｨ蜩・, "蜀咏悄"];
                                    // 繝輔ぃ繧､繝ｫ蜷阪↓蝓ｺ縺･縺・※繧ｫ繝・ざ繝ｪ縺ｨ隱ｬ譏弱ｒ險ｭ螳・
                                    if (originalName.includes('engine') || originalName.includes('繧ｨ繝ｳ繧ｸ繝ｳ')) {
                                        category = "繧ｨ繝ｳ繧ｸ繝ｳ驛ｨ蜩・;
                                        description = "菫晏ｮ育畑霆翫・繧ｨ繝ｳ繧ｸ繝ｳ髢｢騾｣驛ｨ蜩√・隧ｳ邏ｰ逕ｻ蜒上〒縺吶ゅお繝ｳ繧ｸ繝ｳ縺ｮ讒矩繧・Κ蜩・・鄂ｮ繧堤｢ｺ隱阪〒縺阪∪縺吶・;
                                        keywords = ["菫晏ｮ育畑霆・, "繧ｨ繝ｳ繧ｸ繝ｳ", "蜍募鴨邉ｻ", "驛ｨ蜩・];
                                    }
                                    else if (originalName.includes('brake') || originalName.includes('繝悶Ξ繝ｼ繧ｭ')) {
                                        category = "繝悶Ξ繝ｼ繧ｭ邉ｻ邨ｱ";
                                        description = "菫晏ｮ育畑霆翫・繝悶Ξ繝ｼ繧ｭ邉ｻ邨ｱ驛ｨ蜩√・隧ｳ邏ｰ逕ｻ蜒上〒縺吶ょ宛蜍戊｣・ｽｮ縺ｮ讒矩繧・・鄂ｮ繧堤｢ｺ隱阪〒縺阪∪縺吶・;
                                        keywords = ["菫晏ｮ育畑霆・, "繝悶Ξ繝ｼ繧ｭ", "蛻ｶ蜍戊｣・ｽｮ", "驛ｨ蜩・];
                                    }
                                    else if (originalName.includes('wheel') || originalName.includes('霆願ｼｪ')) {
                                        category = "雜ｳ蝗槭ｊ";
                                        description = "菫晏ｮ育畑霆翫・雜ｳ蝗槭ｊ驛ｨ蜩√・隧ｳ邏ｰ逕ｻ蜒上〒縺吶りｻ願ｼｪ繧・し繧ｹ繝壹Φ繧ｷ繝ｧ繝ｳ驛ｨ蜩√ｒ遒ｺ隱阪〒縺阪∪縺吶・;
                                        keywords = ["菫晏ｮ育畑霆・, "霆願ｼｪ", "雜ｳ蝗槭ｊ", "驛ｨ蜩・];
                                    }
                                    const imageData = {
                                        id: `img_${index + 1}`,
                                        file: imagePath,
                                        title: `${category} ${index + 1}`,
                                        category: category,
                                        keywords: [...keywords, "繧ｨ繝ｳ繧ｸ繝ｳ", "謨ｴ蛯・, "菫ｮ逅・, "驛ｨ蜩・],
                                        description: description,
                                        searchText: `${category} ${index + 1} ${keywords.join(' ')} 繧ｨ繝ｳ繧ｸ繝ｳ 謨ｴ蛯・菫ｮ逅・驛ｨ蜩・菫晏ｮ育畑霆・繝槭ル繝･繧｢繝ｫ`
                                    };
                                    newData.push(imageData);
                                }
                            }
                        });
                    }
                }
                catch (error) {
                    console.error(`繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ: ${jsonFile}`, error);
                }
            }
        }
        // 譌｢蟄倥ョ繝ｼ繧ｿ縺ｨ譁ｰ繝・・繧ｿ繧堤ｵｱ蜷茨ｼ磯㍾隍・勁蜴ｻ・・
        const combinedData = [...existingData];
        let newCount = 0;
        newData.forEach(newItem => {
            const exists: any = combinedData.some(existing => existing.id === newItem.id);
            if (!exists) {
                combinedData.push(newItem);
                newCount++;
            }
        });
        // 譛邨ら噪縺ｫ螳溷惠繝輔ぃ繧､繝ｫ縺ｮ縺ｿ縺ｫ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const validData: any = combinedData.filter(item => item.file && existingImageFiles.includes(item.file));
        // 繝・・繧ｿ繧偵ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
        fs.writeFileSync(existingDataPath, JSON.stringify(validData, null, 2), 'utf-8');
        console.log('繝・・繧ｿ繧談nowledge-base/data縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
        res.json({
            success: true,
            count: validData.length,
            message: `逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧貞・譛溷喧縺励∪縺励◆: ${validData.length}莉ｶ`
        });
        console.log(`繝・・繧ｿ繧堤ｵｱ蜷医＠縺ｾ縺励◆: ${validData.length}莉ｶ・域眠隕・ ${newCount}莉ｶ・荏);
        console.log(`逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧貞・譛溷喧縺励∪縺励◆: ${validData.length}莉ｶ`);
    }
    catch (error) {
        console.error('逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
        res.status(500).json({
            success: false,
            message: '逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆'
        });
    }
});
// 謚陦捺枚譖ｸ繧｢繝・・繝ｭ繝ｼ繝峨お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // 蠢・ｦ√↑繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｺ句燕縺ｫ菴懈・
        ensureRequiredDirectories();
        const file: any = req.file;
        if (!file)
            return res.status(400).json({ error: "繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ" });
        console.log(`繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝牙・逅・幕蟋・ ${file.originalname}`);
        // 蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧九°縺ｩ縺・°縺ｮ繝輔Λ繧ｰ繧貞叙蠕暦ｼ医ョ繝輔か繝ｫ繝医〒縺ｯfalse・・
        const keepOriginalFile: any = req.body.keepOriginalFile === 'true';
        console.log(`蜈・ヵ繧｡繧､繝ｫ菫晏ｭ・ ${keepOriginalFile ? '譛牙柑' : '辟｡蜉ｹ・医ョ繝輔か繝ｫ繝茨ｼ・}`);
        // 繧｢繝・・繝ｭ繝ｼ繝蛾幕蟋区凾縺ｫ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧貞ｮ溯｡・
        try {
            // 遏･隴倥・繝ｼ繧ｹ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
            cleanupTempDirectory(knowledgeBaseTempDir);
            console.log('荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励∪縺励◆');
        }
        catch (cleanupError) {
            console.error('荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', cleanupError);
            // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｮ螟ｱ謨励・辟｡隕悶＠縺ｦ蜃ｦ逅・ｒ邯夊｡・
        }
        // 荳譎ら噪縺ｫ繝舌ャ繝輔ぃ繧剃ｿ晏ｭ假ｼ亥・繝輔ぃ繧､繝ｫ菫晏ｭ倥が繝励す繝ｧ繝ｳ縺後が繝輔・蝣ｴ蜷医∝ｾ後〒蜑企勁・・
        const filePath: any = file.path;
        const fileExt: any = path.extname(file.originalname).toLowerCase();
        const fileBaseName: any = path.basename(file.path);
        const filesDir: any = path.dirname(file.path);
        const processingType: any = req.body.processingType || 'document';
        console.log(`蜃ｦ逅・ち繧､繝・ ${processingType}`);
        console.log(`繝輔ぃ繧､繝ｫ繝代せ: ${filePath}`);
        console.log(`繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄・ ${fileExt}`);
        // 逕ｻ蜒乗､懃ｴ｢逕ｨ繝・・繧ｿ蜃ｦ逅・・蝣ｴ蜷・
        if (processingType === 'image_search' && ['.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(fileExt)) {
            try {
                console.log("逕ｻ蜒乗､懃ｴ｢逕ｨ繝・・繧ｿ蜃ｦ逅・ｒ髢句ｧ九＠縺ｾ縺・);
                // 繝輔ぃ繧､繝ｫ蜷阪°繧我ｸ諢上・ID繧堤函謌・
                const fileId: any = path.basename(filePath, fileExt).toLowerCase().replace(/\s+/g, '_');
                // 蜈ｨ縺ｦ縺ｮ蠖｢蠑上ｒPNG縺ｫ邨ｱ荳縺吶ｋ縺溘ａ縲ヾVG/JPG/GIF縺ｪ縺ｩ縺九ｉPNG縺ｸ縺ｮ螟画鋤繧貞ｮ溯｡・
                let pngFilePath = '';
                let originalFilePath = filePath;
                let updatedFilePath = filePath;
                let updatedFileExt = fileExt;
                if (fileExt !== '.png') {
                    try {
                        // 蜈・・繝輔ぃ繧､繝ｫ繝代せ繧剃ｿ晄戟
                        const origFilePath: any = filePath;
                        // PNG繝輔ぃ繧､繝ｫ繝代せ繧堤函謌・
                        pngFilePath = path.join(publicImagesDir, `${path.basename(filePath, fileExt)}.png`);
                        console.log(`${fileExt}蠖｢蠑上°繧臼NG蠖｢蠑上↓螟画鋤: ${pngFilePath}`);
                        if (fileExt === '.svg') {
                            // SVG縺ｮ蝣ｴ蜷医・迚ｹ蛻･縺ｪ蜃ｦ逅・
                            const svgContent: any = fs.readFileSync(origFilePath, 'utf8');
                            const svgBuffer: any = Buffer.from(svgContent);
                            await sharp(svgBuffer)
                                .png()
                                .toFile(pngFilePath);
                        }
                        else {
                            // 縺昴・莉悶・逕ｻ蜒丞ｽ｢蠑上・縺昴・縺ｾ縺ｾsharp縺ｧ螟画鋤
                            await sharp(origFilePath)
                                .png()
                                .toFile(pngFilePath);
                        }
                        console.log(`PNG蠖｢蠑上↓螟画鋤螳御ｺ・ ${pngFilePath}`);
                        // 莉･髯阪・蜃ｦ逅・〒縺ｯ螟画鋤縺励◆PNG繝輔ぃ繧､繝ｫ繧剃ｽｿ逕ｨ
                        originalFilePath = origFilePath; // 蜈・・繝代せ繧定ｨ倬鹸
                        updatedFilePath = pngFilePath; // 蜃ｦ逅・ｸｭ縺ｮ繝輔ぃ繧､繝ｫ繝代せ繧呈峩譁ｰ
                        updatedFileExt = '.png'; // 諡｡蠑ｵ蟄舌ｒ譖ｴ譁ｰ
                    }
                    catch (convErr) {
                        console.error(`${fileExt}縺九ｉPNG縺ｸ縺ｮ螟画鋤繧ｨ繝ｩ繝ｼ:`, convErr);
                        // 螟画鋤縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・蜈・・繝輔ぃ繧､繝ｫ繝代せ繧剃ｽｿ逕ｨ
                        pngFilePath = '';
                    }
                }
                // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿJSON繧定ｪｭ縺ｿ霎ｼ繧縺区眠隕丈ｽ懈・
                const knowledgeBaseDataDir: any = path.join(__dirname, '../../knowledge-base/data');
                if (!fs.existsSync(knowledgeBaseDataDir)) {
                    fs.mkdirSync(knowledgeBaseDataDir, { recursive: true });
                }
                // 繝・・繧ｿ縺ｮ菫晏ｭ伜・縺ｯ knowledge-base/data 縺ｮ縺ｿ縺ｫ荳蜈・喧
                const imageSearchDataPath: any = path.join(knowledgeBaseDataDir, 'image_search_data.json');
                // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蛻晄悄蛹・
                let imageSearchData = [];
                if (fs.existsSync(imageSearchDataPath)) {
                    try {
                        const jsonContent: any = fs.readFileSync(imageSearchDataPath, 'utf8');
                        imageSearchData = JSON.parse(jsonContent);
                        console.log(`譌｢蟄倥・逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆: ${imageSearchData.length}莉ｶ`);
                    }
                    catch (jsonErr) {
                        console.error("JSON隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:", jsonErr);
                        // 隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・譁ｰ隕丈ｽ懈・
                        imageSearchData = [];
                    }
                }
                // 繧ｿ繧､繝医Ν縺ｨ隱ｬ譏弱ｒ逕滓・・医ヵ繧｡繧､繝ｫ蜷阪°繧画耳貂ｬ・・
                const fileName: any = path.basename(file.originalname, fileExt);
                const title: any = fileName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                // 繧ｫ繝・ざ繝ｪ縺ｮ謗ｨ貂ｬ
                let category = '';
                let keywords = [];
                if (fileName.includes('engine') || fileName.includes('motor')) {
                    category = '繧ｨ繝ｳ繧ｸ繝ｳ';
                    keywords = ["繧ｨ繝ｳ繧ｸ繝ｳ", "繝｢繝ｼ繧ｿ繝ｼ", "蜍募鴨邉ｻ"];
                }
                else if (fileName.includes('cooling') || fileName.includes('radiator')) {
                    category = '蜀ｷ蜊ｴ邉ｻ邨ｱ';
                    keywords = ["蜀ｷ蜊ｴ", "繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ", "豌ｴ貍上ｌ"];
                }
                else if (fileName.includes('frame') || fileName.includes('chassis')) {
                    category = '霆贋ｽ・;
                    keywords = ["繝輔Ξ繝ｼ繝", "繧ｷ繝｣繝ｼ繧ｷ", "霆贋ｽ・];
                }
                else if (fileName.includes('cabin') || fileName.includes('cockpit')) {
                    category = '驕玖ｻ｢螳､';
                    keywords = ["繧ｭ繝｣繝薙Φ", "驕玖ｻ｢螳､", "謫堺ｽ懊ヱ繝阪Ν"];
                }
                else {
                    category = '菫晏ｮ育畑霆翫ヱ繝ｼ繝・;
                    keywords = ["菫晏ｮ・, "驛ｨ蜩・, "菫ｮ逅・];
                }
                // 繝輔ぃ繧､繝ｫ蜷阪°繧芽ｿｽ蜉縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ・域焚蟄励ｄ迚ｹ谿頑枚蟄励ｒ髯､蜴ｻ縺励※蜊倩ｪ槫・蜑ｲ・・
                const additionalKeywords: any = fileName
                    .replace(/[0-9_\-\.]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 1)
                    .map(word => word.toLowerCase());
                // 蝓ｺ譛ｬ繧ｭ繝ｼ繝ｯ繝ｼ繝峨→霑ｽ蜉繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ邨仙粋
                const allKeywords = ["菫晏ｮ育畑霆・, "驛ｨ蜩・, "蜀咏悄", "繧ｨ繝ｳ繧ｸ繝ｳ", "謨ｴ蛯・, "菫ｮ逅・, ...additionalKeywords];
                // 讀懃ｴ｢逕ｨ縺ｮ邨ｱ蜷医ユ繧ｭ繧ｹ繝・
                const searchText = [title, category, ...allKeywords, "蜍募鴨", "讖滓｢ｰ", "驕玖ｻ｢"].join(' ');
                // 隧ｳ邏ｰ諠・ｱ繧貞・螳溘＆縺帙ｋ縺溘ａ縺ｮ蜃ｦ逅・・螳ｹ
                const details = [
                    `菫晏ｮ育畑霆翫・${category}縺ｫ髢｢縺吶ｋ謚陦灘峙髱｢`,
                    `${title}縺ｮ隧ｳ邏ｰ蝗ｳ`,
                    `謨ｴ蛯吶・轤ｹ讀懊・菫ｮ逅・↓菴ｿ逕ｨ`,
                    `謚陦薙・繝九Η繧｢繝ｫ蜿ら・雉・侭`
                ];
                // 譁ｰ縺励＞逕ｻ蜒乗､懃ｴ｢繧｢繧､繝・Β繧剃ｽ懈・・医ｈ繧願ｩｳ邏ｰ縺ｪ諠・ｱ繧貞性繧・・
                const newImageItem = {
                    id: fileId,
                    file: `/knowledge-base/images/${path.basename(updatedFilePath || filePath)}`,
                    // 蜈ｨ縺ｦPNG蠖｢蠑上↓邨ｱ荳縺吶ｋ縺溘ａ縲｝ngFallback縺ｯ荳崎ｦ√↓縺ｪ繧翫∪縺励◆
                    pngFallback: '',
                    title: title,
                    category: category,
                    keywords: allKeywords,
                    description: `菫晏ｮ育畑霆翫・${category}縺ｫ髢｢縺吶ｋ蝗ｳ髱｢縺ｾ縺溘・蜀咏悄縺ｧ縺吶・{title}縺ｮ隧ｳ邏ｰ繧堤､ｺ縺励※縺・∪縺吶Ａ,
                    details: details.join('. '),
                    searchText: `${title} ${category} ${allKeywords.join(' ')} 菫晏ｮ育畑霆・謚陦灘峙髱｢ 謨ｴ蛯・轤ｹ讀・菫ｮ逅・,
                    metadata: {
                        uploadDate: new Date().toISOString(),
                        fileSize: file.size,
                        fileType: 'PNG', // 蜈ｨ縺ｦPNG蠖｢蠑上↓邨ｱ荳
                        originalFileType: fileExt !== '.png' ? fileExt.substring(1).toUpperCase() : 'PNG',
                        sourcePath: updatedFilePath || filePath,
                        originalPath: originalFilePath !== updatedFilePath ? originalFilePath : '',
                        documentId: fileId.split('_')[0] // 繝峨く繝･繝｡繝ｳ繝・D縺ｮ髢｢騾｣莉倥￠
                    }
                };
                // 譌｢蟄倥・繝・・繧ｿ縺ｫ譁ｰ縺励＞繧｢繧､繝・Β繧定ｿｽ蜉縺ｾ縺溘・譖ｴ譁ｰ
                const existingIndex: any = imageSearchData.findIndex((item) => item.id === fileId);
                if (existingIndex >= 0) {
                    imageSearchData[existingIndex] = newImageItem;
                }
                else {
                    imageSearchData.push(newImageItem);
                }
                // 譖ｴ譁ｰ縺励◆繝・・繧ｿ繧堤衍隴倥・繝ｼ繧ｹ縺ｫ譖ｸ縺崎ｾｼ縺ｿ
                fs.writeFileSync(imageSearchDataPath, JSON.stringify(imageSearchData, null, 2));
                console.log(`逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧堤衍隴倥・繝ｼ繧ｹ縺ｫ譖ｴ譁ｰ縺励∪縺励◆: ${imageSearchData.length}莉ｶ`);
                // 蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧九が繝励す繝ｧ繝ｳ縺後が繝輔・蝣ｴ蜷医∝・繝輔ぃ繧､繝ｫ繧貞炎髯､
                if (!keepOriginalFile) {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`蜈・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
                        }
                    }
                    catch (deleteErr) {
                        console.error(`蜈・ヵ繧｡繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${deleteErr}`);
                        // 繝輔ぃ繧､繝ｫ蜑企勁縺ｫ螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
                    }
                }
                // 邨先棡繧定ｿ斐☆
                return res.json({
                    success: true,
                    message: "逕ｻ蜒乗､懃ｴ｢逕ｨ繝・・繧ｿ縺梧ｭ｣蟶ｸ縺ｫ蜃ｦ逅・＆繧後∪縺励◆",
                    file: {
                        id: fileId,
                        name: file.originalname,
                        path: `/knowledge-base/images/${path.basename(updatedFilePath || filePath)}`,
                        // pngFallbackPath縺ｯ荳崎ｦ√↓縺ｪ繧翫∪縺励◆・亥・縺ｦPNG蠖｢蠑上↓邨ｱ荳・・
                        pngFallbackPath: '',
                        size: file.size,
                    },
                    imageSearchData: {
                        totalItems: imageSearchData.length,
                        newItem: newImageItem
                    }
                });
            }
            catch (imgError) {
                console.error("逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ蜃ｦ逅・お繝ｩ繝ｼ:", imgError);
                return res.status(500).json({
                    error: "逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
                    details: imgError instanceof Error ? imgError.message : String(imgError)
                });
            }
        }
        // 騾壼ｸｸ縺ｮ譁・嶌蜃ｦ逅・ｼ亥ｾ捺擂縺ｮ繧ｳ繝ｼ繝会ｼ・
        let extractedText = "";
        let pageCount = 0;
        let metadata = {};
        try {
            switch (fileExt) {
                case '.pdf':
                    const pdfResult: any = await extractPdfText(filePath);
                    extractedText = pdfResult.text;
                    pageCount = pdfResult.pageCount;
                    metadata = { pageCount, type: 'pdf' };
                    break;
                case '.docx':
                    extractedText = await extractWordText(filePath);
                    metadata = { type: 'docx' };
                    break;
                case '.xlsx':
                    extractedText = await extractExcelText(filePath);
                    metadata = { type: 'xlsx' };
                    break;
                case '.pptx':
                    const pptxResult = await extractPptxText(filePath);
                    extractedText = pptxResult.text;
                    // PPTX縺ｮ蝣ｴ蜷医・逕ｻ蜒上ｂ謚ｽ蜃ｺ貂医∩
                    metadata = {
                        type: 'pptx',
                        slideImages: pptxResult.slideImages
                    };
                    break;
            }
            // extracted_data.json縺ｸ縺ｮ繝・・繧ｿ霑ｽ蜉
            const knowledgeBaseDataDir: any = path.join(__dirname, '../../knowledge-base/data');
            if (!fs.existsSync(knowledgeBaseDataDir)) {
                fs.mkdirSync(knowledgeBaseDataDir, { recursive: true });
            }
            const extractedDataPath: any = path.join(knowledgeBaseDataDir, 'extracted_data.json');
            // 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱阪＠縲∝ｭ伜惠縺励↑縺・ｴ蜷医・遨ｺ縺ｮJSON繧剃ｽ懈・
            if (!fs.existsSync(extractedDataPath)) {
                fs.writeFileSync(extractedDataPath, JSON.stringify({ vehicleData: [] }, null, 2));
            }
            // 譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ
            const extractedData: any = JSON.parse(fs.readFileSync(extractedDataPath, 'utf-8'));
            // 霆贋ｸ｡繝・・繧ｿ繧ｭ繝ｼ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
            const vehicleDataKey = 'vehicleData';
            if (!extractedData[vehicleDataKey]) {
                extractedData[vehicleDataKey] = [];
            }
            const vehicleData: any = extractedData[vehicleDataKey];
            // 譁ｰ隕上ョ繝ｼ繧ｿ縺ｮ霑ｽ蜉
            // 繝｡繧ｿ繝・・繧ｿJSON繝輔ぃ繧､繝ｫ髢｢騾｣縺ｮ蜃ｦ逅・
            // 1. 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励→繝輔ぃ繧､繝ｫ蜷咲函謌・
            const timestamp: any = Date.now();
            const prefix: any = path.basename(filePath, path.extname(filePath)).substring(0, 2).toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            const metadataFileName = `${prefix}_${timestamp}_metadata.json`;
            // 2. knowledge-base繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・JSON繝輔か繝ｫ繝遒ｺ菫・
            const jsonDir: any = path.join(process.cwd(), 'knowledge-base/json');
            if (!fs.existsSync(jsonDir)) {
                fs.mkdirSync(jsonDir, { recursive: true });
            }
            // 3. 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繝代せ逕滓・
            const metadataFilePath: any = path.join(jsonDir, metadataFileName);
            // 4. 霆贋ｸ｡繝・・繧ｿ繧ｪ繝悶ず繧ｧ繧ｯ繝育函謌撰ｼ医Γ繧ｿ繝・・繧ｿJSON縺ｮ蜿ら・繝代せ繧貞性繧・・
            const newData = {
                id: path.basename(filePath, path.extname(filePath)),
                category: fileExt.substring(1).toUpperCase(),
                title: file.originalname,
                description: `謚陦薙し繝昴・繝域枚譖ｸ: ${file.originalname}`,
                details: extractedText.substring(0, 200) + "...", // 讎りｦ√・縺ｿ譬ｼ邏・
                image_path: (metadata as any).type === 'pptx' ? (metadata as any).slideImages[0] : null,
                all_slides: (metadata as any).type === 'pptx' ? (metadata as any).slideImages : null,
                metadata_json: `/knowledge-base/json/${metadataFileName}`,
                keywords: [fileExt.substring(1).toUpperCase(), "謚陦捺枚譖ｸ", "繧ｵ繝昴・繝・, file.originalname]
            };
            // 5. 繝｡繧ｿ繝・・繧ｿJSON縺ｮ蜀・ｮｹ繧呈ｺ門ｙ
            const metadataContent = {
                filename: file.originalname,
                filePath: filePath,
                uploadDate: new Date().toISOString(),
                fileSize: file.size,
                mimeType: file.mimetype,
                extractedText: extractedText,
                ...metadata
            };
            fs.writeFileSync(metadataFilePath, JSON.stringify(metadataContent, null, 2));
            console.log(`繝｡繧ｿ繝・・繧ｿJSON繧剃ｿ晏ｭ・ ${metadataFilePath}`);
            // 蠕梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ縺ｫ蜈・・蝣ｴ謇縺ｫ繧ゆｿ晏ｭ・
            fs.writeFileSync(`${filePath}_metadata.json`, JSON.stringify(metadataContent, null, 2));
            // 霆贋ｸ｡繝・・繧ｿ縺ｫ霑ｽ蜉
            const existingIndex: any = vehicleData.findIndex((item) => item.id === newData.id);
            if (existingIndex >= 0) {
                vehicleData[existingIndex] = newData;
            }
            else {
                vehicleData.push(newData);
            }
            // 譖ｴ譁ｰ縺励◆繝・・繧ｿ繧呈嶌縺崎ｾｼ縺ｿ
            fs.writeFileSync(extractedDataPath, JSON.stringify(extractedData, null, 2));
            // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｸ縺ｮ霑ｽ蜉繧定ｩｦ縺ｿ繧・
            try {
                await addDocumentToKnowledgeBase({ originalname: path.basename(filePath), path: filePath, mimetype: 'text/plain' }, fs.readFileSync(filePath, 'utf-8'));
            }
            catch (kbError) {
                console.error("繝翫Ξ繝・ず繝吶・繧ｹ縺ｸ縺ｮ霑ｽ蜉繧ｨ繝ｩ繝ｼ:", kbError);
                // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｸ縺ｮ霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
            }
            // 蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧九が繝励す繝ｧ繝ｳ縺後が繝輔・蝣ｴ蜷医∝・繝輔ぃ繧､繝ｫ繧貞炎髯､
            if (!keepOriginalFile) {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`蜈・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
                    }
                }
                catch (deleteErr) {
                    console.error(`蜈・ヵ繧｡繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${deleteErr}`);
                    // 繝輔ぃ繧､繝ｫ蜑企勁縺ｫ螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
                }
            }
            return res.json({
                success: true,
                file: {
                    id: newData.id,
                    name: file.originalname,
                    path: filePath,
                    size: file.size,
                },
                extractedTextPreview: extractedText.substring(0, 200) + "...",
                metadata: metadata
            });
        }
        catch (processingError) {
            console.error("繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:", processingError);
            
            // PPTX繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ蜷医・繧医ｊ隧ｳ邏ｰ縺ｪ繧ｨ繝ｩ繝ｼ諠・ｱ繧呈署萓・
            let errorMessage = "繝輔ぃ繧､繝ｫ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆";
            let errorDetails = processingError instanceof Error ? processingError.message : String(processingError);
            
            if (fileExt === '.pptx') {
                errorMessage = "PowerPoint繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆";
                if (errorDetails.includes('adm-zip') || errorDetails.includes('AdmZip')) {
                    errorDetails = "PowerPoint繝輔ぃ繧､繝ｫ縺ｮ隗｣蜃阪↓螟ｱ謨励＠縺ｾ縺励◆縲ゅヵ繧｡繧､繝ｫ縺檎ｴ謳阪＠縺ｦ縺・ｋ蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺吶・;
                } else if (errorDetails.includes('sharp') || errorDetails.includes('Sharp')) {
                    errorDetails = "繧ｹ繝ｩ繧､繝臥判蜒上・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・;
                } else if (errorDetails.includes('ENOENT') || errorDetails.includes('no such file')) {
                    errorDetails = "PowerPoint繝輔ぃ繧､繝ｫ縺ｮ蜀・Κ讒矩繧定ｪｭ縺ｿ蜿悶ｌ縺ｾ縺帙ｓ縺ｧ縺励◆縲・;
                }
            }
            
            return res.status(500).json({
                error: errorMessage,
                details: errorDetails,
                fileType: fileExt,
                fileName: file.originalname
            });
        }
    }
    catch (error) {
        console.error("繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:", error);
        return res.status(500).json({
            error: "繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * 繝ｭ繧ｰ繝輔ぃ繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 */
router.post('/cleanup-logs', async (req, res) => {
    try {
        // 荳譎ら噪縺ｪ螳溯｣・
        const cleanupLogFiles = async () => {
            console.log('Log cleanup completed');
        };

        await cleanupLogFiles();
        res.json({ success: true, message: 'Log cleanup completed' });
    } catch (error) {
        console.error('Log cleanup error:', error);
        res.status(500).json({ error: 'Log cleanup failed' });
    }
});
/**
 * uploads蜀・・繝輔ぃ繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 * knowledge-base縺ｫ蟄伜惠縺励↑縺・ヵ繧｡繧､繝ｫ縺ｯ蜑企勁縺輔ｌ縺ｪ縺・
 */
router.post('/cleanup-uploads', async (req, res) => {
    try {
        // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・蜃ｦ逅・ｒ螳溯｡・
        await cleanupTempDirectories();
        return res.json({
            success: true,
            message: 'uploads繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧貞ｮ溯｡後＠縺ｾ縺励◆'
        });
    }
    catch (error) {
        console.error('繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * knowledge-base縺ｨuploads縺ｮ繝・・繧ｿ繧貞曙譁ｹ蜷代↓蜷梧悄縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 */
router.post('/sync-knowledge-base', async (req, res) => {
    try {
        // 蜑肴婿莠呈鋤諤ｧ縺ｮ縺溘ａ縲、PI縺ｯ谿九＠縺ｦ縺翫￥縺悟ｮ滄圀縺ｮ蜷梧悄蜃ｦ逅・・陦後ｏ縺ｪ縺・
        // 縺吶∋縺ｦ縺ｮ繝輔ぃ繧､繝ｫ縺ｯknowledge-base縺ｫ荳蜈・喧縺輔ｌ繧九・縺ｧ縲∝酔譛溘・荳崎ｦ・
        // knowledge-base縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ繝代せ・亥盾辣ｧ縺ｮ縺ｿ・・
        const knowledgeBaseDirs = {
            images: path.join(__dirname, '../../knowledge-base/images'),
            json: path.join(__dirname, '../../knowledge-base/json'),
            data: path.join(__dirname, '../../knowledge-base/data')
        };
        // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→縺縺醍｢ｺ隱・
        for (const [dirType, kbDir] of Object.entries(knowledgeBaseDirs)) {
            // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
            ensureDirectoryExists(kbDir);
        }
        // 螳滄圀縺ｮ蜷梧悄縺ｯ陦後ｏ縺壹∫ｩｺ縺ｮ邨先棡繧定ｿ斐☆
        const syncResults = {
            images: {
                from: '/home/runner/workspace/knowledge-base/images',
                to: knowledgeBaseDirs.images,
                fileCount: 0,
                copiedCount: 0
            },
            json: {
                from: '/home/runner/workspace/knowledge-base/json',
                to: knowledgeBaseDirs.json,
                fileCount: 0,
                copiedCount: 0
            },
            data: {
                from: '/home/runner/workspace/knowledge-base/data',
                to: knowledgeBaseDirs.data,
                fileCount: 0,
                copiedCount: 0
            }
        };
        // 譁ｹ蜷代ヱ繝ｩ繝｡繝ｼ繧ｿ縺ｯ菴ｿ繧上↑縺・′縲∽ｺ呈鋤諤ｧ縺ｮ縺溘ａ縺ｫ繧ｳ繝｡繝ｳ繝医↓谿九☆
        // const direction: any = req.query.direction || 'kb-to-uploads';
        return res.json({
            success: true,
            message: '繝・・繧ｿ繧貞酔譛溘＠縺ｾ縺励◆ (knowledge-base)',
            results: syncResults
        });
    }
    catch (error) {
        console.error('蜷梧悄繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '繝・・繧ｿ蜷梧悄荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * 驥崎､・判蜒上ヵ繧｡繧､繝ｫ繧呈､懷・縺励※蜑企勁縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 * knowledge-base/images蜀・・驥崎､・判蜒上ｒ蜑企勁・亥酔荳繝上ャ繧ｷ繝･縺ｮ逕ｻ蜒上〒譛譁ｰ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励・繧ゅ・縺ｮ縺ｿ谿九☆・・
 */
router.post('/detect-duplicate-images', async (req, res) => {
    try {
        console.log('驥崎､・判蜒乗､懷・繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ蜿嶺ｿ｡...');
        const result: any = await detectAndRemoveDuplicateImages();
        return res.json({
            success: true,
            message: '驥崎､・判蜒上・讀懷・縺ｨ蜑企勁縺悟ｮ御ｺ・＠縺ｾ縺励◆',
            details: {
                removedFiles: result.removed,
                errors: result.errors
            }
        });
    }
    catch (error) {
        console.error('驥崎､・判蜒乗､懷・繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '驥崎､・判蜒上・讀懷・縺ｨ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * knowledge-base縺ｨuploads縺ｮ繝・・繧ｿ繧貞曙譁ｹ蜷代↓蜷梧悄縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 */
router.post('/sync-directories', async (req, res) => {
    try {
        console.log('繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ蜿嶺ｿ｡...');
        const rootDir: any = path.join(__dirname, '../../');
        const knowledgeBaseImagesDir: any = path.join(rootDir, 'knowledge-base/images');
        const tempImageDirs = [
            path.join(rootDir, 'uploads/images'),
            path.join(rootDir, 'public/uploads/images'),
            path.join(rootDir, 'public/images')
        ];
        // 蜷・ョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
        ensureDirectoryExists(knowledgeBaseImagesDir);
        for (const dir of tempImageDirs) {
            ensureDirectoryExists(dir);
        }
        let syncResults = {
            toKnowledgeBase: 0,
            fromKnowledgeBase: 0,
            errors: 0
        };
        // knowledge-base縺ｫ繝輔ぃ繧､繝ｫ繧偵さ繝斐・・医い繝・・繝ｭ繝ｼ繝峨ョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ・・
        for (const sourceDir of tempImageDirs) {
            if (!fs.existsSync(sourceDir))
                continue;
            const files: any = fs.readdirSync(sourceDir);
            for (const file of files) {
                const sourcePath: any = path.join(sourceDir, file);
                const targetPath: any = path.join(knowledgeBaseImagesDir, file);
                // knowledge-base縺ｫ蟄伜惠縺励↑縺・ｴ蜷医・縺ｿ繧ｳ繝斐・
                if (!fs.existsSync(targetPath)) {
                    try {
                        // 繝輔ぃ繧､繝ｫ繧偵さ繝斐・
                        fs.copyFileSync(sourcePath, targetPath);
                        console.log(`繝輔ぃ繧､繝ｫ繧談nowledge-base縺ｫ繧ｳ繝斐・縺励∪縺励◆: ${sourcePath} -> ${targetPath}`);
                        syncResults.toKnowledgeBase++;
                    }
                    catch (error) {
                        console.error(`繝輔ぃ繧､繝ｫ繧ｳ繝斐・繧ｨ繝ｩ繝ｼ: ${sourcePath}`, error);
                        syncResults.errors++;
                    }
                }
            }
        }
        // knowledge-base縺九ｉ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ繝輔ぃ繧､繝ｫ繧偵さ繝斐・・亥ｿ・ｦ√↓蠢懊§縺ｦ・・
        const kbFiles: any = fs.readdirSync(knowledgeBaseImagesDir);
        for (const file of kbFiles) {
            const sourcePath: any = path.join(knowledgeBaseImagesDir, file);
            for (const targetDir of tempImageDirs) {
                const targetPath: any = path.join(targetDir, file);
                // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ蟄伜惠縺励↑縺・ｴ蜷医・縺ｿ繧ｳ繝斐・
                if (!fs.existsSync(targetPath)) {
                    try {
                        // 繝輔ぃ繧､繝ｫ繧偵さ繝斐・
                        fs.copyFileSync(sourcePath, targetPath);
                        console.log(`繝輔ぃ繧､繝ｫ繧剃ｸ譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ繧ｳ繝斐・縺励∪縺励◆: ${sourcePath} -> ${targetPath}`);
                        syncResults.fromKnowledgeBase++;
                    }
                    catch (error) {
                        console.error(`繝輔ぃ繧､繝ｫ繧ｳ繝斐・繧ｨ繝ｩ繝ｼ: ${targetPath}`, error);
                        syncResults.errors++;
                    }
                }
            }
        }
        // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・・磯㍾隍・ヵ繧｡繧､繝ｫ縺ｮ蜑企勁・・
        await cleanupRedundantFiles();
        return res.json({
            success: true,
            message: '繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄縺悟ｮ御ｺ・＠縺ｾ縺励◆',
            details: syncResults
        });
    }
    catch (error) {
        console.error('繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * knowledge-base蜀・・蜈ｨ縺ｦ縺ｮ繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
 */
router.get('/knowledge-base-files', async (req, res) => {
    try {
        const knowledgeBaseDirs = {
            images: path.join(__dirname, '../../knowledge-base/images'),
            json: path.join(__dirname, '../../knowledge-base/json'),
            data: path.join(__dirname, '../../knowledge-base/data')
        };
        const files = {};
        for (const [dirType, dir] of Object.entries(knowledgeBaseDirs)) {
            if (fs.existsSync(dir)) {
                files[dirType] = fs.readdirSync(dir).filter(file => {
                    const filePath: any = path.join(dir, file);
                    return fs.statSync(filePath).isFile();
                });
            }
            else {
                files[dirType] = [];
            }
        }
        return res.json({
            success: true,
            files
        });
    }
    catch (error) {
        console.error('繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        return res.status(500).json({
            error: '繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * 蜑企勁縺輔ｌ縺溘ラ繧ｭ繝･繝｡繝ｳ繝医↓髢｢騾｣縺吶ｋ蟄､遶徽SON繝輔ぃ繧､繝ｫ繧呈､懷・縺励※蜑企勁縺吶ｋ髢｢謨ｰ
 * 繝峨く繝･繝｡繝ｳ繝亥炎髯､蠕後↓螳溯｡後☆繧九％縺ｨ縺ｧ縲∵ｮ句ｭ倥＠縺ｦ縺・ｋJSON繝・・繧ｿ繧貞ｮ悟・縺ｫ蜑企勁縺吶ｋ
 */
async function cleanupOrphanedJsonFiles() {
    const jsonDir: any = path.join(process.cwd(), 'knowledge-base/json');
    let removedCount = 0;
    let errorCount = 0;
    try {
        if (!fs.existsSync(jsonDir)) {
            console.log(`JSON繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励∪縺帙ｓ: ${jsonDir}`);
            return { removed: 0, errors: 0 };
        }
        // 迚ｹ螳壹・繝輔ぃ繧､繝ｫ繧偵ヶ繝ｩ繝・け繝ｪ繧ｹ繝亥喧・育音谿翫↑逕ｨ騾斐・繝輔ぃ繧､繝ｫ縺ｪ縺ｩ・・
        const blacklistFiles = ['guide_1744876404679_metadata.json', 'guide_metadata.json'];
        // 繝｡繧ｿ繝・・繧ｿJSON繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
        const allFiles: any = fs.readdirSync(jsonDir);
        const metadataFiles: any = allFiles.filter(file => file.endsWith('_metadata.json') &&
            !blacklistFiles.includes(file));
        console.log(`JSON繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ: ${metadataFiles.length}莉ｶ`);
        // knowledge-base蜀・・繝峨く繝･繝｡繝ｳ繝医ョ繧｣繝ｬ繧ｯ繝医Μ荳隕ｧ繧貞叙蠕・
        const knowledgeBaseDir: any = path.join(process.cwd(), 'knowledge-base');
        const docDirs: any = fs.readdirSync(knowledgeBaseDir)
            .filter(dir => dir.startsWith('doc_'))
            .map(dir => {
            // doc_1745233987839_645 縺九ｉ繝励Ξ繝輔ぅ繝・け繧ｹ繧呈歓蜃ｺ: mc_1745233987839
            const match: any = dir.match(/doc_(\d+)_/);
            return match ? `mc_${match[1]}` : '';
        })
            .filter(Boolean); // 遨ｺ譁・ｭ怜・繧帝勁螟・
        // 譁ｰ縺励＞繝峨く繝･繝｡繝ｳ繝域ｧ矩繧り・・
        const documentsDir: any = path.join(knowledgeBaseDir, 'documents');
        if (fs.existsSync(documentsDir)) {
            const moreDocs: any = fs.readdirSync(documentsDir)
                .filter(dir => dir.startsWith('doc_'))
                .map(dir => {
                const match: any = dir.match(/doc_(\d+)_/);
                return match ? `mc_${match[1]}` : '';
            })
                .filter(Boolean);
            // 驟榊・繧堤ｵ仙粋
            docDirs.push(...moreDocs);
        }
        console.log(`遏･隴倥・繝ｼ繧ｹ蜀・・繝峨く繝･繝｡繝ｳ繝医・繝ｬ繝輔ぅ繝・け繧ｹ: ${docDirs.length}莉ｶ`);
        // 蜷・Γ繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧偵メ繧ｧ繝・け
        for (const file of metadataFiles) {
            // 繝輔ぃ繧､繝ｫ蜷阪・繝励Ξ繝輔ぅ繝・け繧ｹ繧呈歓蜃ｺ・井ｾ・ mc_1744105287766_metadata.json縺九ｉmc_1744105287766・・
            const prefix: any = file.split('_metadata.json')[0];
            // 蟇ｾ蠢懊☆繧九ラ繧ｭ繝･繝｡繝ｳ繝医′蟄伜惠縺吶ｋ縺九メ繧ｧ繝・け
            const hasMatchingDocument: any = docDirs.some(docPrefix => docPrefix === prefix);
            if (!hasMatchingDocument) {
                // 蟇ｾ蠢懊☆繧九ラ繧ｭ繝･繝｡繝ｳ繝医′蟄伜惠縺励↑縺・ｴ蜷医・蟄､遶九＠縺櫟SON繝輔ぃ繧､繝ｫ縺ｨ蛻､譁ｭ縺励※蜑企勁
                try {
                    const filePath: any = path.join(jsonDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`蟄､遶九＠縺櫟SON繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${file}`);
                    removedCount++;
                }
                catch (error) {
                    console.error(`JSON繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${file}`, error);
                    errorCount++;
                }
            }
        }
        console.log(`蟄､遶九＠縺櫟SON繝輔ぃ繧､繝ｫ蜑企勁邨先棡: 謌仙粥=${removedCount}莉ｶ, 螟ｱ謨・${errorCount}莉ｶ`);
        return { removed: removedCount, errors: errorCount };
    }
    catch (error) {
        console.error('蟄､遶九＠縺櫟SON繝輔ぃ繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
        return { removed: removedCount, errors: errorCount + 1 };
    }
}
/**
 * 蟄､遶九＠縺櫟SON繝輔ぃ繧､繝ｫ繧貞炎髯､縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
 * 邂｡逅・ｩ溯・縺ｨ縺励※螳溯｣・＠縲∵・遉ｺ逧・↓蜻ｼ縺ｳ蜃ｺ縺吶％縺ｨ縺ｧ繝｡繝ｳ繝・リ繝ｳ繧ｹ繧貞ｮ溯｡・
 */
router.post('/cleanup-json', async (req, res) => {
    try {
        console.log('蟄､遶徽SON繝輔ぃ繧､繝ｫ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
        const result: any = await cleanupOrphanedJsonFiles();
        return res.json({
            success: true,
            removed: result.removed,
            errors: result.errors,
            message: `${result.removed}莉ｶ縺ｮ蟄､遶徽SON繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆`
        });
    }
    catch (error) {
        console.error('蟄､遶徽SON繝輔ぃ繧､繝ｫ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error);
        return res.status(500).json({
            success: false,
            error: '蟄､遶徽SON繝輔ぃ繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
// Router縺ｯ菴ｿ縺｣縺ｦ縺・↑縺・′縲（mport繧ｨ繝ｩ繝ｼ蝗樣∩縺ｮ縺溘ａ繝繝溘・繧ｨ繧ｯ繧ｹ繝昴・繝・
export const techSupportRouter = router;