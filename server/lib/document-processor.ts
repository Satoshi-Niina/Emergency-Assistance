import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';

export class DocumentProcessor {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    async processDocument(filePath: string): Promise<any> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const fileName = path.basename(filePath);
            
            // ドキュメントの内容を分析
            const analysis = await this.analyzeDocument(content);
            
            return {
                fileName,
                content,
                analysis,
                processedAt: new Date()
            };
        } catch (error) {
            console.error('ドキュメント処理エラー:', error);
            throw error;
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