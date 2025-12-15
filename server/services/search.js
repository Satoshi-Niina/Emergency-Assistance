import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import Fuse from 'fuse.js';
import { db } from '../db/index.js';
import { messages, chats } from '../db/schema.js';
import { like } from 'drizzle-orm';
import { isAzureEnvironment } from '../src/config/env.mjs';

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
        this.metadataPath = path.join(__dirname, '../../knowledge-base/documents');
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
                this.fuse = new Fuse(searchableItems, {
                    keys: ['title', 'content', 'keywords'],
                    threshold: 0.3,
                    includeScore: true,
                });
            } else {
                // If new items came in (e.g. first blob load), re-init might be needed if keeping instance alive across requests.
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

            // Azure Blob Client (re-use logic? duplication for now to keep robust)
            let containerClient = null;

            for (const file of guideFiles) {
                try {
                    let content;
                    if (file.startsWith('blob://')) {
                        if (!containerClient) {
                            const { getBlobServiceClient } = await import('../src/infra/blob.mjs');
                            const blobServiceClient = getBlobServiceClient();
                            if (blobServiceClient) {
                                const url = new URL(file);
                                const containerName = url.hostname;
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
                        content = await fs.readFile(file, 'utf-8');
                    }

                    if (content) {
                        const guide = JSON.parse(content);
                        emergencyItems.push(guide);
                    }
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
            } else {
                if (emergencyItems.length > 0) {
                    this.emergencyFuse.setCollection(emergencyItems);
                }
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

            // Note: If we already loaded them in searchDocuments, we might want to cache.
            // But for statelessness, we reload. (Ideally should cache in memory)

            let containerClient = null;

            for (const file of metadataFiles) {
                try {
                    let content;
                    if (file.startsWith('blob://')) {
                        if (!containerClient) {
                            const { getBlobServiceClient } = await import('../src/infra/blob.mjs');
                            const blobServiceClient = getBlobServiceClient();
                            if (blobServiceClient) {
                                const url = new URL(file);
                                const containerName = url.hostname;
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
                        content = await fs.readFile(file, 'utf-8');
                    }

                    if (content) {
                        const metadata = JSON.parse(content);
                        if (metadata.embedding) {
                            searchableItems.push(metadata);
                        }
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
        return this.getFilesFromStorage(this.metadataPath, 'knowledge-base/documents/');
    }

    async getEmergencyGuideFiles() {
        return this.getFilesFromStorage(this.emergencyGuidePath, 'knowledge-base/processed/emergency-guides/');
    }

    async getFilesFromStorage(localPath, blobPrefix) {
        try {
            // Use unified environment check
            const useAzure = isAzureEnvironment();

            if (useAzure) {
                // dynamic import
                const { getBlobServiceClient, containerName } = await import('../src/infra/blob.mjs');
                const blobServiceClient = getBlobServiceClient();

                if (!blobServiceClient) {
                    console.warn('Azure Blob Storage client not available, falling back to local for:', blobPrefix);
                    if (!fs.existsSync(localPath)) return [];
                    const files = await fs.readdir(localPath);
                    return files.filter(file => file.endsWith('.json')).map(file => path.join(localPath, file));
                }

                const containerClient = blobServiceClient.getContainerClient(containerName);

                const files = [];
                // Check if container exists first to avoid 404
                if (await containerClient.exists()) {
                    for await (const blob of containerClient.listBlobsFlat({ prefix: blobPrefix })) {
                        if (blob.name.endsWith('.json')) {
                            // Normalize to pseudo-URI for internal consumption
                            files.push(`blob://${containerName}/${blob.name}`);
                        }
                    }
                } else {
                    console.warn('Container not found:', containerName);
                }
                return files;

            } else {
                if (!fs.existsSync(localPath)) return [];
                const files = await fs.readdir(localPath);
                return files
                    .filter(file => file.endsWith('.json'))
                    .map(file => path.join(localPath, file));
            }
        }
        catch (error) {
            console.error(`ファイル読み込みエラー (${blobPrefix}):`, error);
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
