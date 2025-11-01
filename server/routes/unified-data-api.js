import express from 'express';
import { db } from '../db/index.js';
import { users, supportHistory, baseDocuments, historyItems, historyImages, machines, machineTypes, images } from '../db/schema.js';
import { like, count, sql, or } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
/**
 * 統合データAPI - DBとローカルフォルダの総括的な操作エンドポイント
 */
// データベース総括情報取得
router.get('/db-overview', async (_req, res) => {
    try {
        console.log('📊 データベース総括情報取得開始');
        // 各テーブルの件数を取得
        const [userCount, supportHistoryCount, baseDocumentCount, historyItemCount, historyImageCount, machineCount, machineTypeCount, imageCount] = await Promise.all([
            db.select({ count: count() }).from(users),
            db.select({ count: count() }).from(supportHistory),
            db.select({ count: count() }).from(baseDocuments),
            db.select({ count: count() }).from(historyItems),
            db.select({ count: count() }).from(historyImages),
            db.select({ count: count() }).from(machines),
            db.select({ count: count() }).from(machineTypes),
            db.select({ count: count() }).from(images),
        ]);
        // 最新データ取得日時
        const latestData = await Promise.all([
            db.select({ latestDate: sql `MAX(created_at)` }).from(supportHistory),
            db.select({ latestDate: sql `MAX(created_at)` }).from(baseDocuments),
            db.select({ latestDate: sql `MAX(created_at)` }).from(historyItems),
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
        const baseDir = path.join(__dirname, '../../');
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
            const folderPath = path.join(baseDir, folder);
            try {
                const stats = await fs.stat(folderPath);
                if (stats.isDirectory()) {
                    const files = await fs.readdir(folderPath, { withFileTypes: true });
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
                db.select({
                    id: supportHistory.id,
                    type: sql `'support_history'`,
                    title: sql `CONCAT('機種: ', ${supportHistory.machineType}, ' 機械番号: ', ${supportHistory.machineNumber})`,
                    content: supportHistory.jsonData,
                    createdAt: supportHistory.createdAt
                })
                    .from(supportHistory)
                    .where(or(like(supportHistory.machineType, `%${query}%`), like(supportHistory.machineNumber, `%${query}%`), sql `${supportHistory.jsonData}::text ILIKE ${'%' + query + '%'}`))
                    .limit(limit)
                    .offset(offset),
                // 基礎文書検索
                db.select({
                    id: baseDocuments.id,
                    type: sql `'base_document'`,
                    title: baseDocuments.title,
                    content: baseDocuments.filePath,
                    createdAt: baseDocuments.createdAt
                })
                    .from(baseDocuments)
                    .where(like(baseDocuments.title, `%${query}%`))
                    .limit(limit)
                    .offset(offset),
                // 履歴アイテム検索
                db.select({
                    id: historyItems.id,
                    type: sql `'history_item'`,
                    title: historyItems.title,
                    content: historyItems.description,
                    createdAt: historyItems.createdAt
                })
                    .from(historyItems)
                    .where(or(like(historyItems.title, `%${query}%`), like(historyItems.description, `%${query}%`)))
                    .limit(limit)
                    .offset(offset)
            ]);
            results.results.database = dbResults.flat();
        }
        // ファイル検索
        if (searchType === 'all' || searchType === 'files') {
            const searchDirs = [
                path.join(__dirname, '../../knowledge-base'),
                path.join(__dirname, '../../uploads'),
                path.join(__dirname, '../../public')
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
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isFile() && item.name.toLowerCase().includes(query.toLowerCase())) {
                const stats = await fs.stat(fullPath);
                results.push({
                    type: 'file',
                    name: item.name,
                    path: fullPath,
                    size: stats.size,
                    lastModified: stats.mtime,
                    directory: path.basename(dirPath)
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
        const tableInfo = await db.execute(sql `
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
        const backupDir = path.join(__dirname, '../../backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}`);
        // バックアップディレクトリ作成
        await fs.mkdir(backupPath, { recursive: true });
        // 各テーブルのデータをJSONで出力
        const tablesToBackup = [
            { table: users, name: 'users' },
            { table: supportHistory, name: 'support_history' },
            { table: baseDocuments, name: 'base_documents' },
            { table: historyItems, name: 'history_items' },
            { table: historyImages, name: 'history_images' },
            { table: machines, name: 'machines' },
            { table: machineTypes, name: 'machine_types' },
            { table: images, name: 'images' }
        ];
        const backupSummary = [];
        for (const { table, name } of tablesToBackup) {
            try {
                const data = await db.select().from(table);
                const filePath = path.join(backupPath, `${name}.json`);
                await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
        await fs.writeFile(path.join(backupPath, 'backup-summary.json'), JSON.stringify({
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
            await db.select().from(users).limit(1);
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
            const dirPath = path.join(__dirname, '../../', dir);
            try {
                await fs.access(dirPath);
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
export default router;
