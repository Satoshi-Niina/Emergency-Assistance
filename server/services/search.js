"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchService = exports.SearchService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const url_1 = require("url");
const openai_1 = __importDefault(require("openai"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
class SearchService {
    constructor() {
        Object.defineProperty(this, "metadataPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "emergencyGuidePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "openai", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fuse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "emergencyFuse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.metadataPath = path.join(__dirname, '../../knowledge-base/processed/metadata');
        this.emergencyGuidePath = path.join(__dirname, '../../knowledge-base/processed/emergency-guides');
        this.openai = new openai_1.default();
    }
    async searchDocuments(query, limit = 10) {
        try {
            // メタデータファイルを読み込み
            const metadataFiles = await this.getMetadataFiles();
            const searchableItems = [];
            for (const file of metadataFiles) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const metadata = JSON.parse(content);
                    searchableItems.push(metadata);
                }
                catch (error) {
                    console.error(`メタデータファイル読み込みエラー: ${file}`, error);
                }
            }
            // Fuse.jsで検索
            if (!this.fuse) {
                this.fuse = new fuse_js_1.default(searchableItems, {
                    keys: ['title', 'content', 'keywords'],
                    threshold: 0.3,
                    includeScore: true,
                });
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
                this.emergencyFuse = new fuse_js_1.default(emergencyItems, {
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
            const messageResults = await index_js_1.db
                .select()
                .from(schema_js_1.messages)
                .where((0, drizzle_orm_1.like)(schema_js_1.messages.content, `%${query}%`))
                .limit(10);
            // チャットから検索
            const chatResults = await index_js_1.db
                .select()
                .from(schema_js_1.chats)
                .where((0, drizzle_orm_1.like)(schema_js_1.chats.title, `%${query}%`))
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
            const files = await fs.readdir(this.metadataPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(this.metadataPath, file));
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
exports.SearchService = SearchService;
exports.searchService = new SearchService();
