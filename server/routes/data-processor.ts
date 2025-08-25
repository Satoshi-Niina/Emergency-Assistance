import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { log } from '../vite.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { addDocumentToKnowledgeBase, mergeDocumentContent, backupKnowledgeBase, loadKnowledgeBaseIndex } from '../lib/knowledge-base.js';
import { processDocument } from '../lib/document-processor.js';

// ESM蟇ｾ蠢懊・ __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄舌°繧峨ラ繧ｭ繝･繝｡繝ｳ繝医ち繧､繝励ｒ蜿門ｾ励☆繧九・繝ｫ繝代・髢｢謨ｰ
function getFileTypeFromExtension(ext) {
    const extMap = {
        '.pdf': 'pdf',
        '.docx': 'word',
        '.doc': 'word',
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.pptx': 'powerpoint',
        '.ppt': 'powerpoint',
        '.txt': 'text'
    };
    return extMap[ext] || 'unknown';
}
// 繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄舌°繧画怙驕ｩ縺ｪ蜃ｦ逅・ち繧､繝励ｒ豎ｺ螳壹☆繧九・繝ｫ繝代・髢｢謨ｰ
function determineOptimalProcessingTypes(ext: any, filename) {
    ext = ext.toLowerCase();
    filename = filename.toLowerCase();
    // 蝓ｺ譛ｬ險ｭ螳夲ｼ医☆縺ｹ縺ｦ譛牙柑・・
    const result = {
        forKnowledgeBase: true,
        forImageSearch: true,
        forQA: true,
        forEmergencyGuide: true
    };
    // 繝輔ぃ繧､繝ｫ蜷阪↓迚ｹ螳壹・繧ｭ繝ｼ繝ｯ繝ｼ繝峨′蜷ｫ縺ｾ繧後※縺・ｋ蝣ｴ蜷医∝ｿ懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙髄縺代↓蜆ｪ蜈・
    if (filename.includes('蠢懈･') ||
        filename.includes('emergency') ||
        filename.includes('guide') ||
        filename.includes('繧ｬ繧､繝・) ||
        filename.includes('謇矩・) ||
        filename.includes('procedure')) {
        result.forEmergencyGuide = true;
    }
    // 諡｡蠑ｵ蟄舌↓繧医ｋ隱ｿ謨ｴ
    switch (ext) {
        case '.pdf':
        case '.docx':
        case '.doc':
        case '.txt':
            // 繝・く繧ｹ繝亥ｽ｢蠑上・繝峨く繝･繝｡繝ｳ繝医・繝翫Ξ繝・ず繝吶・繧ｹ縺ｨQ&A縺ｫ譛驕ｩ
            result.forKnowledgeBase = true;
            result.forQA = true;
            result.forImageSearch = false; // 逕ｻ蜒上・縺ゅ∪繧企㍾隕√〒縺ｯ縺ｪ縺・庄閭ｽ諤ｧ
            break;
        case '.pptx':
        case '.ppt':
            // 繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ縺ｯ逕ｻ蜒乗､懃ｴ｢縺ｨ蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨↓譛驕ｩ
            result.forImageSearch = true;
            result.forEmergencyGuide = true;
            break;
        case '.xlsx':
        case '.xls':
            // 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医・繝・・繧ｿ荳ｻ菴薙↑縺ｮ縺ｧ繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ譛驕ｩ
            result.forKnowledgeBase = true;
            result.forImageSearch = false;
            break;
    }
    return result;
}
// 繧ｹ繝医Ξ繝ｼ繧ｸ險ｭ螳・- knowledge-base縺ｫ荳蜈・喧
const storage: any = multer.diskStorage({
    destination: (req, file, cb) => {
        // 荳譎ゆｿ晏ｭ倥ョ繧｣繝ｬ繧ｯ繝医Μ縺ｯknowledge-base蜀・↓驟咲ｽｮ
const tempDir: any = path.join(process.cwd(), 'knowledge-base/temp');
        // 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蟄伜惠繧堤｢ｺ隱阪＠縲√↑縺・ｴ蜷医・菴懈・
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // 繝輔ぃ繧､繝ｫ蜷阪↓迴ｾ蝨ｨ譎ょ綾縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ霑ｽ蜉縺励※荳諢上↓縺吶ｋ
        const timestamp: any = Date.now();
        // 譁・ｭ怜喧縺大ｯｾ遲厄ｼ嗟atin1縺九ｉUTF-8縺ｫ繝・さ繝ｼ繝・
        const decodedOriginalName: any = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const originalExt: any = path.extname(decodedOriginalName);
        // 繧ｵ繝九ち繧､繧ｺ縺輔ｌ縺溘ヵ繧｡繧､繝ｫ蜷阪ｒ逕滓・
        const baseName: any = path.basename(decodedOriginalName, originalExt)
            .replace(/[\/\\:*?"<>|]/g, '')
            .replace(/\s+/g, '_');
        const filename = `${baseName}_${timestamp}${originalExt}`;
        cb(null, filename);
    }
});
// 繧｢繝・・繝ｭ繝ｼ繝芽ｨｭ螳・
const upload: any = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB蛻ｶ髯・
    }
});
// 邨ｱ蜷医ョ繝ｼ繧ｿ蜃ｦ逅・PI繝ｫ繝ｼ繝医ｒ逋ｻ骭ｲ
export function registerDataProcessorRoutes(app) {
    // 邨ｱ蜷医ョ繝ｼ繧ｿ蜃ｦ逅・PI
    app.post('/api/data-processor/process', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ' });
            }
            const filePath: any = req.file.path;
            const originalName: any = req.file.originalname;
            const fileExt: any = path.extname(originalName).toLowerCase();
            // 蜈・ヵ繧｡繧､繝ｫ菫晏ｭ倥が繝励す繝ｧ繝ｳ縺ｮ縺ｿ繝ｦ繝ｼ繧ｶ繝ｼ縺九ｉ蜿門ｾ・
            const keepOriginalFile: any = req.body.keepOriginalFile === 'true';
            // 莉悶・蜃ｦ逅・が繝励す繝ｧ繝ｳ縺ｯ繝輔ぃ繧､繝ｫ繧ｿ繧､繝励°繧芽・蜍墓ｱｺ螳・
            const processingTypes: any = determineOptimalProcessingTypes(fileExt, originalName);
            const extractKnowledgeBase: any = processingTypes.forKnowledgeBase;
            const extractImageSearch: any = processingTypes.forImageSearch;
            const createQA: any = processingTypes.forQA;
            const createEmergencyGuide: any = processingTypes.forEmergencyGuide;
            log(`繝・・繧ｿ蜃ｦ逅・ｒ髢句ｧ九＠縺ｾ縺・ ${originalName}`);
            log(`閾ｪ蜍墓ｱｺ螳壹＆繧後◆繧ｪ繝励す繝ｧ繝ｳ: 蜈・ヵ繧｡繧､繝ｫ菫晏ｭ・${keepOriginalFile}, 繝翫Ξ繝・ず繝吶・繧ｹ=${extractKnowledgeBase}, 逕ｻ蜒乗､懃ｴ｢=${extractImageSearch}, Q&A=${createQA}, 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・${createEmergencyGuide}`);
            // 1. 繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉・医ユ繧ｭ繧ｹ繝域歓蜃ｺ縺ｨ繝√Ε繝ｳ繧ｯ逕滓・・・
            let docId = '';
            let processedDocument = null;
            // 蠢・★繝峨く繝･繝｡繝ｳ繝医・蜃ｦ逅・・陦後≧・亥ｾ後・蜃ｦ逅・〒蠢・ｦ・ｼ・
            processedDocument = await processDocument(filePath);
            
            // processedDocument縺ｮ讒矩繧呈ｨ呎ｺ門喧
            const standardizedDocument = {
                ...processedDocument,
                chunks: processedDocument.chunks || [],
                images: processedDocument.images || [],
                text: processedDocument.content || processedDocument.text || '',
                fileName: processedDocument.fileName || path.basename(filePath)
            };
            
            if (extractKnowledgeBase) {
                // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉
                const result: any = await addDocumentToKnowledgeBase({ originalname: path.basename(filePath), path: filePath, mimetype: 'text/plain' }, fs.readFileSync(filePath, 'utf-8'));
                docId = result.success ? result.docId : '';
                log(`繝翫Ξ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺励∪縺励◆: ${docId}`);
            }
            else if (extractImageSearch || createQA) {
                // 逕ｻ蜒乗､懃ｴ｢繧Р&A縺ｮ縺ｿ縺ｮ蝣ｴ蜷医〒繧ゅ√ラ繧ｭ繝･繝｡繝ｳ繝・D繧堤函謌舌＠縺ｦ譁・嶌荳隕ｧ縺ｫ陦ｨ遉ｺ縺輔ｌ繧九ｈ縺・↓縺吶ｋ
                const timestamp: any = Date.now();
                const filename: any = path.basename(filePath);
                const fileExt: any = path.extname(filename).toLowerCase();
                const fileType: any = getFileTypeFromExtension(fileExt);
                // 繝ｦ繝九・繧ｯ縺ｪID繧堤函謌・
                docId = `doc_${timestamp}_${Math.floor(Math.random() * 1000)}`;
                // 繝翫Ξ繝・ず繝吶・繧ｹ繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ霑ｽ蜉
                const index: any = loadKnowledgeBaseIndex();
                // documents驟榊・縺悟ｭ伜惠縺励↑縺・ｴ蜷医・蛻晄悄蛹・
                if (!index.documents) {
                    index.documents = [];
                }
                index.documents.push({
                    id: docId,
                    title: filename,
                    path: filePath,
                    type: fileType,
                    chunkCount: standardizedDocument.chunks.length, // 讓呎ｺ門喧縺輔ｌ縺溘ラ繧ｭ繝･繝｡繝ｳ繝医ｒ菴ｿ逕ｨ
                    addedAt: new Date().toISOString()
                });
                // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
                const indexPath: any = path.join(process.cwd(), 'knowledge-base/index.json');
                fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
                log(`逕ｻ蜒乗､懃ｴ｢/Q&A蟆ら畑繝峨く繝･繝｡繝ｳ繝医→縺励※霑ｽ蜉: ${docId}`);
            }
            // 2. 逕ｻ蜒乗､懃ｴ｢逕ｨ繝・・繧ｿ縺ｮ逕滓・・育判蜒上・謚ｽ蜃ｺ縺ｨ繝｡繧ｿ繝・・繧ｿ逕滓・・・
            if (extractImageSearch) {
                // 讓呎ｺ門喧縺輔ｌ縺溘ラ繧ｭ繝･繝｡繝ｳ繝医ｒ菴ｿ逕ｨ
                if (standardizedDocument) {
                    // 蠢・ｦ√↓蠢懊§縺ｦ逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｫ繧｢繧､繝・Β繧定ｿｽ蜉
                    // 謌仙粥繝｡繝・そ繝ｼ繧ｸ縺ｫ縺ｯ縺薙・蜃ｦ逅・ｵ先棡繧貞性繧√ｋ
                    log(`逕ｻ蜒乗､懃ｴ｢逕ｨ繝・・繧ｿ繧堤函謌舌＠縺ｾ縺励◆: ${standardizedDocument.chunks.length}繝√Ε繝ｳ繧ｯ`);
                }
            }
            // 3. Q&A逕ｨ縺ｮ蜃ｦ逅・
            if (createQA) {
                try {
                    // OpenAI繝｢繧ｸ繝･繝ｼ繝ｫ繧堤峩謗･繧､繝ｳ繝昴・繝・
                    const openaiModule: any = await import('../lib/openai.js');
                    const generateQAPairs: any = openaiModule.generateQAPairs;
                    // QA繝壹い縺ｮ蛻晄悄蛹・
                    let qaPairs = [];
                    // 讓呎ｺ門喧縺輔ｌ縺溘ラ繧ｭ繝･繝｡繝ｳ繝医ｒ菴ｿ逕ｨ
                    if (standardizedDocument) {
                        // 譛ｬ譁・ユ繧ｭ繧ｹ繝医ｒ蜿門ｾ・
                        const fullText: any = standardizedDocument.chunks.length > 0 
                            ? standardizedDocument.chunks.map(chunk => chunk.text).join("\n")
                            : standardizedDocument.text;
                        log(`Q&A逕滓・逕ｨ縺ｮ繝・く繧ｹ繝域ｺ門ｙ螳御ｺ・ ${fullText.length}譁・ｭ輿);
                        // Q&A繝壹い繧堤函謌・
                        qaPairs = await generateQAPairs(fullText, 10);
                        log(`${qaPairs.length}蛟九・Q&A繝壹い繧堤函謌舌＠縺ｾ縺励◆`);
                        // 邨先棡繧剃ｿ晏ｭ・
                        const qaDir: any = path.join(process.cwd(), 'knowledge-base/qa');
                        if (!fs.existsSync(qaDir)) {
                            fs.mkdirSync(qaDir, { recursive: true });
                        }
                        // 繝輔ぃ繧､繝ｫ蜷阪°繧峨ち繧､繝繧ｹ繧ｿ繝ｳ繝嶺ｻ倥″縺ｮJSON繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
                        const fileName: any = path.basename(filePath, path.extname(filePath));
                        const timestamp: any = Date.now();
                        const qaFileName = `${fileName}_qa_${timestamp}.json`;
                        // Q&A繝壹い繧谷SON繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
                        fs.writeFileSync(path.join(qaDir, qaFileName), JSON.stringify({
                            source: filePath,
                            fileName: path.basename(filePath),
                            timestamp: new Date().toISOString(),
                            qaPairs
                        }, null, 2));
                        log(`Q&A繝・・繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${qaFileName}`);
                    }
                    else {
                        throw new Error('Q&A逕滓・縺ｮ縺溘ａ縺ｮ繝峨く繝･繝｡繝ｳ繝亥・逅・′螳御ｺ・＠縺ｦ縺・∪縺帙ｓ');
                    }
                }
                catch (qaError) {
                    log(`Q&A逕滓・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${qaError}`);
                    // Q&A逕滓・繧ｨ繝ｩ繝ｼ縺ｯ蜃ｦ逅・ｒ邯咏ｶ・
                }
            }
            // 4. 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥畑縺ｮ蜃ｦ逅・
            if (createEmergencyGuide) {
                try {
                    log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥畑縺ｫ蜃ｦ逅・ｒ髢句ｧ九＠縺ｾ縺・ ${originalName}`);
                    // 讓呎ｺ門喧縺輔ｌ縺溘ラ繧ｭ繝･繝｡繝ｳ繝医ｒ菴ｿ逕ｨ
                    if (standardizedDocument) {
                        // 繝峨く繝･繝｡繝ｳ繝医°繧画歓蜃ｺ縺輔ｌ縺溽判蜒上′縺ゅｋ蝣ｴ蜷・
                        if (standardizedDocument.images && standardizedDocument.images.length > 0) {
                            // 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥畑縺ｮ繝・ぅ繝ｬ繧ｯ繝医Μ險ｭ螳・
                            const guidesDir: any = path.join(process.cwd(), 'knowledge-base/troubleshooting');
                            if (!fs.existsSync(guidesDir)) {
                                fs.mkdirSync(guidesDir, { recursive: true });
                            }
                            // 繝峨く繝･繝｡繝ｳ繝亥錐繧偵・繝ｼ繧ｹ縺ｫ繧ｬ繧､繝迂D繧堤函謌・
                            const timestamp: any = Date.now();
                            const baseName: any = path.basename(filePath, path.extname(filePath))
                                .replace(/[\/\\:*?"<>|]/g, '')
                                .replace(/\s+/g, '_');
                            const guideId = `guide_${timestamp}`;
                            // 邁｡譏鍋噪縺ｪ繧ｬ繧､繝画ｧ矩繧剃ｽ懈・
                            const guideData = {
                                id: guideId,
                                title: originalName.split('.')[0] || '繧ｬ繧､繝・,
                                createdAt: new Date().toISOString(),
                                steps: standardizedDocument.images.map((image, index) => {
                                    // 蜷・判蜒上ｒ繧ｹ繝・ャ繝励→縺励※逋ｻ骭ｲ
                                    return {
                                        id: `${guideId}_step${index + 1}`,
                                        title: `繧ｹ繝・ャ繝・${index + 1}`,
                                        description: image.alt || `謇矩・ｪｬ譏・${index + 1}`,
                                        imageUrl: image.path ? `/knowledge-base/${image.path.split('/knowledge-base/')[1] || image.path}` : '',
                                        order: index + 1
                                    };
                                })
                            };
                            // 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・JSON繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
                            const guideFilePath: any = path.join(guidesDir, `${baseName}_${timestamp}.json`);
                            fs.writeFileSync(guideFilePath, JSON.stringify(guideData, null, 2));
                            log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ｒ菴懈・縺励∪縺励◆: ${guideFilePath} (${guideData.steps.length}繧ｹ繝・ャ繝・`);
                            // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧ゆｿ晏ｭ・
                            const jsonDir: any = path.join(process.cwd(), 'knowledge-base/json');
                            if (!fs.existsSync(jsonDir)) {
                                fs.mkdirSync(jsonDir, { recursive: true });
                            }
                            const metadataFilePath: any = path.join(jsonDir, `${guideId}_metadata.json`);
                            fs.writeFileSync(metadataFilePath, JSON.stringify({
                                id: guideId,
                                title: originalName.split('.')[0] || '繧ｬ繧､繝・,
                                createdAt: new Date().toISOString(),
                                slides: guideData.steps.map((step, idx) => ({
                                    slideId: `slide${idx + 1}`,
                                    title: step.title,
                                    content: step.description,
                                    imageUrl: step.imageUrl,
                                    order: step.order
                                }))
                            }, null, 2));
                            log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・繝｡繧ｿ繝・・繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${metadataFilePath}`);
                        }
                        else {
                            log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝我ｽ懈・縺ｫ蠢・ｦ√↑逕ｻ蜒上′繝峨く繝･繝｡繝ｳ繝医°繧画歓蜃ｺ縺輔ｌ縺ｾ縺帙ｓ縺ｧ縺励◆`);
                        }
                    }
                    else {
                        log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥函謌舌・縺溘ａ縺ｮ繝峨く繝･繝｡繝ｳ繝亥・逅・′螳御ｺ・＠縺ｦ縺・∪縺帙ｓ`);
                    }
                }
                catch (guideError) {
                    log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥函謌蝉ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${guideError}`);
                    // 繧ｬ繧､繝臥函謌舌お繝ｩ繝ｼ縺ｯ蜃ｦ逅・ｒ邯咏ｶ・
                }
            }
            // 4. 蜃ｦ逅・′螳御ｺ・＠縺溘ｉ縲∝・縺ｮ繝輔ぃ繧､繝ｫ繧貞炎髯､縺吶ｋ縺倶ｿ晏ｭ倥☆繧九°縺ｮ謖・ｮ壹↓繧医ｊ蛻・ｲ・
            if (!keepOriginalFile) {
                try {
                    // 蜈・・繝輔ぃ繧､繝ｫ繧貞炎髯､
                    fs.unlinkSync(filePath);
                    log(`蜈・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
                }
                catch (deleteError) {
                    log(`蜈・ヵ繧｡繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${deleteError}`);
                    // 蜑企勁螟ｱ謨励・繧ｨ繝ｩ繝ｼ縺ｫ縺ｯ縺励↑縺・
                }
            }
            else {
                log(`蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥＠縺ｾ縺・ ${filePath}`);
            }
            // 蜃ｦ逅・・蜉溘Ξ繧ｹ繝昴Φ繧ｹ
            return res.status(200).json({
                success: true,
                docId,
                message: '蜃ｦ逅・′螳御ｺ・＠縺ｾ縺励◆',
                options: {
                    keepOriginalFile,
                    extractKnowledgeBase,
                    extractImageSearch,
                    createQA,
                    createEmergencyGuide
                }
            });
        }
        catch (error) {
            console.error('繝・・繧ｿ蜃ｦ逅・お繝ｩ繝ｼ:', error);
            
            // 繧医ｊ隧ｳ邏ｰ縺ｪ繧ｨ繝ｩ繝ｼ諠・ｱ繧呈署萓・
            let errorMessage = '蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆';
            let errorDetails = error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・;
            
            // 迚ｹ螳壹・繧ｨ繝ｩ繝ｼ繝代ち繝ｼ繝ｳ繧呈､懷・
            if (errorDetails.includes('Cannot read properties of undefined')) {
                errorMessage = '繝輔ぃ繧､繝ｫ蜃ｦ逅・ｸｭ縺ｫ繝・・繧ｿ讒矩繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆';
                errorDetails = '繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧呈ｭ｣縺励￥隗｣譫舌〒縺阪∪縺帙ｓ縺ｧ縺励◆縲ゅヵ繧｡繧､繝ｫ縺檎ｴ謳阪＠縺ｦ縺・ｋ蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺吶・;
            } else if (errorDetails.includes('ENOENT') || errorDetails.includes('no such file')) {
                errorMessage = '繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ';
                errorDetails = '繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆繝輔ぃ繧､繝ｫ縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
            } else if (errorDetails.includes('adm-zip') || errorDetails.includes('AdmZip')) {
                errorMessage = '繝輔ぃ繧､繝ｫ縺ｮ隗｣蜃阪↓螟ｱ謨励＠縺ｾ縺励◆';
                errorDetails = '繝輔ぃ繧､繝ｫ縺檎ｴ謳阪＠縺ｦ縺・ｋ縺九√し繝昴・繝医＆繧後※縺・↑縺・ｽ｢蠑上〒縺吶・;
            }
            
            return res.status(500).json({
                error: errorMessage,
                message: errorDetails,
                timestamp: new Date().toISOString()
            });
        }
    });
    // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蛻晄悄蛹泡PI・域里蟄倥・繧ゅ・・・
    app.post('/api/data-processor/init-image-search', async (req, res) => {
        try {
            // 譌｢蟄倥・蛻晄悄蛹泡PI繧貞他縺ｳ蜃ｺ縺・
            const initResponse: any = await fetch('http://localhost:5000/api/tech-support/init-image-search-data', {
                method: 'POST'
            });
            if (!initResponse.ok) {
                throw new Error('逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆');
            }
            const data: any = await initResponse.json();
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
            return res.status(500).json({
                error: '蛻晄悄蛹紋ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
                message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・
            });
        }
    });
    // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ蟾ｮ蛻・峩譁ｰAPI
    app.post('/api/data-processor/merge', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ' });
            }
            const { targetDocId } = req.body;
            if (!targetDocId) {
                return res.status(400).json({ error: '譖ｴ譁ｰ蟇ｾ雎｡縺ｮ繝峨く繝･繝｡繝ｳ繝・D縺梧欠螳壹＆繧後※縺・∪縺帙ｓ' });
            }
            log(`蟾ｮ蛻・峩譁ｰ繧帝幕蟋九＠縺ｾ縺・ 繧ｿ繝ｼ繧ｲ繝・ヨID=${targetDocId}, 繝輔ぃ繧､繝ｫ=${req.file.originalname}`);
            // 譁ｰ縺励＞繝輔ぃ繧､繝ｫ繧貞・逅・
            const filePath: any = req.file.path;
            const newDocument: any = await processDocument(filePath);
            // 蟾ｮ蛻・峩譁ｰ繧貞ｮ溯｡・
            const mergedContent: any = mergeDocumentContent([JSON.stringify(newDocument)]);
            // 蜈・ヵ繧｡繧､繝ｫ繧貞炎髯､
            try {
                fs.unlinkSync(filePath);
                log(`蜈・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
            }
            catch (deleteError) {
                log(`蜈・ヵ繧｡繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${deleteError}`);
            }
            return res.status(200).json({
                success: true,
                message: '蟾ｮ蛻・峩譁ｰ縺悟ｮ御ｺ・＠縺ｾ縺励◆',
                targetDocId
            });
        }
        catch (error) {
            console.error('蟾ｮ蛻・峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
            return res.status(500).json({
                error: '蟾ｮ蛻・峩譁ｰ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
                message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・
            });
        }
    });
    // 繝翫Ξ繝・ず繝吶・繧ｹ譁・嶌荳隕ｧ蜿門ｾ輸PI
    app.get('/api/data-processor/documents', (req, res) => {
        try {
            const index: any = loadKnowledgeBaseIndex();
            return res.status(200).json({
                success: true,
                documents: index.documents.map((doc) => ({
                    id: doc.id,
                    title: doc.title,
                    type: doc.type,
                    chunkCount: doc.chunkCount,
                    addedAt: doc.addedAt
                }))
            });
        }
        catch (error) {
            console.error('繝峨く繝･繝｡繝ｳ繝井ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
            return res.status(500).json({
                error: '繝峨く繝･繝｡繝ｳ繝井ｸ隕ｧ蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
                message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・
            });
        }
    });
    // 繝翫Ξ繝・ず繝吶・繧ｹ繝舌ャ繧ｯ繧｢繝・・API
    app.post('/api/data-processor/backup', async (req, res) => {
        try {
            const { docIds } = req.body;
            if (!Array.isArray(docIds)) {
                return res.status(400).json({ error: '繝峨く繝･繝｡繝ｳ繝・D縺ｮ繝ｪ繧ｹ繝医′蠢・ｦ√〒縺・ });
            }
            log(`繝舌ャ繧ｯ繧｢繝・・菴懈・髢句ｧ・ ${docIds.length}蛟九・繝峨く繝･繝｡繝ｳ繝・);
            const zipFilePath: any = await backupKnowledgeBase();
            // 逶ｸ蟇ｾ繝代せ繧定ｿ斐☆
            const relativePath: any = path.relative(__dirname, zipFilePath.backupPath || '');
            return res.status(200).json({
                success: true,
                backupPath: relativePath,
                message: '繝舌ャ繧ｯ繧｢繝・・縺御ｽ懈・縺輔ｌ縺ｾ縺励◆'
            });
        }
        catch (error) {
            console.error('繝舌ャ繧ｯ繧｢繝・・繧ｨ繝ｩ繝ｼ:', error);
            return res.status(500).json({
                error: '繝舌ャ繧ｯ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
                message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・
            });
        }
    });
    // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺ｮ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
    app.get('/api/data-processor/download-backup/:filename', (req, res) => {
        try {
            const { filename } = req.params;
            const backupDir: any = path.join(process.cwd(), 'knowledge-base/backups');
            const filePath: any = path.join(backupDir, filename);
            // 繝代せ縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ・医ョ繧｣繝ｬ繧ｯ繝医Μ繝医Λ繝舌・繧ｵ繝ｫ蟇ｾ遲厄ｼ・
            if (!filePath.startsWith(backupDir) || filePath.includes('..')) {
                return res.status(400).json({ error: '荳肴ｭ｣縺ｪ繝輔ぃ繧､繝ｫ繝代せ縺ｧ縺・ });
            }
            // 繝輔ぃ繧､繝ｫ縺ｮ蟄伜惠遒ｺ隱・
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: '繝輔ぃ繧､繝ｫ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
            }
            // 繝輔ぃ繧､繝ｫ縺ｮ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
            return res.download(filePath);
        }
        catch (error) {
            console.error('繝舌ャ繧ｯ繧｢繝・・繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
            return res.status(500).json({
                error: '繝繧ｦ繝ｳ繝ｭ繝ｼ繝我ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
                message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺ｧ縺・
            });
        }
    });
}
