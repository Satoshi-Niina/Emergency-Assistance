import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import Fuse from 'fuse.js';
import { db } from '../db/index.js';
import { messages, chats } from '../db/schema.js';
import { like } from 'drizzle-orm';
// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class SearchService {
    metadataPath;
    emergencyGuidePath;
    openai;
    fuse = null;
    emergencyFuse = null;
    constructor() {
        this.metadataPath = path.join(__dirname, '../../knowledge-base/processed/metadata');
        this.emergencyGuidePath = path.join(__dirname, '../../knowledge-base/processed/emergency-guides');
        this.openai = new OpenAI();
    }
    async searchDocuments(query, limit = 10) {
        try {
            // メタデータファイルを読み込み
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems = [];

            // Azure Blob Client initialization (lazy load if needed)
            let containerClient = null;

            for (const file of metadataFiles) {
                try {
                    let content;
                    if (file.startsWith('blob://')) {
                        // Azure Blob load
                        if (!containerClient) {
                            const { getBlobServiceClient } = await import('../src/infra/blob.mjs');
                            const blobServiceClient = getBlobServiceClient();
                            if (blobServiceClient) {
                                // parse container/path from blob://container/path
                                // actually getMetadataFiles returns blob://containerName/path
                                const url = new URL(file);
                                const containerName = url.hostname; // in blob://container/path, hostname is container
                                const blobPath = url.pathname.substring(1); // remove leading /
                                containerClient = blobServiceClient.getContainerClient(containerName);
                            }
                        }

                        if (containerClient) {
                            const url = new URL(file);
                            const blobPath = url.pathname.substring(1);
                            const blobClient = containerClient.getBlobClient(blobPath);
                            const downloadResponse = await blobClient.download();
                            const chunks = [];
                            for await (const chunk of downloadResponse.readableStreamBody) {
                                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                            }
                            content = Buffer.concat(chunks).toString('utf8');
                        }
                    } else {
                        // Local load
                        content = await fs.readFile(file, 'utf-8');
                    }

                    if (content) {
                        const metadata = JSON.parse(content);
                        searchableItems.push(metadata);
                    }
                }
                catch (error) {
                    console.error(`メタデータファイル読み込みエラー: ${file}`, error);
                }
            }
            // Fuse.jsで検索
            if (!this.fuse) { // Note: If searchableItems changes, we should maybe rebuild Fuse. 
                // But for now, we assume this is transient or acceptable for a quick fix.
                // Better: check if fuse needs init.
                this.fuse = new Fuse(searchableItems, {
                    keys: ['title', 'content', 'keywords'],
                    threshold: 0.3,
                    includeScore: true,
                });
            } else {
                // If new items came in (e.g. first blob load), re-init might be needed if keeping instance alive across requests.
                // For safety in this stateless-ish environment, let's re-init if items found.
                if (searchableItems.length > 0) {
                    this.fuse.setCollection(searchableItems);
                }
            }

            const results = this.fuse.search(query).slice(0, limit);
            return results.map(result => ({
                ...result.item,
                score: result.score,
            }));
        }
        catch (error) {
            console.error('ドキュメント検索エラー:', error);
            return [];
        }
    }
    async searchEmergencyGuides(query, limit = 5) {
        try {
            // 緊急ガイドファイルを読み込み
            const guideFiles = await this.getEmergencyGuideFiles();
            const emergencyItems = [];
            for (const file of guideFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const guide = JSON.parse(content);
                    emergencyItems.push(guide);
                }
                catch (error) {
                    console.error(`緊急ガイドファイル読み込みエラー: ${file}`, error);
                }
            }
            // Fuse.jsで検索
            if (!this.emergencyFuse) {
                this.emergencyFuse = new Fuse(emergencyItems, {
                    keys: ['title', 'description', 'keywords', 'steps'],
                    threshold: 0.4,
                    includeScore: true,
                });
            }
            const results = this.emergencyFuse.search(query).slice(0, limit);
            return results.map(result => ({
                ...result.item,
                score: result.score,
            }));
        }
        catch (error) {
            console.error('緊急ガイド検索エラー:', error);
            return [];
        }
    }
    async semanticSearch(query, limit = 5) {
        try {
            // OpenAIのEmbeddings APIを使用したセマンティック検索
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: query,
            });
            const queryEmbedding = response.data[0].embedding;
            // メタデータファイルを読み込み
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems = [];
            for (const file of metadataFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const metadata = JSON.parse(content);
                    if (metadata.embedding) {
                        searchableItems.push(metadata);
                    }
                }
                catch (error) {
                    console.error(`メタデータファイル読み込みエラー: ${file}`, error);
                }
            }
            // コサイン類似度で検索
            const results = searchableItems
                .map(item => ({
                    ...item,
                    similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
            return results;
        }
        catch (error) {
            console.error('セマンティック検索エラー:', error);
            return [];
        }
    }
    async performSearch(query) {
        try {
            // メッセージから検索
            const messageResults = await db
                .select()
                .from(messages)
                .where(like(messages.content, `%${query}%`))
                .limit(10);
            // チャットから検索
            const chatResults = await db
                .select()
                .from(chats)
                .where(like(chats.title, `%${query}%`))
                .limit(10);
            return {
                messages: messageResults,
                chats: chatResults,
                query: query,
            };
        }
        catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }
    async getMetadataFiles() {
        try {
            if (process.env.STORAGE_MODE === 'azure' || process.env.STORAGE_MODE === 'blob' || (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.NODE_ENV === 'production')) {
                // dynamic import to avoid issues in local env if package is missing (though it should be there)
                const { getBlobServiceClient, containerName } = await import('../src/infra/blob.mjs');
                const blobServiceClient = getBlobServiceClient();

                if (!blobServiceClient) {
                    console.warn('Azure Blob Storage client not available, falling back to local for metadata.');
                    // Default to local if blob init fails to avoid crash
                    if (!fs.existsSync(this.metadataPath)) return [];
                    const files = await fs.readdir(this.metadataPath);
                    return files.filter(file => file.endsWith('.json')).map(file => path.join(this.metadataPath, file));
                }

                const containerClient = blobServiceClient.getContainerClient(containerName);
                const prefix = 'knowledge-base/processed/metadata/';

                const files = [];
                // Note: Listing blobs is fast, but we return the blob NAMES (paths), not local paths.
                // The consumer of this list must be able to handle blob paths.
                // However, the current consumer (searchDocuments) does `fs.readFile(file)`.
                // So we need to refactor `searchDocuments` too. 
                // For now, I will return objects or paths that `searchDocuments` can distinguish.
                // BUT `searchDocuments` expects a file path string. 

                // Strategy: Return a special prefix identifying it as a blob.
                for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                    if (blob.name.endsWith('.json')) {
                        files.push(`blob://${containerName}/${blob.name}`);
                    }
                }
                return files;

            } else {
                if (!fs.existsSync(this.metadataPath)) return [];
                const files = await fs.readdir(this.metadataPath);
                return files
                    .filter(file => file.endsWith('.json'))
                    .map(file => path.join(this.metadataPath, file));
            }
        }
        catch (error) {
            console.error('メタデータディレクトリ読み込みエラー:', error);
            return [];
        }
    }
    async getEmergencyGuideFiles() {
        try {
            const files = await fs.readdir(this.emergencyGuidePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(this.emergencyGuidePath, file));
        }
        catch (error) {
            console.error('緊急ガイドディレクトリ読み込みエラー:', error);
            return [];
        }
    }
    cosineSimilarity(vecA, vecB) {
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
