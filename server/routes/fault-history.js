import { Router } from 'express';
import { faultHistoryService } from '../services/fault-history-service.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = Router();
// 画像アップロード設定
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
/**
 * POST /api/fault-history
 * 故障履歴を保存
 */
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const { jsonData, title, description, extractImages = 'true' } = req.body;
        if (!jsonData) {
            return res.status(400).json({
                success: false,
                error: 'JSONデータが必要です',
            });
        }
        let parsedJsonData;
        try {
            parsedJsonData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: 'JSONデータの形式が正しくありません',
            });
        }
        const result = await faultHistoryService.saveFaultHistory(parsedJsonData, {
            title,
            description,
            extractImages: extractImages === 'true',
        });
        console.log(`✅ 故障履歴保存完了: ${result.id}`);
        res.json({
            success: true,
            message: '故障履歴を保存しました',
            id: result.id,
            imagePaths: result.imagePaths,
            imageCount: result.imagePaths?.length || 0,
        });
    }
    catch (error) {
        console.error('❌ 故障履歴保存エラー:', error);
        res.status(500).json({
            success: false,
            error: '故障履歴の保存に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/fault-history
 * 故障履歴一覧を取得
 */
router.get('/', async (req, res) => {
    try {
        const { limit = '20', offset = '0', machineType, machineNumber, category, office, keyword, } = req.query;
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            machineType: machineType,
            machineNumber: machineNumber,
            category: category,
            office: office,
            keyword: keyword,
        };
        const result = await faultHistoryService.getFaultHistoryList(options);
        console.log(`📋 故障履歴一覧取得: ${result.items.length}件 / 総数 ${result.total}件`);
        res.json({
            success: true,
            data: result.items,
            total: result.total,
            limit: options.limit,
            offset: options.offset,
            hasMore: result.total > options.offset + options.limit,
        });
    }
    catch (error) {
        console.error('❌ 故障履歴一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '故障履歴の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/fault-history/:id
 * 故障履歴詳細を取得
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'IDが必要です',
            });
        }
        const item = await faultHistoryService.getFaultHistoryById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: '故障履歴が見つかりません',
            });
        }
        console.log(`📄 故障履歴詳細取得: ${id}`);
        res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error('❌ 故障履歴詳細取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '故障履歴の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/fault-history/images/:filename
 * 故障履歴画像を取得
 */
router.get('/images/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        // ファイル名のバリデーション（chat_image_を含む形式に対応）
        if (!filename || !filename.match(/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i)) {
            return res.status(400).json({
                success: false,
                error: '無効なファイル名です',
            });
        }
        // BLOBストレージから画像取得
        try {
            const { AzureStorageService } = require('../azure-storage.js');
            const azureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING ? new AzureStorageService() : null;
            if (!azureStorage) {
                return res.status(503).json({ success: false, error: 'BLOBストレージが利用できません' });
            }
            const blobName = `images/chat-exports/${filename}`;
            const blockBlobClient = azureStorage.containerClient.getBlockBlobClient(blobName);
            const exists = await blockBlobClient.exists();
            if (!exists) {
                return res.status(404).json({ success: false, error: '画像ファイルが見つかりません' });
            }
            const downloadResponse = await blockBlobClient.download();
            res.set({
                'Content-Type': downloadResponse.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                'Last-Modified': downloadResponse.lastModified?.toUTCString() || new Date().toUTCString(),
            });
            downloadResponse.readableStreamBody.pipe(res);
        }
        catch (error) {
            console.error('❌ BLOB画像取得エラー:', error);
            res.status(500).json({ success: false, error: '画像の取得に失敗しました', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    catch (error) {
        console.error('❌ 画像ファイル取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '画像の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/fault-history/import-from-exports
 * 既存のexportsディレクトリからデータベースに移行
 */
router.post('/import-from-exports', async (req, res) => {
    try {
        const { force = false } = req.body;
        console.log('📥 exportsディレクトリからの移行開始');
        // BLOBストレージからエクスポートファイル一覧取得
        const { AzureStorageService } = require('../azure-storage.js');
        const azureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING ? new AzureStorageService() : null;
        if (!azureStorage) {
            return res.json({ success: false, error: 'BLOBストレージが利用できません', imported: 0, skipped: 0 });
        }
        const files = (await azureStorage.listFiles('exports/')).filter(file => file.endsWith('.json'));
        let imported = 0;
        let skipped = 0;
        const errors = [];
        for (const file of files) {
            try {
                const content = await azureStorage.readFileAsString(`exports/${file}`);
                const jsonData = JSON.parse(content);
                // 既存チェック（forceが有効でない場合）
                const id = file.replace('.json', '');
                if (!force) {
                    const existing = await faultHistoryService.getFaultHistoryById(id);
                    if (existing) {
                        skipped++;
                        continue;
                    }
                }
                await faultHistoryService.saveFaultHistory(jsonData, {
                    title: jsonData.title || `Imported: ${file}`,
                    extractImages: true,
                });
                imported++;
                console.log(`✅ インポート完了: ${file}`);
            }
            catch (error) {
                const errorMsg = `${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMsg);
                console.error(`❌ インポートエラー: ${errorMsg}`);
            }
        }
        console.log(`📥 移行完了: ${imported}件インポート, ${skipped}件スキップ`);
        res.json({
            success: true,
            message: `移行が完了しました: ${imported}件インポート, ${skipped}件スキップ`,
            imported,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            totalFiles: files.length,
        });
    }
    catch (error) {
        console.error('❌ 移行エラー:', error);
        res.status(500).json({
            success: false,
            error: '移行に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/fault-history/stats
 * 故障履歴統計情報を取得
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await faultHistoryService.getFaultHistoryList({ limit: 10000 });
        const stats = {
            total: result.total,
            byMachineType: {},
            byCategory: {},
            byOffice: {},
            recentCount: 0,
        };
        // 統計を集計
        result.items.forEach(item => {
            if (item.machineType) {
                stats.byMachineType[item.machineType] = (stats.byMachineType[item.machineType] || 0) + 1;
            }
            if (item.category) {
                stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
            }
            if (item.office) {
                stats.byOffice[item.office] = (stats.byOffice[item.office] || 0) + 1;
            }
            // 30日以内の件数
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (new Date(item.createdAt) > thirtyDaysAgo) {
                stats.recentCount++;
            }
        });
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('❌ 統計情報取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '統計情報の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * DELETE /api/fault-history/:id
 * 故障履歴を削除
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'IDが必要です',
            });
        }
        // 故障履歴を取得
        const item = await faultHistoryService.getFaultHistoryById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: '故障履歴が見つかりません',
            });
        }
        console.log(`🗑️ 故障履歴削除開始: ${id}`);
        // 関連する画像を削除（savedImages または images から取得）
        const images = item.images || item.savedImages || [];
        const isProduction = process.env.NODE_ENV === 'production';
        if (images.length > 0) {
            for (const image of images) {
                try {
                    const fileName = image.fileName || image.originalFileName;
                    if (fileName) {
                        // 開発環境: ローカルファイルを削除
                        if (!isProduction) {
                            const imagePath = path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports', fileName);
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                                console.log(`🗑️ 画像削除（ローカル）: ${fileName}`);
                            }
                            else {
                                console.warn(`⚠️ 画像ファイルが見つかりません: ${imagePath}`);
                            }
                        }
                        // 本番環境: Azure Storageから削除
                        if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
                            try {
                                const { AzureStorageService } = require('../azure-storage.js');
                                const azureStorage = new AzureStorageService();
                                const blobName = `images/chat-exports/${fileName}`;
                                await azureStorage.deleteFile(blobName);
                                console.log(`🗑️ 画像削除（Azure）: ${blobName}`);
                            }
                            catch (azureError) {
                                console.warn(`⚠️ Azure画像削除エラー:`, azureError);
                            }
                        }
                    }
                }
                catch (imageError) {
                    console.warn(`⚠️ 画像削除エラー:`, imageError);
                }
            }
        }
        // JSONファイルを削除（ファイル名からパスを構築）
        const exportDir = process.env.LOCAL_EXPORT_DIR ||
            path.join(process.cwd(), 'knowledge-base', 'exports');
        // UUIDでファイル名を検索
        let jsonFilePath = path.join(exportDir, `${id}.json`);
        // 複合IDの場合、UUIDを抽出してファイルを検索
        const uuidMatch = id.match(/_([a-f0-9-]{36})_/);
        if (uuidMatch) {
            const uuid = uuidMatch[1];
            const files = fs.readdirSync(exportDir);
            const matchingFile = files.find(file => file.includes(uuid) && file.endsWith('.json'));
            if (matchingFile) {
                jsonFilePath = path.join(exportDir, matchingFile);
            }
        }
        try {
            // 開発環境: ローカルファイルを削除
            if (!isProduction) {
                if (fs.existsSync(jsonFilePath)) {
                    fs.unlinkSync(jsonFilePath);
                    console.log(`🗑️ JSONファイル削除（ローカル）: ${jsonFilePath}`);
                }
                else {
                    console.warn(`⚠️ JSONファイルが見つかりません: ${jsonFilePath}`);
                }
            }
            // 本番環境: Azure Storageから削除
            if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
                try {
                    const { AzureStorageService } = require('../azure-storage.js');
                    const azureStorage = new AzureStorageService();
                    const jsonFileName = path.basename(jsonFilePath);
                    const blobName = `exports/${jsonFileName}`;
                    await azureStorage.deleteFile(blobName);
                    console.log(`🗑️ JSONファイル削除（Azure）: ${blobName}`);
                }
                catch (azureError) {
                    console.warn(`⚠️ Azure JSON削除エラー:`, azureError);
                }
            }
        }
        catch (fileError) {
            console.warn(`⚠️ JSONファイル削除エラー:`, fileError);
        }
        // データベースから削除（データベースモードの場合）
        // TODO: データベースから削除する処理を実装
        console.log(`✅ 故障履歴削除完了: ${id}`);
        res.json({
            success: true,
            message: '故障履歴を削除しました',
            id,
        });
    }
    catch (error) {
        console.error('❌ 故障履歴削除エラー:', error);
        res.status(500).json({
            success: false,
            error: '故障履歴の削除に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
