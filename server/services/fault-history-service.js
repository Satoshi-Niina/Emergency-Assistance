import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { faultHistory, faultHistoryImages } from '../db/schema.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
/**
 * 故障履歴サービス
 * 環境変数に基づいてデータベースまたはファイルシステムに保存
 */
export class FaultHistoryService {
    db;
    useDatabase;
    imagesDir;
    constructor() {
        // 標準はファイルシステム、DATABASE_BACKUP=trueの場合のみDBにもバックアップ
        this.useDatabase = process.env.DATABASE_BACKUP === 'true' && !!process.env.DATABASE_URL;
        // 画像保存ディレクトリを設定
        this.imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
            path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
        if (this.useDatabase) {
            this.initializeDatabase();
            console.log('🔧 故障履歴サービス初期化: ファイルモード + DBバックアップ');
        }
        else {
            console.log('🔧 故障履歴サービス初期化: ファイルモード（標準）');
        }
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
        const { title = options.title || this.extractTitle(jsonData), description = options.description || this.extractDescription(jsonData), machineType = this.extractMachineType(jsonData), machineNumber = this.extractMachineNumber(jsonData), office = this.extractOffice(jsonData), category = this.extractCategory(jsonData), keywords = this.extractKeywords(jsonData), emergencyGuideTitle = this.extractEmergencyGuideTitle(jsonData), emergencyGuideContent = this.extractEmergencyGuideContent(jsonData), } = {};
        // 画像を抽出・保存
        let imagePaths = [];
        let imageRecords = [];
        if (options.extractImages !== false) {
            const imageExtraction = await this.extractAndSaveImages(jsonData, id);
            imagePaths = imageExtraction.imagePaths;
            imageRecords = imageExtraction.imageRecords;
        }
        // 常にファイルシステムに保存（標準）
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
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), { encoding: 'utf8' });
        console.log(`✅ 故障履歴をファイルに保存: ${filePath}`);

        // Blob Storageへの保存を試行 (Azure環境またはBlobモードの場合)
        try {
            const { isAzureEnvironment } = await import('../src/config/env.mjs');
            if (isAzureEnvironment()) {
                const { getBlobServiceClient, containerName, norm, upload } = await import('../src/infra/blob.mjs');
                const blobServiceClient = getBlobServiceClient();

                if (blobServiceClient) {
                    const containerClient = blobServiceClient.getContainerClient(containerName);
                    await containerClient.createIfNotExists();

                    // 1. JSONファイルのアップロード
                    const blobName = norm(`exports/${id}.json`);
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                    await blockBlobClient.uploadFile(filePath, {
                        blobHTTPHeaders: { blobContentType: 'application/json' }
                    });
                    console.log(`☁️ 故障履歴をBlobに保存: ${blobName}`);

                    // 2. 画像のアップロード
                    for (const imagePath of imagePaths) {
                        if (fs.existsSync(imagePath)) {
                            const imageFileName = path.basename(imagePath);
                            const imageBlobName = norm(`images/chat-exports/${imageFileName}`);
                            const imageBlobClient = containerClient.getBlockBlobClient(imageBlobName);

                            if (!(await imageBlobClient.exists())) {
                                await imageBlobClient.uploadFile(imagePath, {
                                    blobHTTPHeaders: { blobContentType: 'image/jpeg' } // 簡易判定
                                });
                                console.log(`☁️ 画像をBlobに保存: ${imageBlobName}`);
                            }
                        }
                    }
                }
            }
        } catch (blobError) {
            console.error('⚠️ Blob保存エラー (ローカル保存は完了):', blobError);
        }

        // DBバックアップが有効な場合のみデータベースにも保存
        if (this.useDatabase) {
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
                    storageMode: 'file',
                    createdAt: now,
                    updatedAt: now,
                };
                await this.db.insert(faultHistory).values(historyRecord);
                // 画像レコードを保存
                if (imageRecords.length > 0) {
                    await this.db.insert(faultHistoryImages).values(imageRecords);
                }
                console.log(`💾 データベースバックアップ完了: ${id}`);
            }
            catch (error) {
                console.error('⚠️ データベースバックアップエラー（ファイル保存は成功）:', error);
                // バックアップ失敗でもファイル保存は成功しているのでエラーにしない
            }
        }
        return { id, imagePaths };
    }
    /**
     * 故障履歴一覧を取得
     */
    async getFaultHistoryList(options = {}) {
        // 常にファイルシステムから取得（標準）
        return this.getFaultHistoryFromFiles(options);
    }
    /**
     * 故障履歴詳細を取得
     */
    async getFaultHistoryById(id) {
        // 常にファイルシステムから取得（標準）
        {
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
        console.log(`📁 エクスポートディレクトリを確認: ${exportDir}`);
        console.log(`📁 ディレクトリの存在: ${fs.existsSync(exportDir)}`);
        if (!fs.existsSync(exportDir)) {
            console.log(`📁 エクスポートディレクトリが存在しません: ${exportDir}`);
            return { items: [], total: 0 };
        }
        const allFiles = fs.readdirSync(exportDir);
        console.log(`📁 ディレクトリ内の全ファイル:`, allFiles);
        const jsonFiles = allFiles.filter(file => file.endsWith('.json') && !file.includes('railway-maintenance'));
        console.log(`📁 JSONファイル数: ${jsonFiles.length}`, jsonFiles);
        const files = jsonFiles
            .map(file => {
                try {
                    const filePath = path.join(exportDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    // ファイル名からUUIDを抽出（複合ID対応）
                    const fileName = file.replace('.json', '');
                    const uuidMatch = fileName.match(/_([a-f0-9-]{36})_/);
                    const actualId = uuidMatch ? uuidMatch[1] : (data.chatId || fileName);
                    // 既存のJSONファイル構造に対応
                    // chatData構造から情報を抽出
                    const chatData = data.chatData || {};
                    const machineInfo = chatData.machineInfo || {};
                    // 基本情報を抽出
                    const title = data.title || '故障履歴';
                    const machineType = data.machineType ||
                        machineInfo.machineTypeName ||
                        machineInfo.selectedMachineType ||
                        null;
                    const machineNumber = data.machineNumber ||
                        machineInfo.machineNumber ||
                        machineInfo.selectedMachineNumber ||
                        null;
                    const createdAt = data.createdAt ||
                        data.exportTimestamp ||
                        data.chatData?.timestamp ||
                        new Date().toISOString();
                    // 画像情報を構築（複数のソースから抽出）
                    const images = [];
                    // data.savedImages から抽出
                    const savedImagesArray = data.savedImages || data.jsonData?.savedImages || [];
                    console.log(`📷 [${file}] 画像配列取得:`, savedImagesArray?.length || 0, '件');
                    if (Array.isArray(savedImagesArray)) {
                        for (const savedImage of savedImagesArray) {
                            if (savedImage && typeof savedImage === 'object' && savedImage.fileName) {
                                const imageFileName = savedImage.fileName;
                                const imageFilePath = path.join(this.imagesDir, imageFileName);
                                // ファイルが存在するか確認
                                const exists = fs.existsSync(imageFilePath);
                                console.log(`  📄 [${imageFileName}] 存在: ${exists}`, '実際のパス:', imageFilePath);
                                if (exists) {
                                    images.push({
                                        id: uuidv4(),
                                        faultHistoryId: actualId,
                                        // チャットエクスポート形式（fileName, path, url）とDB形式（originalFileName, mimeType等）の両方に対応
                                        originalFileName: savedImage.originalFileName || savedImage.fileName || imageFileName,
                                        fileName: imageFileName,
                                        filePath: path.relative(process.cwd(), imageFilePath),
                                        relativePath: `images/chat-exports/${imageFileName}`,
                                        mimeType: savedImage.mimeType || 'image/jpeg',
                                        fileSize: savedImage.fileSize || '0',
                                        description: savedImage.description || `Image ${imageFileName}`,
                                        createdAt: new Date(savedImage.createdAt || createdAt),
                                    });
                                }
                                else {
                                    console.warn(`⚠️ [${imageFileName}] ファイルが見つかりません: ${imageFilePath}`);
                                }
                            }
                        }
                    }
                    console.log(`📷 [${file}] 最終的な画像数:`, images.length, '件');
                    // メッセージから画像URLを検出
                    const messages = chatData.messages || [];
                    for (const message of messages) {
                        if (message.content && typeof message.content === 'string') {
                            // URL形式の画像を検出
                            if (message.content.startsWith('/api/images/') ||
                                message.content.startsWith('http') ||
                                message.content.match(/chat_image_.*\.(jpg|jpeg|png|gif)/i)) {
                                const urlParts = message.content.split('/');
                                const imageFileName = urlParts[urlParts.length - 1];
                                const imageFilePath = path.join(this.imagesDir, imageFileName);
                                // 既に追加されていないか確認
                                if (fs.existsSync(imageFilePath) &&
                                    !images.some(img => img.fileName === imageFileName)) {
                                    images.push({
                                        id: uuidv4(),
                                        faultHistoryId: actualId,
                                        originalFileName: imageFileName,
                                        fileName: imageFileName,
                                        filePath: path.relative(process.cwd(), imageFilePath),
                                        relativePath: `images/chat-exports/${imageFileName}`,
                                        mimeType: 'image/jpeg',
                                        fileSize: '0',
                                        description: `Message image: ${imageFileName}`,
                                        createdAt: new Date(message.timestamp || createdAt),
                                    });
                                }
                            }
                        }
                    }
                    // 統一された形式で返す
                    return {
                        id: actualId,
                        title,
                        description: data.description || '',
                        machineType,
                        machineNumber,
                        office: data.office || null,
                        category: data.category || '故障対応',
                        keywords: data.keywords || [],
                        emergencyGuideTitle: data.emergencyGuideTitle || null,
                        emergencyGuideContent: data.emergencyGuideContent || null,
                        jsonData: data,
                        storageMode: 'file',
                        filePath: filePath,
                        createdAt,
                        updatedAt: createdAt,
                        images,
                        // 元のデータも保持（互換性のため）
                        chatId: data.chatId || actualId,
                        userId: data.userId || '',
                        exportType: data.exportType || 'manual_send',
                        exportTimestamp: data.exportTimestamp || createdAt,
                        savedImages: data.savedImages || [],
                        originalFileName: fileName,
                    };
                }
                catch (error) {
                    console.error(`ファイル読み込みエラー: ${file}`, error);
                    return null;
                }
            })
            .filter(item => item !== null);
        console.log(`📋 ファイルから読み込んだ履歴: ${files.length}件`);
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
        // ソート（createdAtが存在する場合）
        filteredItems.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        // ページング
        const { limit = 20, offset = 0 } = options;
        const paginatedItems = filteredItems.slice(offset, offset + limit);
        console.log(`📊 フィルタリング後: ${filteredItems.length}件, ページング後: ${paginatedItems.length}件`);
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
                        const filePath = path.join(this.imagesDir, fileName);
                        // ファイルが存在する場合のみ記録
                        if (fs.existsSync(filePath)) {
                            imagePaths.push(filePath);
                            const imageRecord = {
                                id: uuidv4(),
                                faultHistoryId: historyId,
                                // チャットエクスポート形式（fileName, path, url）とDB形式（originalFileName, mimeType等）の両方に対応
                                originalFileName: savedImage.originalFileName || savedImage.fileName || fileName,
                                fileName,
                                filePath: path.relative(process.cwd(), filePath),
                                relativePath: `images/chat-exports/${fileName}`,
                                mimeType: savedImage.mimeType || 'image/jpeg',
                                fileSize: savedImage.fileSize || '0',
                                description: savedImage.description || `Image ${fileName}`,
                                createdAt: new Date(),
                            };
                            imageRecords.push(imageRecord);
                            console.log(`📷 画像記録: ${fileName}`);
                        }
                        else {
                            console.warn(`⚠️ 画像ファイルが見つかりません: ${filePath}`);
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
                        const filePath = path.join(this.imagesDir, fileName);
                        // ファイルが存在する場合のみ記録
                        if (fs.existsSync(filePath)) {
                            if (!imagePaths.includes(filePath)) {
                                imagePaths.push(filePath);
                                const imageRecord = {
                                    id: uuidv4(),
                                    faultHistoryId: historyId,
                                    originalFileName: fileName,
                                    fileName,
                                    filePath: path.relative(process.cwd(), filePath),
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
// シングルトンインスタンス
export const faultHistoryService = new FaultHistoryService();
