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
            
            // ファイル形式に応じた処理
            switch (fileExt) {
                case '.txt':
                    content = await fs.readFile(filePath, 'utf-8');
                    chunks = this.createChunks(content, fileName);
                    break;
                    
                case '.pdf':
                    // PDFの場合はテキスト抽出を試行（簡易実装）
                    try {
                        content = await fs.readFile(filePath, 'utf-8');
                    } catch {
                        content = 'PDFファイルの内容を読み取れませんでした。';
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
                    // その他のファイル形式
                    try {
                        content = await fs.readFile(filePath, 'utf-8');
                    } catch {
                        content = 'ファイルの内容を読み取れませんでした。';
                    }
                    chunks = this.createChunks(content, fileName);
                    break;
            }
            
            // ドキュメントの内容を分析
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
            console.error('ドキュメント処理エラー:', error);
            // エラーが発生した場合でも基本的な構造を返す
            return {
                fileName: path.basename(filePath),
                content: 'ファイルの処理中にエラーが発生しました。',
                text: 'ファイルの処理中にエラーが発生しました。',
                chunks: [],
                images: [],
                analysis: {
                    summary: '処理エラーにより分析できませんでした',
                    keywords: []
                },
                processedAt: new Date()
            };
        }
    }

    private createChunks(content: string, fileName: string): any[] {
        // テキストをチャンクに分割（簡易実装）
        const chunkSize = 1000; // 文字数
        const chunks = [];
        
        for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            chunks.push({
                id: `${fileName}_chunk_${chunks.length + 1}`,
                text: chunk,
                order: chunks.length + 1
            });
        }
        
        return chunks;
    }

    private async extractWordText(filePath: string): Promise<string> {
        try {
            // DOCXファイルの簡易的なテキスト抽出
            const zip = new AdmZip(filePath);
            const documentXml = zip.getEntry('word/document.xml');
            if (documentXml) {
                const xmlContent = documentXml.getData().toString('utf8');
                // 簡単なXMLパース（実際の実装ではより高度な処理が必要）
                const textContent = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return textContent || 'Wordファイルの内容を抽出できませんでした。';
            }
            return 'Wordファイルの内容を抽出できませんでした。';
        } catch (error) {
            console.error('Wordファイル処理エラー:', error);
            return 'Wordファイルの処理中にエラーが発生しました。';
        }
    }

    private async extractExcelText(filePath: string): Promise<string> {
        try {
            // Excelファイルの簡易的なテキスト抽出
            const zip = new AdmZip(filePath);
            const sharedStringsXml = zip.getEntry('xl/sharedStrings.xml');
            if (sharedStringsXml) {
                const xmlContent = sharedStringsXml.getData().toString('utf8');
                // 簡単なXMLパース
                const textContent = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return textContent || 'Excelファイルの内容を抽出できませんでした。';
            }
            return 'Excelファイルの内容を抽出できませんでした。';
        } catch (error) {
            console.error('Excelファイル処理エラー:', error);
            return 'Excelファイルの処理中にエラーが発生しました。';
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
            
            // 各スライドのテキストを抽出
            for (const slideEntry of slidesDir) {
                const slideContent = slideEntry.getData().toString('utf8');
                const textRegex = /<a:t>(.*?)<\/a:t>/g;
                let match;
                
                while ((match = textRegex.exec(slideContent)) !== null) {
                    if (match[1].trim()) {
                        extractedText += match[1].trim() + '\n';
                    }
                }
                
                // スライド画像のプレースホルダーを生成
                const slideNumber = slidesDir.indexOf(slideEntry) + 1;
                images.push({
                    id: `slide_${slideNumber}`,
                    path: `/knowledge-base/images/${path.basename(filePath, '.pptx')}_${slideNumber.toString().padStart(3, '0')}.png`,
                    alt: `スライド ${slideNumber}`,
                    order: slideNumber
                });
            }
            
            return {
                text: extractedText.trim(),
                images
            };
        } catch (error) {
            console.error('PowerPointファイル処理エラー:', error);
            return {
                text: 'PowerPointファイルの処理中にエラーが発生しました。',
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
                        content: "このドキュメントの内容を分析し、キーワードと要約を抽出してください。"
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
            console.error('ドキュメント分析エラー:', error);
            return {
                summary: '分析できませんでした',
                keywords: []
            };
        }
    }

    private extractKeywords(content: string): string[] {
        // 簡単なキーワード抽出（実際の実装ではより高度な処理が必要）
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