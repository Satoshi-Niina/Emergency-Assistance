"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const router = express_1.default.Router();
/**
 * 統合データAPI - DBとローカルフォルダの総括的な操作エンドポイント
 */
// データベース総括情報取得
router.get('/db-overview', async (_req, res) => {
    try {
        console.log('📊 データベース総括情報取得開始');
        // 各テーブルの件数を取得
        const [userCount, supportHistoryCount, baseDocumentCount, historyItemCount, historyImageCount, machineCount, machineTypeCount, imageCount] = await Promise.all([
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.users),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.supportHistory),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.baseDocuments),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.historyItems),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.historyImages),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.machines),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.machineTypes),
            index_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.images),
        ]);
        // 最新データ取得日時
        const latestData = await Promise.all([
            index_js_1.db.select({ latestDate: (0, drizzle_orm_1.sql) `MAX(created_at)` }).from(schema_js_1.supportHistory),
            index_js_1.db.select({ latestDate: (0, drizzle_orm_1.sql) `MAX(created_at)` }).from(schema_js_1.baseDocuments),
            index_js_1.db.select({ latestDate: (0, drizzle_orm_1.sql) `MAX(created_at)` }).from(schema_js_1.historyItems),
        ]);
        const overview = {
            success: true,
            timestamp: new Date().toISOString(),
            statistics: {
                users: userCount[0].count,
                supportHistory: supportHistoryCount[0].count,
                baseDocuments: baseDocumentCount[0].count,
                historyItems: historyItemCount[0].count,
                historyImages: historyImageCount[0].count,
                machines: machineCount[0].count,
                machineTypes: machineTypeCount[0].count,
                images: imageCount[0].count,
            },
            lastUpdated: {
                supportHistory: latestData[0][0]?.latestDate,
                baseDocuments: latestData[1][0]?.latestDate,
                historyItems: latestData[2][0]?.latestDate,
            }
        };
        console.log('✅ データベース総括情報取得完了:', overview.statistics);
        res.json(overview);
    }
    catch (error) {
        console.error('❌ データベース総括情報取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データベース総括情報の取得に失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
// ローカルフォルダ総括情報取得
router.get('/folder-overview', async (_req, res) => {
    try {
        console.log('📁 ローカルフォルダ総括情報取得開始');
        const baseDir = path_1.default.join(__dirname, '../../');
        const foldersToCheck = [
            'knowledge-base',
            'uploads',
            'public',
            'client/public',
            'logs',
            'backups'
        ];
        const folderInfo = [];
        for (const folder of foldersToCheck) {
            const folderPath = path_1.default.join(baseDir, folder);
            try {
                const stats = await promises_1.default.stat(folderPath);
                if (stats.isDirectory()) {
                    const files = await promises_1.default.readdir(folderPath, { withFileTypes: true });
                    const fileCount = files.filter(file => file.isFile()).length;
                    const subDirCount = files.filter(file => file.isDirectory()).length;
                    folderInfo.push({
                        name: folder,
                        path: folderPath,
                        exists: true,
                        fileCount,
                        subDirectoryCount: subDirCount,
                        lastModified: stats.mtime,
                        size: stats.size
                    });
                }
            }
            catch (error) {
                folderInfo.push({
                    name: folder,
                    path: folderPath,
                    exists: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        const overview = {
            success: true,
            timestamp: new Date().toISOString(),
            baseDirectory: baseDir,
            folders: folderInfo,
            totalFolders: folderInfo.filter(f => f.exists).length,
            totalFiles: folderInfo.reduce((sum, f) => sum + (f.fileCount || 0), 0)
        };
        console.log('✅ ローカルフォルダ総括情報取得完了');
        res.json(overview);
    }
    catch (error) {
        console.error('❌ ローカルフォルダ総括情報取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ローカルフォルダ総括情報の取得に失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
// 統合データ検索
router.post('/search', async (req, res) => {
    try {
        const { query, searchType = 'all', // 'db', 'files', 'all'
        limit = 50, offset = 0 } = req.body;
        console.log(`🔍 統合データ検索開始: query="${query}", type="${searchType}"`);
        const results = {
            success: true,
            query,
            searchType,
            timestamp: new Date().toISOString(),
            results: {
                database: [],
                files: []
            }
        };
        // データベース検索
        if (searchType === 'all' || searchType === 'db') {
            const dbResults = await Promise.all([
                // サポート履歴検索
                index_js_1.db.select({
                    id: schema_js_1.supportHistory.id,
                    type: (0, drizzle_orm_1.sql) `'support_history'`,
                    title: (0, drizzle_orm_1.sql) `CONCAT('機種: ', ${schema_js_1.supportHistory.machineType}, ' 機械番号: ', ${schema_js_1.supportHistory.machineNumber})`,
                    content: schema_js_1.supportHistory.jsonData,
                    createdAt: schema_js_1.supportHistory.createdAt
                })
                    .from(schema_js_1.supportHistory)
                    .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_js_1.supportHistory.machineType, `%${query}%`), (0, drizzle_orm_1.like)(schema_js_1.supportHistory.machineNumber, `%${query}%`), (0, drizzle_orm_1.sql) `${schema_js_1.supportHistory.jsonData}::text ILIKE ${'%' + query + '%'}`))
                    .limit(limit)
                    .offset(offset),
                // 基礎文書検索
                index_js_1.db.select({
                    id: schema_js_1.baseDocuments.id,
                    type: (0, drizzle_orm_1.sql) `'base_document'`,
                    title: schema_js_1.baseDocuments.title,
                    content: schema_js_1.baseDocuments.filePath,
                    createdAt: schema_js_1.baseDocuments.createdAt
                })
                    .from(schema_js_1.baseDocuments)
                    .where((0, drizzle_orm_1.like)(schema_js_1.baseDocuments.title, `%${query}%`))
                    .limit(limit)
                    .offset(offset),
                // 履歴アイテム検索
                index_js_1.db.select({
                    id: schema_js_1.historyItems.id,
                    type: (0, drizzle_orm_1.sql) `'history_item'`,
                    title: schema_js_1.historyItems.title,
                    content: schema_js_1.historyItems.description,
                    createdAt: schema_js_1.historyItems.createdAt
                })
                    .from(schema_js_1.historyItems)
                    .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_js_1.historyItems.title, `%${query}%`), (0, drizzle_orm_1.like)(schema_js_1.historyItems.description, `%${query}%`)))
                    .limit(limit)
                    .offset(offset)
            ]);
            results.results.database = dbResults.flat();
        }
        // ファイル検索
        if (searchType === 'all' || searchType === 'files') {
            const searchDirs = [
                path_1.default.join(__dirname, '../../knowledge-base'),
                path_1.default.join(__dirname, '../../uploads'),
                path_1.default.join(__dirname, '../../public')
            ];
            const fileResults = [];
            for (const dir of searchDirs) {
                try {
                    const files = await searchInDirectory(dir, query);
                    fileResults.push(...files);
                }
                catch (error) {
                    console.warn(`ディレクトリ検索警告: ${dir}`, error);
                }
            }
            results.results.files = fileResults;
        }
        console.log(`✅ 統合データ検索完了: DB=${results.results.database.length}件, ファイル=${results.results.files.length}件`);
        res.json(results);
    }
    catch (error) {
        console.error('❌ 統合データ検索エラー:', error);
        res.status(500).json({
            success: false,
            error: '統合データ検索に失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
// ディレクトリ内のファイル検索関数
async function searchInDirectory(dirPath, query) {
    const results = [];
    try {
        const items = await promises_1.default.readdir(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path_1.default.join(dirPath, item.name);
            if (item.isFile() && item.name.toLowerCase().includes(query.toLowerCase())) {
                const stats = await promises_1.default.stat(fullPath);
                results.push({
                    type: 'file',
                    name: item.name,
                    path: fullPath,
                    size: stats.size,
                    lastModified: stats.mtime,
                    directory: path_1.default.basename(dirPath)
                });
            }
            else if (item.isDirectory()) {
                // 再帰的にサブディレクトリを検索
                const subResults = await searchInDirectory(fullPath, query);
                results.push(...subResults);
            }
        }
    }
    catch (error) {
        console.warn(`ディレクトリアクセスエラー: ${dirPath}`, error);
    }
    return results;
}
// データベーステーブル一覧とスキーマ情報
router.get('/db-schema', async (_req, res) => {
    try {
        console.log('📋 データベーススキーマ情報取得開始');
        // PostgreSQLのシステムカタログから情報を取得
        const tableInfo = await index_js_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `);
        // テーブルごとにグループ化
        const tables = {};
        tableInfo.forEach((row) => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = {
                    name: row.table_name,
                    type: row.table_type,
                    columns: []
                };
            }
            if (row.column_name) {
                tables[row.table_name].columns.push({
                    name: row.column_name,
                    type: row.data_type,
                    nullable: row.is_nullable === 'YES',
                    default: row.column_default
                });
            }
        });
        const schema = {
            success: true,
            timestamp: new Date().toISOString(),
            tables: Object.values(tables),
            totalTables: Object.keys(tables).length
        };
        console.log(`✅ データベーススキーマ情報取得完了: ${schema.totalTables}テーブル`);
        res.json(schema);
    }
    catch (error) {
        console.error('❌ データベーススキーマ情報取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'データベーススキーマ情報の取得に失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
// データ一括操作（バックアップ/復元）
router.post('/backup', async (_req, res) => {
    try {
        console.log('💾 データベースバックアップ開始');
        const backupDir = path_1.default.join(__dirname, '../../backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(backupDir, `backup-${timestamp}`);
        // バックアップディレクトリ作成
        await promises_1.default.mkdir(backupPath, { recursive: true });
        // 各テーブルのデータをJSONで出力
        const tablesToBackup = [
            { table: schema_js_1.users, name: 'users' },
            { table: schema_js_1.supportHistory, name: 'support_history' },
            { table: schema_js_1.baseDocuments, name: 'base_documents' },
            { table: schema_js_1.historyItems, name: 'history_items' },
            { table: schema_js_1.historyImages, name: 'history_images' },
            { table: schema_js_1.machines, name: 'machines' },
            { table: schema_js_1.machineTypes, name: 'machine_types' },
            { table: schema_js_1.images, name: 'images' }
        ];
        const backupSummary = [];
        for (const { table, name } of tablesToBackup) {
            try {
                const data = await index_js_1.db.select().from(table);
                const filePath = path_1.default.join(backupPath, `${name}.json`);
                await promises_1.default.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
                backupSummary.push({
                    table: name,
                    recordCount: data.length,
                    filePath: filePath,
                    success: true
                });
            }
            catch (error) {
                backupSummary.push({
                    table: name,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        // バックアップサマリー保存
        await promises_1.default.writeFile(path_1.default.join(backupPath, 'backup-summary.json'), JSON.stringify({
            timestamp: new Date().toISOString(),
            tables: backupSummary
        }, null, 2));
        console.log('✅ データベースバックアップ完了');
        res.json({
            success: true,
            backupPath,
            timestamp,
            tables: backupSummary,
            message: 'データベースバックアップが完了しました'
        });
    }
    catch (error) {
        console.error('❌ データベースバックアップエラー:', error);
        res.status(500).json({
            success: false,
            error: 'データベースバックアップに失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
// システム健全性チェック
router.get('/health-check', async (_req, res) => {
    try {
        console.log('🏥 システム健全性チェック開始');
        const checks = [];
        // データベース接続チェック
        try {
            await index_js_1.db.select().from(schema_js_1.users).limit(1);
            checks.push({
                name: 'データベース接続',
                status: 'OK',
                message: 'データベースに正常に接続できます'
            });
        }
        catch (error) {
            checks.push({
                name: 'データベース接続',
                status: 'ERROR',
                message: 'データベース接続に失敗しました',
                error: error instanceof Error ? error.message : String(error)
            });
        }
        // 必要ディレクトリの存在チェック
        const requiredDirs = ['knowledge-base', 'uploads', 'public'];
        for (const dir of requiredDirs) {
            const dirPath = path_1.default.join(__dirname, '../../', dir);
            try {
                await promises_1.default.access(dirPath);
                checks.push({
                    name: `ディレクトリ: ${dir}`,
                    status: 'OK',
                    message: `${dir}ディレクトリが存在します`
                });
            }
            catch (error) {
                checks.push({
                    name: `ディレクトリ: ${dir}`,
                    status: 'WARNING',
                    message: `${dir}ディレクトリが存在しません`
                });
            }
        }
        // 環境変数チェック
        const requiredEnvVars = ['DATABASE_URL', 'NODE_ENV'];
        for (const envVar of requiredEnvVars) {
            if (process.env[envVar]) {
                checks.push({
                    name: `環境変数: ${envVar}`,
                    status: 'OK',
                    message: `${envVar}が設定されています`
                });
            }
            else {
                checks.push({
                    name: `環境変数: ${envVar}`,
                    status: 'WARNING',
                    message: `${envVar}が設定されていません`
                });
            }
        }
        const overallStatus = checks.every(check => check.status === 'OK') ? 'HEALTHY' :
            checks.some(check => check.status === 'ERROR') ? 'UNHEALTHY' : 'WARNING';
        const healthCheck = {
            success: true,
            overallStatus,
            timestamp: new Date().toISOString(),
            checks,
            summary: {
                total: checks.length,
                ok: checks.filter(c => c.status === 'OK').length,
                warnings: checks.filter(c => c.status === 'WARNING').length,
                errors: checks.filter(c => c.status === 'ERROR').length
            }
        };
        console.log(`✅ システム健全性チェック完了: ${overallStatus}`);
        res.json(healthCheck);
    }
    catch (error) {
        console.error('❌ システム健全性チェックエラー:', error);
        res.status(500).json({
            success: false,
            error: 'システム健全性チェックに失敗しました',
            details: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
    }
});
exports.default = router;
