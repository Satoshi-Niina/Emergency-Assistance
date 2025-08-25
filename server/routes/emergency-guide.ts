import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { log } from '../vite.js';
import { fileURLToPath } from 'url';
// 荳譎ゅヵ繧｡繧､繝ｫ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ
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
        console.log(`荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励∪縺励◆: ${dirPath}`);
    }
    catch (error) {
        console.error(`荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${dirPath}`, error);
    }
}
const router: any = Router();
// 繝・ぅ繝ｬ繧ｯ繝医Μ讒矩縺ｮ險ｭ螳・
const knowledgeBaseDir: any = path.join(process.cwd(), 'knowledge-base');
const pptDir: any = path.join(knowledgeBaseDir, 'ppt');
const jsonDir: any = path.join(knowledgeBaseDir, 'json');
const imageDir: any = path.join(knowledgeBaseDir, 'images');
const tempDir: any = path.join(knowledgeBaseDir, 'temp');
// knowledge-base縺ｫ螳悟・縺ｫ荳蜈・喧縺輔ｌ縺溘◆繧√「ploads繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蜿ら・縺ｯ荳崎ｦ・
// 繝・・繧ｿ縺ｮ蜿ら・縺ｯ縺吶∋縺ｦknowledge-base繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ陦後≧
// 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蟄伜惠遒ｺ隱阪→菴懈・・井ｸｻ縺ｫknowledge-base・・
[knowledgeBaseDir, pptDir, jsonDir, imageDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Multer縺ｮ險ｭ螳・
const storage: any = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, pptDir);
    },
    filename: (_req, file, cb) => {
        const timestamp: any = Date.now();
        const originalName: any = file.originalname;
        const extension: any = path.extname(originalName);
        const fileName = `guide_${timestamp}${extension}`;
        cb(null, fileName);
    }
});
// 繝輔ぃ繧､繝ｫ繝輔ぅ繝ｫ繧ｿ繝ｼ・郁ｨｱ蜿ｯ縺吶ｋ諡｡蠑ｵ蟄撰ｼ・
const fileFilter = (_req: any, file: any, cb) => {
    const allowedExtensions = ['.pptx', '.ppt', '.xlsx', '.xls', '.pdf', '.json'];
    const ext: any = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺吶１owerPoint (.pptx, .ppt)縲・xcel (.xlsx, .xls)縲￣DF (.pdf)縲√∪縺溘・ JSON (.json) 繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝峨〒縺阪∪縺吶・));
    }
};
const upload: any = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// 蜷・ｨｮ繝輔ぃ繧､繝ｫ蠖｢蠑上ｒ蜃ｦ逅・＠縺ｦJSON繝・・繧ｿ縺ｫ螟画鋤縺吶ｋ髢｢謨ｰ
async function processFile(filePath) {
    try {
        const fileId = `guide_${Date.now()}`;
        const fileExtension: any = path.extname(filePath);
        // PPTX繝輔ぃ繧､繝ｫ繧定ｧ｣蜃阪＠縺ｦXML縺ｨ縺励※蜃ｦ逅・
        if (fileExtension.toLowerCase() === '.pptx') {
            const zip: any = new AdmZip(filePath);
            const extractDir: any = path.join(tempDir, fileId);
            // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            if (!fs.existsSync(extractDir)) {
                fs.mkdirSync(extractDir, { recursive: true });
            }
            // ZIP縺ｨ縺励※螻暮幕
            zip.extractAllTo(extractDir, true);
            // 繧ｹ繝ｩ繧､繝厩ML繝輔ぃ繧､繝ｫ繧呈爾縺・
            const slidesDir: any = path.join(extractDir, 'ppt', 'slides');
            const slideFiles: any = fs.existsSync(slidesDir)
                ? fs.readdirSync(slidesDir).filter(file => file.startsWith('slide') && file.endsWith('.xml'))
                : [];
            // 繧ｹ繝ｩ繧､繝峨・繝・く繧ｹ繝亥・螳ｹ繧呈歓蜃ｺ
            const slides = [];
            for (let i = 0; i < slideFiles.length; i++) {
                const slideNumber: any = i + 1;
                const slideFilePath: any = path.join(slidesDir, slideFiles[i]);
                const slideContent: any = fs.readFileSync(slideFilePath, 'utf8');
                // 逕ｻ蜒上・蜿ら・繧呈爾縺・
                const imageRefs = [];
                const imageRegex = /r:embed="rId(\d+)"/g;
                let match;
                while ((match = imageRegex.exec(slideContent)) !== null) {
                    imageRefs.push(match[1]);
                }
                // 繝・く繧ｹ繝亥・螳ｹ縺ｮ謚ｽ蜃ｺ
                const textRegex = /<a:t>(.*?)<\/a:t>/g;
                const texts = [];
                while ((match = textRegex.exec(slideContent)) !== null) {
                    if (match[1].trim()) {
                        texts.push(match[1].trim());
                    }
                }
                // 繝弱・繝茨ｼ医せ繝斐・繧ｫ繝ｼ繝弱・繝茨ｼ峨・蜀・ｮｹ繧貞叙蠕・
                const noteFilePath: any = path.join(extractDir, 'ppt', 'notesSlides', `notesSlide${slideNumber}.xml`);
                let noteContent = '';
                if (fs.existsSync(noteFilePath)) {
                    const noteXml: any = fs.readFileSync(noteFilePath, 'utf8');
                    const noteRegex = /<a:t>(.*?)<\/a:t>/g;
                    while ((match = noteRegex.exec(noteXml)) !== null) {
                        if (match[1].trim()) {
                            noteContent += match[1].trim() + '\n';
                        }
                    }
                }
                // 繝｡繝・ぅ繧｢繝輔ぃ繧､繝ｫ繧呈爾縺励※菫晏ｭ・
                const imageTexts = [];
                const mediaDir: any = path.join(extractDir, 'ppt', 'media');
                if (fs.existsSync(mediaDir)) {
                    const mediaFiles: any = fs.readdirSync(mediaDir);
                    // 蜷・判蜒上ヵ繧｡繧､繝ｫ繧貞・逅・
                    for (const mediaFile of mediaFiles) {
                        const sourcePath: any = path.join(mediaDir, mediaFile);
                        const targetFileName = `${fileId}_slide${slideNumber}_${mediaFile}`;
                        const targetPath: any = path.join(imageDir, targetFileName);
                        // 逕ｻ蜒上ｒ繧ｳ繝斐・
                        fs.copyFileSync(sourcePath, targetPath);
                        // 逕ｻ蜒上ヱ繧ｹ縺ｮ菴懈・・育嶌蟇ｾ繝代せ・・
                        const relativePath = `/knowledge-base/images/${targetFileName}`;
                        // 逕ｻ蜒上↓髢｢騾｣縺吶ｋ繝・く繧ｹ繝医ｒ隕九▽縺代ｋ・育判蜒上・霑代￥縺ｮ繝・く繧ｹ繝郁ｦ∫ｴ縺九ｉ・・
                        const imageText: any = texts.length > 0 ? texts[0] : '逕ｻ蜒上・隱ｬ譏弱′縺ゅｊ縺ｾ縺帙ｓ';
                        imageTexts.push({
                            逕ｻ蜒上ヱ繧ｹ: relativePath,
                            繝・く繧ｹ繝・ imageText
                        });
                    }
                }
                // 繧ｹ繝ｩ繧､繝峨ョ繝ｼ繧ｿ縺ｮ讒狗ｯ・
                slides.push({
                    繧ｹ繝ｩ繧､繝臥分蜿ｷ: slideNumber,
                    繧ｿ繧､繝医Ν: texts.length > 0 ? texts[0] : `繧ｹ繝ｩ繧､繝・${slideNumber}`,
                    譛ｬ譁・ texts.slice(1), // 蜈磯ｭ・医ち繧､繝医Ν・我ｻ･螟悶・繝・く繧ｹ繝・
                    繝弱・繝・ noteContent,
                    逕ｻ蜒上ユ繧ｭ繧ｹ繝・ imageTexts
                });
            }
            // 繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ縺ｮ繝｡繧ｿ繝・・繧ｿ繧貞叙蠕・
            const corePropsPath: any = path.join(extractDir, 'docProps', 'core.xml');
            let title = path.basename(filePath, fileExtension);
            let creator = '';
            let created = new Date().toISOString();
            let modified = new Date().toISOString();
            if (fs.existsSync(corePropsPath)) {
                const coreProps: any = fs.readFileSync(corePropsPath, 'utf8');
                // 繧ｿ繧､繝医Ν繧貞叙蠕・
                const titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
                if (titleMatch && titleMatch[1]) {
                    title = titleMatch[1];
                }
                // 菴懈・閠・ｒ蜿門ｾ・
                const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
                if (creatorMatch && creatorMatch[1]) {
                    creator = creatorMatch[1];
                }
                // 菴懈・譌･繧貞叙蠕・
                const createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(coreProps);
                if (createdMatch && createdMatch[1]) {
                    created = createdMatch[1];
                }
                // 譖ｴ譁ｰ譌･繧貞叙蠕・
                const modifiedMatch = /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
                if (modifiedMatch && modifiedMatch[1]) {
                    modified = modifiedMatch[1];
                }
            }
            // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧貞炎髯､
            fs.rmSync(extractDir, { recursive: true, force: true });
            // 譛邨ら噪縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菴懈・
            const result = {
                metadata: {
                    繧ｿ繧､繝医Ν: title,
                    菴懈・閠・ creator || 'Unknown',
                    菴懈・譌･: created,
                    菫ｮ豁｣譌･: modified,
                    隱ｬ譏・ `PowerPoint縺九ｉ逕滓・縺輔ｌ縺溷ｿ懈･蠕ｩ譌ｧ繝輔Ο繝ｼ縲・{title}縲阪〒縺吶よ磁邯夂分蜿ｷ: 123`
                },
                slides
            };
            // JSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
            const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
            fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
            return {
                id: fileId,
                filePath: jsonFilePath,
                fileName: path.basename(filePath),
                title,
                createdAt: new Date().toISOString(),
                slideCount: slides.length,
                data: result
            };
        }
        else if (fileExtension.toLowerCase() === '.xlsx' || fileExtension.toLowerCase() === '.xls') {
            // Excel繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・
            const fileName: any = path.basename(filePath, fileExtension);
            const slides = [];
            try {
                // XLSX繝ｩ繧､繝悶Λ繝ｪ繧剃ｽｿ逕ｨ縺励※Excel繝輔ぃ繧､繝ｫ繧貞・逅・
                const XLSX = await import("xlsx");
                const workbook: any = XLSX.readFile(filePath);
                // 繧ｷ繝ｼ繝亥錐縺ｮ荳隕ｧ繧貞叙蠕・
                const sheetNames: any = workbook.SheetNames;
                // 蜷・す繝ｼ繝医ｒ縲後せ繝ｩ繧､繝峨阪→縺励※蜃ｦ逅・
                for (let i = 0; i < sheetNames.length; i++) {
                    const sheetName: any = sheetNames[i];
                    const worksheet: any = workbook.Sheets[sheetName];
                    // 繧ｷ繝ｼ繝医・蜀・ｮｹ繧谷SON縺ｫ螟画鋤
                    const sheetData: any = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    // 遨ｺ縺ｮ繧ｷ繝ｼ繝医ｒ繧ｹ繧ｭ繝・・
                    if (sheetData.length === 0)
                        continue;
                    // 繝・く繧ｹ繝亥・螳ｹ繧呈歓蜃ｺ・・陦檎岼繧偵ち繧､繝医Ν縲∵ｮ九ｊ繧呈悽譁・→隕九↑縺呻ｼ・
                    const title: any = Array.isArray(sheetData[0]) && sheetData[0].length > 0
                        ? String(sheetData[0][0] || `繧ｷ繝ｼ繝・${i + 1}`)
                        : `繧ｷ繝ｼ繝・${i + 1}`;
                    // 譛ｬ譁・→縺励※谿九ｊ縺ｮ陦後ｒ邨仙粋
                    const bodyTexts = [];
                    for (let j = 1; j < sheetData.length; j++) {
                        if (Array.isArray(sheetData[j])) {
                            const rowText: any = sheetData[j].filter((cell) => cell !== undefined && cell !== null)
                                .map((cell) => String(cell).trim())
                                .join(', ');
                            if (rowText) {
                                bodyTexts.push(rowText);
                            }
                        }
                    }
                    // 繧ｹ繝ｩ繧､繝峨ョ繝ｼ繧ｿ繧定ｿｽ蜉
                    slides.push({
                        繧ｹ繝ｩ繧､繝臥分蜿ｷ: i + 1,
                        繧ｿ繧､繝医Ν: title,
                        譛ｬ譁・ bodyTexts,
                        繝弱・繝・ `Excel繧ｷ繝ｼ繝医・{sheetName}縲阪°繧臥函謌舌＆繧後∪縺励◆`,
                        逕ｻ蜒上ユ繧ｭ繧ｹ繝・ []
                    });
                }
                // 譛邨ら噪縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菴懈・
                const result = {
                    metadata: {
                        繧ｿ繧､繝医Ν: fileName,
                        菴懈・閠・ 'Excel謚ｽ蜃ｺ',
                        菴懈・譌･: new Date().toISOString(),
                        菫ｮ豁｣譌･: new Date().toISOString(),
                        隱ｬ譏・ `Excel繝輔ぃ繧､繝ｫ縲・{fileName}縲阪°繧臥函謌舌＆繧後◆蠢懈･蠕ｩ譌ｧ繝輔Ο繝ｼ縺ｧ縺吶よ磁邯夂分蜿ｷ: 123`
                    },
                    slides
                };
                // JSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: slides.length,
                    data: result
                };
            }
            catch (error) {
                console.error('Excel繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
                throw new Error('Excel繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆');
            }
        }
        else if (fileExtension.toLowerCase() === '.pdf') {
            // PDF繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・
            const fileName: any = path.basename(filePath, fileExtension);
            // PDF繝輔ぃ繧､繝ｫ蜃ｦ逅・・螳溯｣・ｼ井ｾ具ｼ壹ユ繧ｭ繧ｹ繝域歓蜃ｺ縺ｮ縺ｿ・・
            // 螳滄圀縺ｮPDF蜃ｦ逅・・pdfjs-dist繧剃ｽｿ逕ｨ縺励∪縺・
            try {
                // PDF縺九ｉ縺ｮ繝・く繧ｹ繝域歓蜃ｺ讖溯・繧剃ｻｮ螳溯｣・
                // 螳滄圀縺ｮ螳溯｣・〒縺ｯ縲√ｈ繧願ｩｳ邏ｰ縺ｪPDF縺ｮ隗｣譫舌→繝・く繧ｹ繝域歓蜃ｺ縺悟ｿ・ｦ・
                const slides = [{
                        繧ｹ繝ｩ繧､繝臥分蜿ｷ: 1,
                        繧ｿ繧､繝医Ν: fileName,
                        譛ｬ譁・ ['PDF縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ縺励∪縺励◆縲よ磁邯夂分蜿ｷ: 123'],
                        繝弱・繝・ 'PDF繝輔ぃ繧､繝ｫ縺九ｉ逕滓・縺輔ｌ縺溷ｿ懈･蠕ｩ譌ｧ繝輔Ο繝ｼ縺ｧ縺・,
                        逕ｻ蜒上ユ繧ｭ繧ｹ繝・ []
                    }];
                // 譛邨ら噪縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菴懈・
                const result = {
                    metadata: {
                        繧ｿ繧､繝医Ν: fileName,
                        菴懈・閠・ 'PDF謚ｽ蜃ｺ',
                        菴懈・譌･: new Date().toISOString(),
                        菫ｮ豁｣譌･: new Date().toISOString(),
                        隱ｬ譏・ `PDF繝輔ぃ繧､繝ｫ縲・{fileName}縲阪°繧臥函謌舌＆繧後◆蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｧ縺兪
                    },
                    slides
                };
                // JSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: slides.length,
                    data: result
                };
            }
            catch (error) {
                console.error('PDF繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
                throw new Error('PDF繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆');
            }
        }
        else if (fileExtension.toLowerCase() === '.json') {
            // JSON繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・
            console.log('JSON繝輔ぃ繧､繝ｫ繧貞・逅・＠縺ｾ縺・', filePath);
            const fileName: any = path.basename(filePath, fileExtension);
            try {
                // JSON繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧定ｪｭ縺ｿ蜿悶ｋ
                const jsonContent: any = fs.readFileSync(filePath, 'utf8');
                let jsonData = JSON.parse(jsonContent);
                // JSON讒矩繧呈､懆ｨｼ
                if (!jsonData) {
                    throw new Error('JSON繝輔ぃ繧､繝ｫ縺ｮ隗｣譫舌↓螟ｱ謨励＠縺ｾ縺励◆縲よ怏蜉ｹ縺ｪJSON繝輔ぃ繧､繝ｫ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
                }
                console.log('蜈・・JSON繝・・繧ｿ縺ｮ讒矩:', Object.keys(jsonData));
                // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上°縺ｩ縺・°繧堤｢ｺ隱・
                const isTroubleshootingFormat: any = jsonData.steps && Array.isArray(jsonData.steps);
                if (isTroubleshootingFormat) {
                    console.log('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上・JSON繧呈､懷・縺励∪縺励◆縲Ｔteps驟榊・縺後≠繧翫∪縺吶・);
                    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上°繧峨ぎ繧､繝牙ｽ｢蠑上↓螟画鋤
                    const convertedData = {
                        metadata: {
                            繧ｿ繧､繝医Ν: jsonData.title || fileName || '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繝・・繧ｿ',
                            菴懈・閠・ '繧ｷ繧ｹ繝・Β',
                            菴懈・譌･: new Date().toISOString(),
                            菫ｮ豁｣譌･: new Date().toISOString(),
                            隱ｬ譏・ jsonData.description || '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ縺九ｉ逕滓・縺輔ｌ縺溷ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｧ縺・,
                            蜴溷ｽ｢蠑・ 'troubleshooting'
                        },
                        slides: jsonData.steps.map((step, index) => ({
                            繧ｹ繝ｩ繧､繝臥分蜿ｷ: index + 1,
                            繧ｿ繧､繝医Ν: step.title || `繧ｹ繝・ャ繝・${index + 1}`,
                            譛ｬ譁・ [step.message || step.description || ''],
                            繝弱・繝・ step.options ? `驕ｸ謚櫁い: ${step.options.map((opt) => opt.text).join(', ')}` : '',
                            逕ｻ蜒上ユ繧ｭ繧ｹ繝・ []
                        })),
                        original: jsonData // 蜈・・JSON繝・・繧ｿ繧ゆｿ晄戟
                    };
                    // 螟画鋤蠕後・繝・・繧ｿ縺ｧ鄂ｮ縺肴鋤縺・
                    jsonData = convertedData;
                    console.log('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上°繧峨ぎ繧､繝牙ｽ｢蠑上↓螟画鋤縺励∪縺励◆');
                }
                else {
                    // 讓呎ｺ也噪縺ｪ繧ｬ繧､繝牙ｽ｢蠑上↓螟画鋤
                    // 蠢・ｦ√↓蠢懊§縺ｦ讒矩繧呈ｧ狗ｯ会ｼ・etadata縲《lides縺後↑縺・ｴ蜷医・菴懈・・・
                    if (!jsonData.metadata) {
                        console.log('JSON縺ｫmetadata縺後↑縺・◆繧√∽ｽ懈・縺励∪縺・);
                        jsonData.metadata = {
                            繧ｿ繧､繝医Ν: jsonData.title || fileName || '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繝・・繧ｿ',
                            菴懈・閠・ '繧ｷ繧ｹ繝・Β',
                            菴懈・譌･: new Date().toISOString(),
                            菫ｮ豁｣譌･: new Date().toISOString(),
                            隱ｬ譏・ jsonData.description || 'JSON繝輔ぃ繧､繝ｫ縺九ｉ逕滓・縺輔ｌ縺溷ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｧ縺・
                        };
                    }
                    if (!jsonData.slides || !Array.isArray(jsonData.slides)) {
                        console.log('JSON縺ｫslides縺後↑縺・°驟榊・縺ｧ縺ｯ縺ｪ縺・◆繧√∽ｽ懈・縺励∪縺・);
                        // slides繧剃ｽ懈・
                        jsonData.slides = [];
                        // steps縺後≠繧後・縲√◎繧後ｒslides縺ｫ螟画鋤
                        if (jsonData.steps && Array.isArray(jsonData.steps)) {
                            console.log('steps驟榊・繧痴lides縺ｫ螟画鋤縺励∪縺・);
                            jsonData.slides = jsonData.steps.map((step, index) => ({
                                繧ｹ繝ｩ繧､繝臥分蜿ｷ: index + 1,
                                繧ｿ繧､繝医Ν: step.title || `繧ｹ繝・ャ繝・${index + 1}`,
                                譛ｬ譁・ [step.message || step.description || ''],
                                繝弱・繝・ step.options ? `驕ｸ謚櫁い: ${step.options.map((opt) => opt.text).join(', ')}` : '',
                                逕ｻ蜒上ユ繧ｭ繧ｹ繝・ []
                            }));
                        }
                        else {
                            // 繝・・繧ｿ縺九ｉ繧ｷ繝ｳ繝励Ν縺ｪ繧ｹ繝ｩ繧､繝峨ｒ逕滓・
                            const slideData = {
                                繧ｹ繝ｩ繧､繝臥分蜿ｷ: 1,
                                繧ｿ繧､繝医Ν: jsonData.metadata?.繧ｿ繧､繝医Ν || jsonData.title || fileName || 'JSON繝・・繧ｿ',
                                譛ｬ譁・ [jsonData.description || 'JSON繝・・繧ｿ縺九ｉ閾ｪ蜍慕函謌舌＆繧後◆繧ｹ繝ｩ繧､繝峨〒縺・],
                                繝弱・繝・ 'JSON繝輔ぃ繧､繝ｫ縺九ｉ逕滓・縺輔ｌ縺溷・螳ｹ縺ｧ縺・,
                                逕ｻ蜒上ユ繧ｭ繧ｹ繝・ []
                            };
                            jsonData.slides.push(slideData);
                        }
                    }
                }
                // 蜈・・JSON蠖｢蠑上ｒ菫晏ｭ倥☆繧九◆繧√・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ
                const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base/troubleshooting');
                // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
                if (!fs.existsSync(troubleshootingDir)) {
                    fs.mkdirSync(troubleshootingDir, { recursive: true });
                }
                // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上・JSON縺ｮ蝣ｴ蜷医∝・縺ｮ蠖｢蠑上ｂ菫晏ｭ・
                if (isTroubleshootingFormat) {
                    const tsFilePath: any = path.join(troubleshootingDir, `${path.basename(fileName, '.json')}.json`);
                    fs.writeFileSync(tsFilePath, jsonContent);
                    console.log(`繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ蠖｢蠑上・JSON繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${tsFilePath}`);
                }
                // 逕ｻ蜒上ヱ繧ｹ縺ｮ菫ｮ豁｣・亥ｿ・ｦ√↓蠢懊§縺ｦ・・
                jsonData.slides.forEach((slide) => {
                    if (slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・&& Array.isArray(slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・) {
                        slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・forEach((imgText) => {
                            if (imgText.逕ｻ蜒上ヱ繧ｹ && imgText.逕ｻ蜒上ヱ繧ｹ.startsWith('/uploads/')) {
                                imgText.逕ｻ蜒上ヱ繧ｹ = imgText.逕ｻ蜒上ヱ繧ｹ.replace('/uploads/', '/knowledge-base/');
                            }
                        });
                    }
                });
                // 繝｡繧ｿ繝・・繧ｿ縺ｮ譖ｴ譁ｰ
                jsonData.metadata.菴懈・譌･ = jsonData.metadata.菴懈・譌･ || new Date().toISOString();
                jsonData.metadata.菫ｮ豁｣譌･ = new Date().toISOString();
                // 隱ｬ譏弱ｒ譖ｴ譁ｰ縺励√悟ｿ懈･蠕ｩ譌ｧ縲阪ｒ縲悟ｿ懈･蜃ｦ鄂ｮ縲阪↓邨ｱ荳
                if (jsonData.metadata.隱ｬ譏・&& jsonData.metadata.隱ｬ譏・includes('蠢懈･蠕ｩ譌ｧ')) {
                    jsonData.metadata.隱ｬ譏・= jsonData.metadata.隱ｬ譏・replace(/蠢懈･蠕ｩ譌ｧ/g, '蠢懈･蜃ｦ鄂ｮ');
                }
                // 繧ｿ繧､繝医Ν縺ｮ縲悟ｿ懈･蠕ｩ譌ｧ縲阪ｒ縲悟ｿ懈･蜃ｦ鄂ｮ縲阪↓邨ｱ荳
                if (jsonData.metadata.繧ｿ繧､繝医Ν && jsonData.metadata.繧ｿ繧､繝医Ν.includes('蠢懈･蠕ｩ譌ｧ')) {
                    jsonData.metadata.繧ｿ繧､繝医Ν = jsonData.metadata.繧ｿ繧､繝医Ν.replace(/蠢懈･蠕ｩ譌ｧ/g, '蠢懈･蜃ｦ鄂ｮ');
                }
                // 譁ｰ縺励＞JSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: jsonData.metadata.繧ｿ繧､繝医Ν || fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: jsonData.slides.length,
                    data: jsonData
                };
            }
            catch (error) {
                console.error('JSON繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
                throw new Error(`JSON繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'}`);
            }
        }
        else {
            throw new Error('繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺・);
        }
    }
    catch (error) {
        console.error('繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
        throw error;
    }
}
// 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝峨→蜃ｦ逅・・繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ' });
        }
        const filePath: any = req.file.path;
        log(`繝輔ぃ繧､繝ｫ蜃ｦ逅・ ${filePath}`);
        const result: any = await processFile(filePath);
        // knowledge-base繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ縺吶〒縺ｫ逶ｴ謗･菫晏ｭ倥＆繧後※縺・ｋ縺溘ａ縲√さ繝斐・荳崎ｦ・
        console.log(`繝輔ぃ繧､繝ｫ縺ｯknowledge-base繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ逶ｴ謗･蜃ｦ逅・＆繧後∪縺励◆: ${result.filePath}`);
        // 蜈・・繧｢繝・・繝ｭ繝ｼ繝峨ヵ繧｡繧､繝ｫ繧貞炎髯､・医ョ繝ｼ繧ｿ謚ｽ蜃ｺ縺ｨJSON逕滓・縺悟ｮ御ｺ・＠縺溘◆繧・ｼ・
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`蜈・・繧｢繝・・繝ｭ繝ｼ繝峨ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
            }
        }
        catch (cleanupError) {
            console.error(`繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ: ${cleanupError}`);
            // 繝輔ぃ繧､繝ｫ蜑企勁縺ｫ螟ｱ謨励＠縺ｦ繧ょ・逅・・邯夊｡・
        }
        // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
        if (fs.existsSync(tempDir)) {
            cleanupTempDirectory(tempDir);
        }
        // 繝｡繝｢繝ｪ繧ｭ繝｣繝・す繝･縺後≠繧後・蜑企勁
        if (typeof global !== 'undefined' && global.fileCache) {
            delete global.fileCache[filePath];
        }
        return res.json({
            success: true,
            message: '繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ蜃ｦ逅・＆繧後∪縺励◆',
            guideId: result.id,
            data: result
        });
    }
    catch (error) {
        console.error('繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        });
    }
});
// 繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ荳隕ｧ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/list', (_req, res) => {
    try {
        console.log('繧ｬ繧､繝我ｸ隕ｧ繧貞叙蠕励＠縺ｾ縺・..');
        
        // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
        res.setHeader('Content-Type', 'application/json');
        
        // 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ蜿悶ｋ
        if (!fs.existsSync(jsonDir)) {
            return res.status(404).json({ error: '繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
        }
        // 繧ｭ繝｣繝・す繝･繝舌せ繝・ぅ繝ｳ繧ｰ縺ｮ縺溘ａ縺ｫ繝輔ぃ繧､繝ｫ荳隕ｧ繧貞・繧ｹ繧ｭ繝｣繝ｳ
        const allFiles: any = fs.readdirSync(jsonDir);
        console.log('蜈ｨ繝輔ぃ繧､繝ｫ荳隕ｧ:', allFiles);
        // 迚ｹ螳壹・繝輔ぃ繧､繝ｫ繧帝勁螟悶☆繧九◆繧√・繝悶Λ繝・け繝ｪ繧ｹ繝・
        const blacklist = ['guide_1744876404679_metadata.json'];
        // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ・医°縺､繝悶Λ繝・け繝ｪ繧ｹ繝医ｒ髯､螟厄ｼ・
        const files: any = allFiles
            .filter(file => file.endsWith('_metadata.json') && !blacklist.includes(file));
        console.log('繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ蠕後・繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ荳隕ｧ:', files);
        const guides: any = files.map(file => {
            try {
                const filePath: any = path.join(jsonDir, file);
                const content: any = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                const id: any = file.split('_')[0] + '_' + file.split('_')[1];
                return {
                    id,
                    filePath,
                    fileName: file,
                    title: data.metadata?.繧ｿ繧､繝医Ν || path.basename(file, '_metadata.json'),
                    createdAt: data.metadata?.菴懈・譌･ || new Date().toISOString(),
                    slideCount: Array.isArray(data.slides) ? data.slides.length : 0,
                    source: 'regular'
                };
            }
            catch (err) {
                console.error(`繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ: ${file}`, err);
                // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・譛菴朱剞縺ｮ諠・ｱ繧定ｿ斐☆
                const id: any = file.split('_')[0] + '_' + file.split('_')[1];
                return {
                    id,
                    filePath: path.join(jsonDir, file),
                    fileName: `繧ｨ繝ｩ繝ｼ繝輔ぃ繧､繝ｫ_${id}`,
                    title: `繧ｨ繝ｩ繝ｼ繝輔ぃ繧､繝ｫ_${id}`,
                    createdAt: new Date().toISOString(),
                    slideCount: 0
                };
            }
        });
        // 繝ｪ繧ｹ繝亥叙蠕怜燕縺ｮ譛邨ら憾諷九メ繧ｧ繝・け・亥ｮ悟・縺ｫ繝輔ぃ繧､繝ｫ繧ｷ繧ｹ繝・Β縺ｨ蜷梧悄縺吶ｋ縺溘ａ・・
        console.log('蠢懈･繧ｬ繧､繝我ｸ隕ｧ繧偵Ξ繧ｹ繝昴Φ繧ｹ騾∽ｿ｡蜑阪↓譛邨よ､懆ｨｼ:');
        console.log('- JSON繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蜀・ｮｹ:', fs.readdirSync(jsonDir));
        console.log('- 霑泌唆縺吶ｋ繧ｬ繧､繝画焚:', guides.length);
        console.log('- 繧ｬ繧､繝迂D荳隕ｧ:', guides.map(g => g.id).join(', '));
        // 繝倥ャ繝繝ｼ縺ｮ霑ｽ蜉縺ｧ繧ｭ繝｣繝・す繝･繧堤┌蜉ｹ蛹・
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        // 繝ｬ繧ｹ繝昴Φ繧ｹ繧定ｿ斐☆
        res.json(guides);
    }
    catch (error) {
        console.error('繧ｬ繧､繝我ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繧ｬ繧､繝我ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});
// 迚ｹ螳壹・繧ｬ繧､繝芽ｩｳ邏ｰ繝・・繧ｿ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/detail/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺九←縺・°繧偵メ繧ｧ繝・け
        if (id.startsWith('ts_')) {
            // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ蜷・
            const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // 繝励Ξ繝輔ぅ繝・け繧ｹ繧貞炎髯､
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            const content: any = fs.readFileSync(filePath, 'utf8');
            const jsonData: any = JSON.parse(content);
            // 繝・・繧ｿ讒矩繧呈ｨ呎ｺ門喧
            const data = {
                metadata: jsonData.metadata || {
                    繧ｿ繧､繝医Ν: jsonData.title || tsId,
                    菴懈・閠・ '繧ｷ繧ｹ繝・Β',
                    菴懈・譌･: jsonData.createdAt || new Date().toISOString(),
                    菫ｮ豁｣譌･: new Date().toISOString(),
                    隱ｬ譏・ jsonData.description || '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ'
                },
                slides: jsonData.slides || []
            };
            // steps縺後≠繧後・縲《lides縺ｫ螟画鋤
            if (jsonData.steps && Array.isArray(jsonData.steps) && data.slides.length === 0) {
                data.slides = jsonData.steps.map((step, index) => ({
                    繧ｹ繝ｩ繧､繝臥分蜿ｷ: index + 1,
                    繧ｿ繧､繝医Ν: step.title || `繧ｹ繝・ャ繝・${index + 1}`,
                    譛ｬ譁・ [step.description || ''],
                    繝弱・繝・ step.note || '',
                    逕ｻ蜒上ユ繧ｭ繧ｹ繝・ step.imageUrl ? [{
                            逕ｻ蜒上ヱ繧ｹ: step.imageUrl,
                            繝・く繧ｹ繝・ step.imageCaption || ''
                        }] : []
                }));
            }
            res.json({
                id,
                filePath,
                fileName: path.basename(filePath),
                data,
                source: 'troubleshooting'
            });
        }
        else {
            // 騾壼ｸｸ縺ｮ繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ縺ｮ蝣ｴ蜷・
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            const content: any = fs.readFileSync(filePath, 'utf8');
            const data: any = JSON.parse(content);
            res.json({
                id,
                filePath,
                fileName: files[0],
                data,
                source: 'regular'
            });
        }
    }
    catch (error) {
        console.error('繧ｬ繧､繝芽ｩｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繧ｬ繧､繝芽ｩｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
    }
});
// 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧呈峩譁ｰ縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/update/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: '繝・・繧ｿ縺梧署萓帙＆繧後※縺・∪縺帙ｓ' });
        }
        // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺九←縺・°繧偵メ繧ｧ繝・け
        if (id.startsWith('ts_')) {
            // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ蜷・
            const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // 繝励Ξ繝輔ぅ繝・け繧ｹ繧貞炎髯､
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            // 蜈・・繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧
            const content: any = fs.readFileSync(filePath, 'utf8');
            const originalData: any = JSON.parse(content);
            // 蜈・ョ繝ｼ繧ｿ繧貞ｮ悟・縺ｫ鄂ｮ縺肴鋤縺医ｋ譁ｰ縺励＞繝・・繧ｿ繧呈ｧ狗ｯ・
            const updatedTsData = {
                id: originalData.id || tsId,
                title: data.metadata?.繧ｿ繧､繝医Ν || originalData.title || tsId,
                description: data.metadata?.隱ｬ譏・|| originalData.description || '',
                triggerKeywords: originalData.triggerKeywords || [],
                steps: [],
                updatedAt: new Date().toISOString()
            };
            // 繧ｹ繝ｩ繧､繝峨°繧峨せ繝・ャ繝励↓螳悟・螟画鋤
            if (data.slides && Array.isArray(data.slides)) {
                updatedTsData.steps = data.slides.map((slide, index) => ({
                    id: slide.id || `step${index + 1}`,
                    title: slide.繧ｿ繧､繝医Ν || `繧ｹ繝・ャ繝・${index + 1}`,
                    description: Array.isArray(slide.譛ｬ譁・ ? slide.譛ｬ譁・join('\n') : (slide.譛ｬ譁・|| ''),
                    message: Array.isArray(slide.譛ｬ譁・ ? slide.譛ｬ譁・join('\n') : (slide.譛ｬ譁・|| ''),
                    imageUrl: slide.imageUrl || '',
                    type: slide.type || 'step',
                    options: slide.options || []
                }));
            }
            else {
                // 譌｢蟄倥・繧ｹ繝・ャ繝玲ｧ矩繧剃ｿ晄戟
                updatedTsData.steps = originalData.steps || [];
            }
            // 譖ｴ譁ｰ譌･譎ゅｒ險ｭ螳・
            updatedTsData.updatedAt = new Date().toISOString();
            // 譌｢蟄倥ヵ繧｡繧､繝ｫ繧貞炎髯､縺励※縺九ｉ螳悟・縺ｫ譁ｰ縺励＞繝・・繧ｿ縺ｧ鄂ｮ縺肴鋤縺・
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // 譁ｰ縺励＞繝・・繧ｿ縺ｧ螳悟・荳頑嶌縺・
            fs.writeFileSync(filePath, JSON.stringify(updatedTsData, null, 2), 'utf8');
            // 騾壼ｸｸ縺ｮJSON縺ｨ縺励※繧ゆｿ晏ｭ假ｼ医ヰ繝・け繧｢繝・・・・
            if (data.metadata) {
                data.metadata.菫ｮ豁｣譌･ = new Date().toISOString();
            }
            // 繝｡繝｢繝ｪ繧ｭ繝｣繝・す繝･縺後≠繧後・蜑企勁
            if (typeof global !== 'undefined' && global.fileCache) {
                delete global.fileCache[filePath];
            }
            // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺ｮ蟇ｾ蠢懊☆繧九Γ繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧貞叙蠕・
            const guideFileName = `ts_${tsId}_metadata.json`;
            const guideFilePath: any = path.join(jsonDir, guideFileName);
            // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・譖ｴ譁ｰ
            if (fs.existsSync(guideFilePath)) {
                fs.writeFileSync(guideFilePath, JSON.stringify(data, null, 2));
            }
            res.json({
                success: true,
                message: '繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・・繧ｿ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆',
                id
            });
        }
        else {
            // 騾壼ｸｸ縺ｮ繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ縺ｮ蝣ｴ蜷・
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            // 譖ｴ譁ｰ譌･譎ゅｒ迴ｾ蝨ｨ縺ｮ譌･譎ゅ↓險ｭ螳・
            if (data.metadata) {
                data.metadata.菫ｮ豁｣譌･ = new Date().toISOString();
            }
            // 繝輔ぃ繧､繝ｫ縺ｫ譖ｸ縺崎ｾｼ縺ｿ
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.json({
                success: true,
                message: '繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆',
                id
            });
        }
    }
    catch (error) {
        console.error('繧ｬ繧､繝画峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繧ｬ繧､繝峨・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});
// 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧貞炎髯､縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.delete('/delete/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺九←縺・°繧偵メ繧ｧ繝・け
        if (id.startsWith('ts_')) {
            // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ縺ｮ蝣ｴ蜷・
            const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // 繝励Ξ繝輔ぅ繝・け繧ｹ繧貞炎髯､
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (fs.existsSync(filePath)) {
                // 繝輔ぃ繧､繝ｫ繧貞炎髯､
                fs.unlinkSync(filePath);
                console.log(`繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
            }
            // 蟇ｾ蠢懊☆繧九Γ繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧ょ炎髯､
            const guideFileName = `ts_${tsId}_metadata.json`;
            const guideFilePath: any = path.join(jsonDir, guideFileName);
            if (fs.existsSync(guideFilePath)) {
                fs.unlinkSync(guideFilePath);
                console.log(`繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${guideFilePath}`);
            }
        }
        else {
            // 騾壼ｸｸ縺ｮ繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ縺ｮ蝣ｴ蜷・
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            if (fs.existsSync(filePath)) {
                // 繝輔ぃ繧､繝ｫ繧貞炎髯､
                fs.unlinkSync(filePath);
                console.log(`繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
            }
        }
        res.json({
            success: true,
            message: '繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺悟炎髯､縺輔ｌ縺ｾ縺励◆',
            id
        });
    }
    catch (error) {
        console.error('繧ｬ繧､繝牙炎髯､繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繧ｬ繧､繝峨・蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});
// 繝√Ε繝・ヨ縺ｫ蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ｒ騾∽ｿ｡縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/send-to-chat/:guideId/:chatId', async (req, res) => {
    try {
        const { guideId, chatId } = req.params;
        // 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧貞叙蠕・
        const files: any = fs.readdirSync(jsonDir)
            .filter(file => file.startsWith(guideId) && file.endsWith('_metadata.json'));
        if (files.length === 0) {
            return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
        }
        const filePath: any = path.join(jsonDir, files[0]);
        const content: any = fs.readFileSync(filePath, 'utf8');
        const guideData: any = JSON.parse(content);
        // 繝√Ε繝・ヨ縺ｫ繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡縺吶ｋAPI繧貞他縺ｳ蜃ｺ縺・
        const response: any = await fetch(`http://localhost:${process.env.PORT || 3000}/api/chats/${chatId}/messages/system`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縲・{guideData.metadata.繧ｿ繧､繝医Ν}縲阪′蜈ｱ譛峨＆繧後∪縺励◆縲・n\n${guideData.metadata.隱ｬ譏枝`,
                isUserMessage: false
            })
        });
        if (!response.ok) {
            throw new Error('繝√Ε繝・ヨ縺ｸ縺ｮ繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
        }
        const result: any = await response.json();
        res.json({
            success: true,
            message: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺後メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺輔ｌ縺ｾ縺励◆',
            messageId: result.id
        });
    }
    catch (error) {
        console.error('繝輔Ο繝ｼ騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ繝√Ε繝・ヨ縺ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
    }
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢繧定ｿｽ蜉
router.use((err: any, req: any, res: any, next: any) => {
  console.error('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨お繝ｩ繝ｼ:', err);
  
  // Content-Type繧呈・遉ｺ逧・↓險ｭ螳・
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404繝上Φ繝峨Μ繝ｳ繧ｰ
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;
