import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import Fuse from 'fuse';
import { db } from '../db/index';
import { messages, chats } from '../db/schema';
import { like } from 'drizzle-orm';

// ESM用__dirname定義
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
            // メタデータファイルを読み込み
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems: any[] = [];

            for (const file of metadataFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const metadata = JSON.parse(content);
                    searchableItems.push(metadata);
                } catch (error) {
                    console.error(`メタデータファイル読み込みエラー: ${file}`, error);
                }
            }

            // Fuse.jsで検索
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
            console.error('ドキュメント検索エラー:', error);
            return [];
        }
    }

    async searchEmergencyGuides(query: string, limit: number = 5): Promise<any[]> {
        try {
            // 緊急ガイドファイルを読み込み
            const guideFiles = await this.getEmergencyGuideFiles();
            const emergencyItems: any[] = [];

            for (const file of guideFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const guide = JSON.parse(content);
                    emergencyItems.push(guide);
                } catch (error) {
                    console.error(`緊急ガイドファイル読み込みエラー: ${file}`, error);
                }
            }

            // Fuse.jsで検索
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
            console.error('緊急ガイド検索エラー:', error);
            return [];
        }
    }

    async semanticSearch(query: string, limit: number = 5): Promise<any[]> {
        try {
            // OpenAIのEmbeddings APIを使用したセマンティック検索
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query
            });

            const queryEmbedding = response.data[0].embedding;
            
            // メタデータファイルを読み込み
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
                    console.error(`メタデータファイル読み込みエラー: ${file}`, error);
                }
            }

            // コサイン類似度で検索
            const results = searchableItems
                .map(item => ({
                    ...item,
                    similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            return results;
        } catch (error) {
            console.error('セマンティック検索エラー:', error);
            return [];
        }
    }

    async performSearch(query: string) {
        try {
            // メッセージから検索
            const messageResults = await db.select()
                .from(messages)
                .where(
                    like(messages.content, `%${query}%`)
                )
                .limit(10);

            // チャットから検索
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
            console.error('メタデータディレクトリ読み込みエラー:', error);
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
            console.error('緊急ガイドディレクトリ読み込みエラー:', error);
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