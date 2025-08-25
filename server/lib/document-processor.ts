import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';
import AdmZip from 'adm-zip';
import * as fsSync from 'fs';

export class DocumentProcessor {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    async processDocument(filePath: string): Promise<any> {
        try {
            const fileName = path.basename(filePath);
            const fileExt = path.extname(filePath).toLowerCase();
            
            let content = '';
            let chunks: any[] = [];
            let images: any[] = [];
            
            // 繝輔ぃ繧､繝ｫ蠖｢蠑上↓蠢懊§縺溷・逅・
            switch (fileExt) {
                case '.txt':
                    content = await fs.readFile(filePath, 'utf-8');
                    chunks = this.createChunks(content, fileName);
                    break;
                    
                case '.pdf':
                    // PDF縺ｮ蝣ｴ蜷医・繝・く繧ｹ繝域歓蜃ｺ繧定ｩｦ陦鯉ｼ育ｰ｡譏灘ｮ溯｣・ｼ・
                    try {
                        content = await fs.readFile(filePath, 'utf-8');
                    } catch {
                        content = 'PDF繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧定ｪｭ縺ｿ蜿悶ｌ縺ｾ縺帙ｓ縺ｧ縺励◆縲・;
                    }
                    chunks = this.createChunks(content, fileName);
                    break;
                    
                case '.docx':
                    content = await this.extractWordText(filePath);
                    chunks = this.createChunks(content, fileName);
                    break;
                    
                case '.xlsx':
                    content = await this.extractExcelText(filePath);
                    chunks = this.createChunks(content, fileName);
                    break;
                    
                case '.pptx':
                    const pptxResult = await this.extractPptxText(filePath);
                    content = pptxResult.text;
                    chunks = this.createChunks(content, fileName);
                    images = pptxResult.images;
                    break;
                    
                default:
                    // 縺昴・莉悶・繝輔ぃ繧､繝ｫ蠖｢蠑・
                    try {
                        content = await fs.readFile(filePath, 'utf-8');
                    } catch {
                        content = '繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧定ｪｭ縺ｿ蜿悶ｌ縺ｾ縺帙ｓ縺ｧ縺励◆縲・;
                    }
                    chunks = this.createChunks(content, fileName);
                    break;
            }
            
            // 繝峨く繝･繝｡繝ｳ繝医・蜀・ｮｹ繧貞・譫・
            const analysis = await this.analyzeDocument(content);
            
            return {
                fileName,
                content,
                text: content,
                chunks,
                images,
                analysis,
                processedAt: new Date()
            };
        } catch (error) {
            console.error('繝峨く繝･繝｡繝ｳ繝亥・逅・お繝ｩ繝ｼ:', error);
            // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医〒繧ょ渕譛ｬ逧・↑讒矩繧定ｿ斐☆
            return {
                fileName: path.basename(filePath),
                content: '繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
                text: '繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
                chunks: [],
                images: [],
                analysis: {
                    summary: '蜃ｦ逅・お繝ｩ繝ｼ縺ｫ繧医ｊ蛻・梵縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆',
                    keywords: []
                },
                processedAt: new Date()
            };
        }
    }

    private createChunks(content: string, fileName: string): any[] {
        // 謾ｹ蝟・＆繧後◆繝√Ε繝ｳ繧ｯ蛹門ｮ溯｣・
        const chunks = [];
        
        // 1. 谿ｵ關ｽ蛻・牡繧定ｩｦ陦・
        const paragraphs = content.split(/\n\s*\n/);
        
        if (paragraphs.length > 1) {
            // 谿ｵ關ｽ縺後≠繧句ｴ蜷医・谿ｵ關ｽ蜊倅ｽ阪〒繝√Ε繝ｳ繧ｯ蛹・
            paragraphs.forEach((paragraph, index) => {
                const trimmedParagraph = paragraph.trim();
                if (trimmedParagraph.length === 0) return;
                
                // 谿ｵ關ｽ縺碁聞縺吶℃繧句ｴ蜷医・縺輔ｉ縺ｫ蛻・牡
                if (trimmedParagraph.length > 2000) {
                    const subChunks = this.splitLongParagraph(trimmedParagraph);
                    subChunks.forEach((subChunk, subIndex) => {
                        chunks.push({
                            id: `${fileName}_chunk_${chunks.length + 1}`,
                            text: subChunk,
                            order: chunks.length + 1,
                            type: 'paragraph',
                            metadata: {
                                originalParagraph: index + 1,
                                subChunk: subIndex + 1
                            }
                        });
                    });
                } else {
                    chunks.push({
                        id: `${fileName}_chunk_${chunks.length + 1}`,
                        text: trimmedParagraph,
                        order: chunks.length + 1,
                        type: 'paragraph',
                        metadata: {
                            originalParagraph: index + 1
                        }
                    });
                }
            });
        } else {
            // 谿ｵ關ｽ縺後↑縺・ｴ蜷医・蝗ｺ螳壹し繧､繧ｺ縺ｧ蛻・牡
            const chunkSize = 1000;
            for (let i = 0; i < content.length; i += chunkSize) {
                const chunk = content.slice(i, i + chunkSize);
                chunks.push({
                    id: `${fileName}_chunk_${chunks.length + 1}`,
                    text: chunk,
                    order: chunks.length + 1,
                    type: 'fixed-size',
                    metadata: {
                        startPosition: i,
                        endPosition: Math.min(i + chunkSize, content.length)
                    }
                });
            }
        }
        
        // 繝√Ε繝ｳ繧ｯ縺ｮ蜩∬ｳｪ繝√ぉ繝・け縺ｨ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const filteredChunks = chunks.filter(chunk => {
            // 遨ｺ縺ｮ繝√Ε繝ｳ繧ｯ繧帝勁螟・
            if (chunk.text.trim().length === 0) return false;
            
            // 遏ｭ縺吶℃繧九メ繝｣繝ｳ繧ｯ繧帝勁螟厄ｼ・0譁・ｭ玲悴貅・・
            if (chunk.text.trim().length < 50) return false;
            
            // 迚ｹ谿頑枚蟄励・縺ｿ縺ｮ繝√Ε繝ｳ繧ｯ繧帝勁螟・
            const textContent = chunk.text.replace(/[\s\n\r\t]/g, '');
            if (textContent.length < 10) return false;
            
            return true;
        });
        
        return filteredChunks;
    }

    private splitLongParagraph(paragraph: string): string[] {
        // 髟ｷ縺・ｮｵ關ｽ繧呈э蜻ｳ縺ｮ縺ゅｋ蜊倅ｽ阪〒蛻・牡
        const sentences = paragraph.split(/[縲ゑｼ・ｼ歃n]/);
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length === 0) continue;
            
            // 迴ｾ蝨ｨ縺ｮ繝√Ε繝ｳ繧ｯ縺ｫ譁・ｒ霑ｽ蜉縺励◆蝣ｴ蜷医・髟ｷ縺輔ｒ繝√ぉ繝・け
            if (currentChunk.length + trimmedSentence.length > 1500) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
            }
            
            currentChunk += (currentChunk.length > 0 ? '縲・ : '') + trimmedSentence;
        }
        
        // 譛蠕後・繝√Ε繝ｳ繧ｯ繧定ｿｽ蜉
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    private async extractWordText(filePath: string): Promise<string> {
        try {
            // DOCX繝輔ぃ繧､繝ｫ縺ｮ邁｡譏鍋噪縺ｪ繝・く繧ｹ繝域歓蜃ｺ
            const zip = new AdmZip(filePath);
            const documentXml = zip.getEntry('word/document.xml');
            if (documentXml) {
                const xmlContent = documentXml.getData().toString('utf8');
                // 邁｡蜊倥↑XML繝代・繧ｹ・亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繧医ｊ鬮伜ｺｦ縺ｪ蜃ｦ逅・′蠢・ｦ・ｼ・
                const textContent = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return textContent || 'Word繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
            }
            return 'Word繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
        } catch (error) {
            console.error('Word繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
            return 'Word繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
        }
    }

    private async extractExcelText(filePath: string): Promise<string> {
        try {
            // Excel繝輔ぃ繧､繝ｫ縺ｮ邁｡譏鍋噪縺ｪ繝・く繧ｹ繝域歓蜃ｺ
            const zip = new AdmZip(filePath);
            const sharedStringsXml = zip.getEntry('xl/sharedStrings.xml');
            if (sharedStringsXml) {
                const xmlContent = sharedStringsXml.getData().toString('utf8');
                // 邁｡蜊倥↑XML繝代・繧ｹ
                const textContent = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return textContent || 'Excel繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
            }
            return 'Excel繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧呈歓蜃ｺ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・;
        } catch (error) {
            console.error('Excel繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
            return 'Excel繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
        }
    }

    private async extractPptxText(filePath: string): Promise<{ text: string; images: any[] }> {
        try {
            const zip = new AdmZip(filePath);
            const slidesDir = zip.getEntries().filter(entry => 
                entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')
            );
            
            let extractedText = '';
            const images: any[] = [];
            
            // 蜷・せ繝ｩ繧､繝峨・繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
            for (const slideEntry of slidesDir) {
                const slideContent = slideEntry.getData().toString('utf8');
                const textRegex = /<a:t>(.*?)<\/a:t>/g;
                let match;
                
                while ((match = textRegex.exec(slideContent)) !== null) {
                    if (match[1].trim()) {
                        extractedText += match[1].trim() + '\n';
                    }
                }
                
                // 繧ｹ繝ｩ繧､繝臥判蜒上・繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧堤函謌・
                const slideNumber = slidesDir.indexOf(slideEntry) + 1;
                images.push({
                    id: `slide_${slideNumber}`,
                    path: `/knowledge-base/images/${path.basename(filePath, '.pptx')}_${slideNumber.toString().padStart(3, '0')}.png`,
                    alt: `繧ｹ繝ｩ繧､繝・${slideNumber}`,
                    order: slideNumber
                });
            }
            
            return {
                text: extractedText.trim(),
                images
            };
        } catch (error) {
            console.error('PowerPoint繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
            return {
                text: 'PowerPoint繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
                images: []
            };
        }
    }

    private async analyzeDocument(content: string): Promise<any> {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "縺薙・繝峨く繝･繝｡繝ｳ繝医・蜀・ｮｹ繧貞・譫舌＠縲√く繝ｼ繝ｯ繝ｼ繝峨→隕∫ｴ・ｒ謚ｽ蜃ｺ縺励※縺上□縺輔＞縲・
                    },
                    {
                        role: "user",
                        content: content
                    }
                ]
            });

            return {
                summary: response.choices[0].message.content,
                keywords: this.extractKeywords(content)
            };
        } catch (error) {
            console.error('繝峨く繝･繝｡繝ｳ繝亥・譫舌お繝ｩ繝ｼ:', error);
            return {
                summary: '蛻・梵縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆',
                keywords: []
            };
        }
    }

    private extractKeywords(content: string): string[] {
        // 邁｡蜊倥↑繧ｭ繝ｼ繝ｯ繝ｼ繝画歓蜃ｺ・亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繧医ｊ鬮伜ｺｦ縺ｪ蜃ｦ逅・′蠢・ｦ・ｼ・
        const words = content.toLowerCase().split(/\s+/);
        const keywordCount: { [key: string]: number } = {};
        
        words.forEach(word => {
            if (word.length > 3) {
                keywordCount[word] = (keywordCount[word] || 0) + 1;
            }
        });

        return Object.entries(keywordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }
}

export const documentProcessor = new DocumentProcessor();

// Process document function for routes.ts
export const processDocument = async (filePath: string) => {
    return await documentProcessor.processDocument(filePath);
}; 