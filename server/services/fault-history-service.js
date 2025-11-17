"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faultHistoryService = exports.FaultHistoryService = void 0;
const better_sqlite3_1 = require("drizzle-orm/better-sqlite3");
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const better_sqlite3_2 = __importDefault(require("better-sqlite3"));
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../db/schema.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
/**
 * 故障履歴サービス
 * 環境変数に基づいてデータベースまたはファイルシステムに保存
 */
class FaultHistoryService {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "useDatabase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "imagesDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "storageMode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });

        // ストレージモードを環境変数から決定
        // 'database': DBのみ、'file': ファイルのみ、'hybrid': 両方（推奨）
        this.storageMode = process.env.STORAGE_MODE || 'hybrid';
        this.useDatabase = this.storageMode === 'database' || this.storageMode === 'hybrid';

        // 画像保存ディレクトリを設定
        this.imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
            path_1.default.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');

        // ディレクトリが存在しない場合は作成
        if (!fs_1.default.existsSync(this.imagesDir)) {
            fs_1.default.mkdirSync(this.imagesDir, { recursive: true });
        }

        console.log('🔧 故障履歴サービス初期化:', {
            storageMode: this.storageMode,
            useDatabase: this.useDatabase,
            imagesDir: this.imagesDir
        });

        // DBモードまたはハイブリッドモードの場合はDB初期化
        if (this.useDatabase) {
            this.initializeDatabase();
        }
    }
    initializeDatabase() {
        try {
            if (process.env.DATABASE_URL?.startsWith('postgres')) {
                // PostgreSQL
                const client = (0, postgres_1.default)(process.env.DATABASE_URL);
                this.db = (0, postgres_js_1.drizzle)(client);
                console.log('📊 PostgreSQL接続初期化完了');
            }
            else {
                // SQLite (ローカル開発用)
                const sqlite = new better_sqlite3_2.default(process.env.DATABASE_URL || 'app.db');
                this.db = (0, better_sqlite3_1.drizzle)(sqlite);
                console.log('📊 SQLite接続初期化完了');
            }
        }
        catch (error) {
            console.error('❌ データベース初期化エラー:', error);
            console.log('📁 ファイルモードにフォールバック');
            this.useDatabase = false;
        }
    }
    /**
     * 故障履歴を保存
     */
    async saveFaultHistory(jsonData, options = {}) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // JSONデータから基本情報を抽出
        const { title = options.title || this.extractTitle(jsonData), description = options.description || this.extractDescription(jsonData), machineType = this.extractMachineType(jsonData), machineNumber = this.extractMachineNumber(jsonData), office = this.extractOffice(jsonData), category = this.extractCategory(jsonData), keywords = this.extractKeywords(jsonData), emergencyGuideTitle = this.extractEmergencyGuideTitle(jsonData), emergencyGuideContent = this.extractEmergencyGuideContent(jsonData), } = {};
        // 画像を抽出・保存
        let imagePaths = [];
        let imageRecords = [];
        if (options.extractImages !== false) {
            const imageExtraction = await this.extractAndSaveImages(jsonData, id);
            imagePaths = imageExtraction.imagePaths;
            imageRecords = imageExtraction.imageRecords;
        }
        // ハイブリッドモード: 両方に保存
        const shouldSaveToDb = this.storageMode === 'database' || this.storageMode === 'hybrid';
        const shouldSaveToFile = this.storageMode === 'file' || this.storageMode === 'hybrid';

        if (shouldSaveToDb && this.db) {
            // データベースに保存
            try {
                const historyRecord = {
                    id,
                    title,
                    description,
                    machineType,
                    machineNumber,
                    office,
                    category,
                    keywords: keywords ? JSON.stringify(keywords) : null,
                    emergencyGuideTitle,
                    emergencyGuideContent,
                    jsonData: JSON.stringify(jsonData),
                    storageMode: this.storageMode,
                    createdAt: now,
                    updatedAt: now,
                };
                await this.db.insert(schema_js_1.faultHistory).values(historyRecord);
                // 画像レコードを保存
                if (imageRecords.length > 0) {
                    await this.db.insert(schema_js_1.faultHistoryImages).values(imageRecords);
                }
                console.log(`✅ 故障履歴をデータベースに保存: ${id}`);
            }
            catch (error) {
                console.error('❌ データベース保存エラー:', error);
                if (this.storageMode === 'database') {
                    throw error; // DBのみモードの場合はエラーを投げる
                }
                console.log('⚠️ ハイブリッドモード: ファイル保存を続行');
            }
        }

        if (shouldSaveToFile) {
            // ファイルシステムに保存
            const exportDir = process.env.LOCAL_EXPORT_DIR ||
                path_1.default.join(process.cwd(), 'knowledge-base', 'exports');
            if (!fs_1.default.existsSync(exportDir)) {
                fs_1.default.mkdirSync(exportDir, { recursive: true });
            }
            const filePath = path_1.default.join(exportDir, `${id}.json`);
            const fileData = {
                id,
                title,
                description,
                machineType,
                machineNumber,
                office,
                category,
                keywords,
                emergencyGuideTitle,
                emergencyGuideContent,
                jsonData,
                metadata: {
                    storageMode: this.storageMode,
                    imagePaths,
                    imageRecords,
                },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            fs_1.default.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            console.log(`✅ 故障履歴をファイルに保存: ${filePath}`);
        }
        return { id, imagePaths };
    }
    /**
     * 故障履歴一覧を取得
     */
    async getFaultHistoryList(options = {}) {
        const { limit = 20, offset = 0 } = options;
        if (this.useDatabase) {
            // データベースから取得
            try {
                let query = this.db.select().from(schema_js_1.faultHistory);
                const conditions = [];
                if (options.machineType) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_js_1.faultHistory.machineType, options.machineType));
                }
                if (options.machineNumber) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_js_1.faultHistory.machineNumber, options.machineNumber));
                }
                if (options.category) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_js_1.faultHistory.category, options.category));
                }
                if (options.office) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_js_1.faultHistory.office, options.office));
                }
                if (options.keyword) {
                    conditions.push((0, drizzle_orm_1.sql)`${schema_js_1.faultHistory.title} ILIKE ${`%${options.keyword}%`} OR
                ${schema_js_1.faultHistory.description} ILIKE ${`%${options.keyword}%`}`);
                }
                if (conditions.length > 0) {
                    query = query.where((0, drizzle_orm_1.and)(...conditions));
                }
                const items = await query
                    .orderBy((0, drizzle_orm_1.desc)(schema_js_1.faultHistory.createdAt))
                    .limit(limit)
                    .offset(offset);
                // 総数を取得
                const totalQuery = await this.db
                    .select({ count: (0, drizzle_orm_1.sql)`count(*)` })
                    .from(schema_js_1.faultHistory);
                const total = totalQuery[0]?.count || 0;
                return { items, total };
            }
            catch (error) {
                console.error('❌ データベース取得エラー:', error);
                throw error;
            }
        }
        else {
            // ファイルシステムから取得
            return this.getFaultHistoryFromFiles(options);
        }
    }
    /**
     * 故障履歴詳細を取得
     */
    async getFaultHistoryById(id) {
        if (this.useDatabase) {
            // データベースから取得
            try {
                const item = await this.db
                    .select()
                    .from(schema_js_1.faultHistory)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.faultHistory.id, id))
                    .limit(1);
                if (!item || item.length === 0) {
                    return null;
                }
                // 関連画像を取得
                const images = await this.db
                    .select()
                    .from(schema_js_1.faultHistoryImages)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.faultHistoryImages.faultHistoryId, id));

                // ハイブリッドモードの場合、JSONファイルからも画像データを読み込む
                if (this.storageMode === 'hybrid') {
                    const exportDir = process.env.LOCAL_EXPORT_DIR ||
                        path_1.default.join(process.cwd(), 'knowledge-base', 'exports');

                    const files = fs_1.default.readdirSync(exportDir);
                    const matchingFile = files.find(file =>
                        file.includes(id) && file.endsWith('.json')
                    );

                    if (matchingFile) {
                        const filePath = path_1.default.join(exportDir, matchingFile);
                        const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
                        const jsonData = JSON.parse(fileContent);

                        // JSONファイルから画像データを取得
                        const savedImages = jsonData.savedImages || jsonData.images || [];
                        console.log('🖼️ ハイブリッドモード: JSONファイルから画像取得:', {
                            id,
                            fileName: matchingFile,
                            savedImagesLength: savedImages.length,
                        });

                        // JSONデータに画像情報を追加
                        if (typeof item[0].jsonData === 'string') {
                            const parsedJsonData = JSON.parse(item[0].jsonData);
                            parsedJsonData.savedImages = savedImages;
                            item[0].jsonData = JSON.stringify(parsedJsonData);
                        } else {
                            item[0].jsonData.savedImages = savedImages;
                        }
                    }
                }

                return {
                    ...item[0],
                    images,
                };
            }
            catch (error) {
                console.error('❌ データベース取得エラー:', error);
                throw error;
            }
        }
        else {
            // ファイルシステムから取得
            const exportDir = process.env.LOCAL_EXPORT_DIR ||
                path_1.default.join(process.cwd(), 'knowledge-base', 'exports');
            // UUIDで検索する場合、複合ファイル名からUUIDを抽出してファイルを検索
            let fileName = `${id}.json`;
            // 複合IDの場合、UUIDを抽出してファイルを検索
            const uuidMatch = id.match(/_([a-f0-9-]{36})_/);
            if (uuidMatch) {
                const uuid = uuidMatch[1];
                // UUIDから実際のファイル名を検索
                const files = fs_1.default.readdirSync(exportDir);
                const matchingFile = files.find(file => file.includes(uuid) && file.endsWith('.json'));
                if (matchingFile) {
                    fileName = matchingFile;
                }
            }
            const filePath = path_1.default.join(exportDir, fileName);
            if (!fs_1.default.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        }
    }
    /**
     * ファイルシステムから故障履歴一覧を取得
     */
    async getFaultHistoryFromFiles(options) {
        const exportDir = process.env.LOCAL_EXPORT_DIR ||
            path_1.default.join(process.cwd(), 'knowledge-base', 'exports');
        if (!fs_1.default.existsSync(exportDir)) {
            return { items: [], total: 0 };
        }
        const files = fs_1.default.readdirSync(exportDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const filePath = path_1.default.join(exportDir, file);
                    const content = fs_1.default.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    // ファイル名からUUIDを抽出（複合ID対応）
                    const fileName = file.replace('.json', '');
                    const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
                    const actualId = uuidMatch ? uuidMatch[1] : fileName;

                    // 画像データを確実に含める（複数のフィールドから取得）
                    const savedImages = data.savedImages || data.images || data.jsonData?.savedImages || data.jsonData?.images || [];

                    console.log('📂 ファイルから履歴読み込み:', {
                        file,
                        id: actualId,
                        hasSavedImages: !!data.savedImages,
                        hasImages: !!data.images,
                        hasJsonDataSavedImages: !!(data.jsonData && data.jsonData.savedImages),
                        savedImagesLength: savedImages.length,
                        firstImage: savedImages[0]
                    });

                    return {
                        ...data,
                        id: actualId, // UUIDを抽出してIDとして使用
                        originalFileName: fileName, // 元のファイル名も保持
                        savedImages: savedImages,  // 画像データを確実に含める
                        images: savedImages,        // imagesフィールドにも設定
                        jsonData: {
                            ...data.jsonData,
                            savedImages: savedImages, // jsonData内にも画像データを含める
                            images: savedImages
                        }
                    };
                }
                catch (error) {
                    console.error(`ファイル読み込みエラー: ${file}`, error);
                    return null;
                }
            })
            .filter(item => item !== null);
        // フィルタリング
        let filteredItems = files;
        if (options.machineType) {
            filteredItems = filteredItems.filter(item => item.machineType === options.machineType);
        }
        if (options.machineNumber) {
            filteredItems = filteredItems.filter(item => item.machineNumber === options.machineNumber);
        }
        if (options.category) {
            filteredItems = filteredItems.filter(item => item.category === options.category);
        }
        if (options.office) {
            filteredItems = filteredItems.filter(item => item.office === options.office);
        }
        if (options.keyword) {
            filteredItems = filteredItems.filter(item => (item.title?.toLowerCase().includes(options.keyword.toLowerCase())) ||
                (item.description?.toLowerCase().includes(options.keyword.toLowerCase())));
        }
        // ソート
        filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // ページング
        const { limit = 20, offset = 0 } = options;
        const paginatedItems = filteredItems.slice(offset, offset + limit);
        return {
            items: paginatedItems,
            total: filteredItems.length,
        };
    }
    /**
     * JSONデータから画像を抽出して保存
     */
    async extractAndSaveImages(jsonData, historyId) {
        const imagePaths = [];
        const imageRecords = [];
        try {
            // savedImagesから画像情報を取得（base64は使用しない）
            if (jsonData.savedImages && Array.isArray(jsonData.savedImages)) {
                for (const savedImage of jsonData.savedImages) {
                    if (savedImage && typeof savedImage === 'object' && savedImage.fileName) {
                        const fileName = savedImage.fileName;
                        const filePath = path_1.default.join(this.imagesDir, fileName);
                        // ファイルが存在する場合のみ記録
                        if (fs_1.default.existsSync(filePath)) {
                            imagePaths.push(filePath);
                            const imageRecord = {
                                id: (0, uuid_1.v4)(),
                                faultHistoryId: historyId,
                                originalFileName: savedImage.originalFileName || fileName,
                                fileName,
                                filePath: path_1.default.relative(process.cwd(), filePath),
                                relativePath: `images/chat-exports/${fileName}`,
                                mimeType: savedImage.mimeType || 'image/jpeg',
                                fileSize: savedImage.fileSize || '0',
                                description: savedImage.description || `Image ${fileName}`,
                                createdAt: new Date(),
                            };
                            imageRecords.push(imageRecord);
                            console.log(`📷 画像記録: ${fileName}`);
                        }
                    }
                }
            }
            // conversationHistoryから画像URLを検出（base64は除外）
            const conversationHistory = jsonData.conversationHistory || [];
            for (let i = 0; i < conversationHistory.length; i++) {
                const message = conversationHistory[i];
                if (message.content && typeof message.content === 'string') {
                    // URL形式の画像のみを処理（base64は除外）
                    if (message.content.startsWith('/api/images/') || message.content.startsWith('http')) {
                        // URLからファイル名を抽出
                        const urlParts = message.content.split('/');
                        const fileName = urlParts[urlParts.length - 1];
                        const filePath = path_1.default.join(this.imagesDir, fileName);
                        // ファイルが存在する場合のみ記録
                        if (fs_1.default.existsSync(filePath)) {
                            if (!imagePaths.includes(filePath)) {
                                imagePaths.push(filePath);
                                const imageRecord = {
                                    id: (0, uuid_1.v4)(),
                                    faultHistoryId: historyId,
                                    originalFileName: fileName,
                                    fileName,
                                    filePath: path_1.default.relative(process.cwd(), filePath),
                                    relativePath: `images/chat-exports/${fileName}`,
                                    mimeType: 'image/jpeg',
                                    fileSize: '0',
                                    description: `Message ${i + 1} - Image`,
                                    createdAt: new Date(),
                                };
                                imageRecords.push(imageRecord);
                                console.log(`📷 画像記録（URL）: ${fileName}`);
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ 画像抽出エラー:', error);
        }
        return { imagePaths, imageRecords };
    }
    // データ抽出ヘルパーメソッド
    extractTitle(jsonData) {
        return jsonData.title ||
            jsonData.metadata?.title ||
            jsonData.conversationHistory?.[0]?.content?.substring(0, 50) + '...' ||
            '故障履歴';
    }
    extractDescription(jsonData) {
        return jsonData.description ||
            jsonData.metadata?.description ||
            '';
    }
    extractMachineType(jsonData) {
        return jsonData.machineType ||
            jsonData.metadata?.machineType ||
            this.extractFromContent(jsonData, /機種[：:]\s*([^\s,，]+)/i) ||
            null;
    }
    extractMachineNumber(jsonData) {
        return jsonData.machineNumber ||
            jsonData.metadata?.machineNumber ||
            this.extractFromContent(jsonData, /機械番号[：:]\s*([^\s,，]+)/i) ||
            null;
    }
    extractOffice(jsonData) {
        return jsonData.office ||
            jsonData.metadata?.office ||
            this.extractFromContent(jsonData, /事業所[：:]\s*([^\s,，]+)/i) ||
            null;
    }
    extractCategory(jsonData) {
        return jsonData.category ||
            jsonData.metadata?.category ||
            '故障対応';
    }
    extractKeywords(jsonData) {
        const keywords = jsonData.keywords || jsonData.metadata?.keywords || [];
        // 会話内容からキーワードを抽出
        const content = this.getAllTextContent(jsonData);
        const extractedKeywords = this.extractKeywordsFromText(content);
        return [...new Set([...keywords, ...extractedKeywords])];
    }
    extractEmergencyGuideTitle(jsonData) {
        return jsonData.emergencyGuideTitle ||
            jsonData.metadata?.emergencyGuideTitle ||
            null;
    }
    extractEmergencyGuideContent(jsonData) {
        return jsonData.emergencyGuideContent ||
            jsonData.metadata?.emergencyGuideContent ||
            null;
    }
    extractFromContent(jsonData, regex) {
        const content = this.getAllTextContent(jsonData);
        const match = content.match(regex);
        return match ? match[1].trim() : null;
    }
    getAllTextContent(jsonData) {
        let content = '';
        if (jsonData.conversationHistory) {
            content += jsonData.conversationHistory
                .map((msg) => msg.content || '')
                .join(' ');
        }
        if (jsonData.title)
            content += ' ' + jsonData.title;
        if (jsonData.description)
            content += ' ' + jsonData.description;
        return content;
    }
    extractKeywordsFromText(text) {
        const keywords = [];
        // 技術用語を抽出
        const technicalTerms = [
            '故障', 'エラー', '異常', '不具合', '停止', '異音', '振動',
            '温度', '圧力', '油圧', 'センサー', 'モーター', 'ベルト',
            '交換', '修理', '調整', '清掃', '点検', '保守'
        ];
        technicalTerms.forEach(term => {
            if (text.includes(term)) {
                keywords.push(term);
            }
        });
        return keywords;
    }
}
exports.FaultHistoryService = FaultHistoryService;
// シングルトンインスタンス
exports.faultHistoryService = new FaultHistoryService();
