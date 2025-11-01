import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { eq, desc, and, sql } from 'drizzle-orm';
import { faultHistory, faultHistoryImages } from '../db/schema.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
/**
 * 故障履歴サービス
 * 環境変数に基づいてデータベースまたはファイルシステムに保存
 */
export class FaultHistoryService {
    db;
    useDatabase;
    imagesDir;
    constructor() {
        // 強制的にファイルモードで動作（DB関連を削除）
        this.useDatabase = false;
        // 画像保存ディレクトリを設定
        this.imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
            path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
        console.log('🔧 故障履歴サービス初期化: ファイルモード（強制）');
        console.log(`📁 画像保存ディレクトリ: ${this.imagesDir}`);
    }
    initializeDatabase() {
        try {
            if (process.env.DATABASE_URL?.startsWith('postgres')) {
                // PostgreSQL
                const client = postgres(process.env.DATABASE_URL);
                this.db = drizzlePg(client);
                console.log('📊 PostgreSQL接続初期化完了');
            }
            else {
                // SQLite (ローカル開発用)
                const sqlite = new Database(process.env.DATABASE_URL || 'app.db');
                this.db = drizzle(sqlite);
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
        const id = uuidv4();
        const now = new Date();
        // JSONデータから基本情報を抽出
        const title = options.title || this.extractTitle(jsonData);
        const description = options.description || this.extractDescription(jsonData);
        const machineType = this.extractMachineType(jsonData);
        const machineNumber = this.extractMachineNumber(jsonData);
        const office = this.extractOffice(jsonData);
        const category = this.extractCategory(jsonData);
        const keywords = this.extractKeywords(jsonData);
        const emergencyGuideTitle = this.extractEmergencyGuideTitle(jsonData);
        const emergencyGuideContent = this.extractEmergencyGuideContent(jsonData);
        
        console.log('📋 抽出した情報:', { title, machineType, machineNumber, office, category });
        // 画像を抽出・保存
        let imagePaths = [];
        let imageRecords = [];
        if (options.extractImages !== false) {
            const imageExtraction = await this.extractAndSaveImages(jsonData, id);
            imagePaths = imageExtraction.imagePaths;
            imageRecords = imageExtraction.imageRecords;
        }
        if (this.useDatabase) {
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
                    storageMode: 'database',
                    createdAt: now,
                    updatedAt: now,
                };
                await this.db.insert(faultHistory).values(historyRecord);
                // 画像レコードを保存
                if (imageRecords.length > 0) {
                    await this.db.insert(faultHistoryImages).values(imageRecords);
                }
                console.log(`✅ 故障履歴をデータベースに保存: ${id}`);
            }
            catch (error) {
                console.error('❌ データベース保存エラー:', error);
                throw error;
            }
        }
        else {
            // ファイルシステムに保存
            const exportDir = process.env.LOCAL_EXPORT_DIR ||
                path.join(process.cwd(), 'knowledge-base', 'exports');
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }
            const filePath = path.join(exportDir, `${id}.json`);
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
                    storageMode: 'file',
                    imagePaths,
                    imageRecords,
                },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
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
                let query = this.db.select().from(faultHistory);
                const conditions = [];
                if (options.machineType) {
                    conditions.push(eq(faultHistory.machineType, options.machineType));
                }
                if (options.machineNumber) {
                    conditions.push(eq(faultHistory.machineNumber, options.machineNumber));
                }
                if (options.category) {
                    conditions.push(eq(faultHistory.category, options.category));
                }
                if (options.office) {
                    conditions.push(eq(faultHistory.office, options.office));
                }
                if (options.keyword) {
                    conditions.push(sql `${faultHistory.title} ILIKE ${`%${options.keyword}%`} OR 
                ${faultHistory.description} ILIKE ${`%${options.keyword}%`}`);
                }
                if (conditions.length > 0) {
                    query = query.where(and(...conditions));
                }
                const items = await query
                    .orderBy(desc(faultHistory.createdAt))
                    .limit(limit)
                    .offset(offset);
                // 総数を取得
                const totalQuery = await this.db
                    .select({ count: sql `count(*)` })
                    .from(faultHistory);
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
                    .from(faultHistory)
                    .where(eq(faultHistory.id, id))
                    .limit(1);
                if (!item || item.length === 0) {
                    return null;
                }
                // 関連画像を取得
                const images = await this.db
                    .select()
                    .from(faultHistoryImages)
                    .where(eq(faultHistoryImages.faultHistoryId, id));
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
                path.join(process.cwd(), 'knowledge-base', 'exports');
            // UUIDで検索する場合、複合ファイル名からUUIDを抽出してファイルを検索
            let fileName = `${id}.json`;
            // 複合IDの場合、UUIDを抽出してファイルを検索
            const uuidMatch = id.match(/_([a-f0-9-]{36})_/);
            if (uuidMatch) {
                const uuid = uuidMatch[1];
                // UUIDから実際のファイル名を検索
                const files = fs.readdirSync(exportDir);
                const matchingFile = files.find(file => file.includes(uuid) && file.endsWith('.json'));
                if (matchingFile) {
                    fileName = matchingFile;
                }
            }
            const filePath = path.join(exportDir, fileName);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        }
    }
    /**
     * ファイルシステムから故障履歴一覧を取得
     */
    async getFaultHistoryFromFiles(options) {
        const exportDir = process.env.LOCAL_EXPORT_DIR ||
            path.join(process.cwd(), 'knowledge-base', 'exports');
        if (!fs.existsSync(exportDir)) {
            return { items: [], total: 0 };
        }
        const files = fs.readdirSync(exportDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
            try {
                const filePath = path.join(exportDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                // ファイル名からUUIDを抽出（複合ID対応）
                const fileName = file.replace('.json', '');
                const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
                const actualId = uuidMatch ? uuidMatch[1] : fileName;
                
                // 新構造JSONから機種・機械番号を抽出して既存データに追加
                let item = {
                    ...data,
                    id: actualId,
                    originalFileName: fileName,
                };
                
                // chatData構造から情報を抽出（既存データに情報がない場合のみ）
                if (!item.machineType && data.chatData?.machineInfo?.machineTypeName) {
                    item.machineType = data.chatData.machineInfo.machineTypeName;
                    console.log('🔍 機種抽出:', item.machineType);
                }
                if (!item.machineNumber && data.chatData?.machineInfo?.machineNumber) {
                    item.machineNumber = data.chatData.machineInfo.machineNumber;
                    console.log('🔍 機械番号抽出:', item.machineNumber);
                }
                
                // 画像URLを整理（media配列から取得）
                if (data.chatData?.messages && !item.images) {
                    const images = [];
                    for (const message of data.chatData.messages) {
                        if (message.media && Array.isArray(message.media)) {
                            for (const media of message.media) {
                                if (media.type === 'image' && media.url) {
                                    // URLからファイル名を抽出
                                    const fileName = media.url.split('/').pop();
                                    images.push({
                                        id: `img_${images.length}`,
                                        fileName: fileName,
                                        originalFileName: fileName,
                                        url: media.url,
                                    });
                                }
                            }
                        }
                    }
                    if (images.length > 0) {
                        item.images = images;
                    }
                }
                
                // createdAt/updatedAtが存在しない場合は追加
                if (!item.createdAt && data.exportTimestamp) {
                    item.createdAt = data.exportTimestamp;
                }
                if (!item.updatedAt && data.exportTimestamp) {
                    item.updatedAt = data.exportTimestamp;
                }
                
                return item;
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
            // 会話履歴から画像を抽出
            const conversationHistory = jsonData.conversationHistory || [];
            for (let i = 0; i < conversationHistory.length; i++) {
                const message = conversationHistory[i];
                if (message.content && typeof message.content === 'string') {
                    // Base64画像データを検出
                    const base64Matches = message.content.match(/data:image\/([^;]+);base64,([^"]+)/g);
                    if (base64Matches) {
                        for (let j = 0; j < base64Matches.length; j++) {
                            const match = base64Matches[j];
                            const [, mimeType, base64Data] = match.match(/data:image\/([^;]+);base64,(.+)/) || [];
                            if (mimeType && base64Data) {
                                // sharpでjpeg形式で保存するため、拡張子をjpegに統一
                                const fileName = `${historyId}_${i}_${j}.jpeg`;
                                const filePath = path.join(this.imagesDir, fileName);
                                try {
                                    // Base64をデコードして保存
                                    const buffer = Buffer.from(base64Data, 'base64');
                                    // 画像を最適化して保存（150dpi相当サイズ）
                                    await sharp(buffer)
                                        .resize(620, 437, { fit: 'inside', withoutEnlargement: true })
                                        .jpeg({ quality: 85 })
                                        .toFile(filePath);
                                    imagePaths.push(filePath);
                                    // データベース記録用
                                    const imageRecord = {
                                        id: uuidv4(),
                                        faultHistoryId: historyId,
                                        originalFileName: `message_${i}_image_${j}.${mimeType}`,
                                        fileName,
                                        filePath: path.relative(process.cwd(), filePath),
                                        relativePath: `images/chat-exports/${fileName}`,
                                        mimeType: `image/${mimeType}`,
                                        fileSize: buffer.length.toString(),
                                        description: `Message ${i + 1} - Image ${j + 1}`,
                                        createdAt: new Date(),
                                    };
                                    imageRecords.push(imageRecord);
                                    console.log(`📷 画像保存: ${fileName} (${buffer.length} bytes)`);
                                }
                                catch (imageError) {
                                    console.error(`❌ 画像保存エラー: ${fileName}`, imageError);
                                }
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
        // 新しいJSON構造に対応: chatData.machineInfo.machineTypeName
        if (jsonData.chatData?.machineInfo?.machineTypeName) {
            return jsonData.chatData.machineInfo.machineTypeName;
        }
        // 旧構造に対応
        return jsonData.machineType ||
            jsonData.metadata?.machineType ||
            this.extractFromContent(jsonData, /機種[：:]\s*([^\s,，]+)/i) ||
            null;
    }
    extractMachineNumber(jsonData) {
        // 新しいJSON構造に対応: chatData.machineInfo.machineNumber
        if (jsonData.chatData?.machineInfo?.machineNumber) {
            return jsonData.chatData.machineInfo.machineNumber;
        }
        // 旧構造に対応
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
// シングルトンインスタンス
export const faultHistoryService = new FaultHistoryService();
