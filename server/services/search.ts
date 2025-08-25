import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import Fuse from 'fuse.js';
import { db } from '../db/index.js';
import { messages, chats } from '../db/schema.js';
import { like } from 'drizzle-orm';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SearchService {
    private metadataPath: string;
    private emergencyGuidePath: string;
    private openai: OpenAI;
    private fuse: Fuse<any> | null = null;
    private emergencyFuse: Fuse<any> | null = null;

    constructor() {
        this.metadataPath = path.join(__dirname, '../../knowledge-base/processed/metadata');
        this.emergencyGuidePath = path.join(__dirname, '../../knowledge-base/processed/emergency-guides');
        this.openai = new OpenAI();
    }

    async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
        try {
            // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems: any[] = [];

            for (const file of metadataFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const metadata = JSON.parse(content);
                    searchableItems.push(metadata);
                } catch (error) {
                    console.error(`繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
                }
            }

            // Fuse.js縺ｧ讀懃ｴ｢
            if (!this.fuse) {
                this.fuse = new Fuse(searchableItems, {
                    keys: ['title', 'content', 'keywords'],
                    threshold: 0.3,
                    includeScore: true
                });
            }

            const results = this.fuse.search(query).slice(0, limit);
            return results.map(result => ({
                ...result.item,
                score: result.score
            }));
        } catch (error) {
            console.error('繝峨く繝･繝｡繝ｳ繝域､懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
            return [];
        }
    }

    async searchEmergencyGuides(query: string, limit: number = 5): Promise<any[]> {
        try {
            // 邱頑･繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
            const guideFiles = await this.getEmergencyGuideFiles();
            const emergencyItems: any[] = [];

            for (const file of guideFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const guide = JSON.parse(content);
                    emergencyItems.push(guide);
                } catch (error) {
                    console.error(`邱頑･繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
                }
            }

            // Fuse.js縺ｧ讀懃ｴ｢
            if (!this.emergencyFuse) {
                this.emergencyFuse = new Fuse(emergencyItems, {
                    keys: ['title', 'description', 'keywords', 'steps'],
                    threshold: 0.4,
                    includeScore: true
                });
            }

            const results = this.emergencyFuse.search(query).slice(0, limit);
            return results.map(result => ({
                ...result.item,
                score: result.score
            }));
        } catch (error) {
            console.error('邱頑･繧ｬ繧､繝画､懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
            return [];
        }
    }

    async semanticSearch(query: string, limit: number = 5): Promise<any[]> {
        try {
            // OpenAI縺ｮEmbeddings API繧剃ｽｿ逕ｨ縺励◆繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query
            });

            const queryEmbedding = response.data[0].embedding;
            
            // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems: any[] = [];

            for (const file of metadataFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const metadata = JSON.parse(content);
                    if (metadata.embedding) {
                        searchableItems.push(metadata);
                    }
                } catch (error) {
                    console.error(`繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ: ${file}`, error);
                }
            }

            // 繧ｳ繧ｵ繧､繝ｳ鬘樔ｼｼ蠎ｦ縺ｧ讀懃ｴ｢
            const results = searchableItems
                .map(item => ({
                    ...item,
                    similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            return results;
        } catch (error) {
            console.error('繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
            return [];
        }
    }

    async performSearch(query: string) {
        try {
            // 繝｡繝・そ繝ｼ繧ｸ縺九ｉ讀懃ｴ｢
            const messageResults = await db.select()
                .from(messages)
                .where(
                    like(messages.content, `%${query}%`)
                )
                .limit(10);

            // 繝√Ε繝・ヨ縺九ｉ讀懃ｴ｢
            const chatResults = await db.select()
                .from(chats)
                .where(
                    like(chats.title, `%${query}%`)
                )
                .limit(10);

            return {
                messages: messageResults,
                chats: chatResults,
                query: query
            };
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    private async getMetadataFiles(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.metadataPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(this.metadataPath, file));
        } catch (error) {
            console.error('繝｡繧ｿ繝・・繧ｿ繝・ぅ繝ｬ繧ｯ繝医Μ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
            return [];
        }
    }

    private async getEmergencyGuideFiles(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.emergencyGuidePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(this.emergencyGuidePath, file));
        } catch (error) {
            console.error('邱頑･繧ｬ繧､繝峨ョ繧｣繝ｬ繧ｯ繝医Μ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
            return [];
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const searchService = new SearchService(); 