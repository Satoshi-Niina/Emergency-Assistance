import express from 'express';
import fs from 'fs';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { azureStorage } from '../azure-storage.js';
const router = express.Router();
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
const STORAGE_BASE_PREFIX = (process.env.AZURE_KNOWLEDGE_BASE_PATH ||
    process.env.STORAGE_BASE_PREFIX ||
    'knowledge-base')
    .replace(/^[\\/]+|[\\/]+$/g, '')
    .replace(/\\+/g, '/');
const DATA_PREFIX = STORAGE_BASE_PREFIX
    ? `${STORAGE_BASE_PREFIX}/data/`
    : 'knowledge-base/data/';
const AZURE_ENABLED = Boolean(AZURE_CONNECTION_STRING && azureStorage);
const toPosix = (value) => value.replace(/\\/g, '/');
const sanitizeRelativePath = (raw) => {
    const normalized = toPosix(raw.trim());
    if (!normalized) {
        throw new Error('ファイル名が指定されていません');
    }
    if (normalized.includes('..')) {
        throw new Error('不正なファイルパスです');
    }
    return normalized.replace(/^\/+/, '');
};
let blobServiceClient = null;
const getContainerClient = () => {
    if (!AZURE_CONNECTION_STRING) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }
    if (!blobServiceClient) {
        blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    }
    return blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
};
const buildBlobPath = (file) => toPosix(`${DATA_PREFIX}${sanitizeRelativePath(file)}`);
/**
 * GET /api/knowledge
 * knowledge-base/dataフォルダのJSONファイル一覧を取得
 */
router.get('/', async (_req, res) => {
    try {
        console.log('📚 ナレッジベースデータ取得リクエスト');
        if (AZURE_ENABLED) {
            await azureStorage?.ensureContainerExists();
            const containerClient = getContainerClient();
            const items = [];
            const prefix = DATA_PREFIX; // 末尾スラッシュ付き
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                const blobName = blob.name;
                if (!blobName.toLowerCase().endsWith('.json')) {
                    continue;
                }
                const relative = blobName.startsWith(prefix)
                    ? blobName.substring(prefix.length)
                    : blobName;
                if (!relative) {
                    continue;
                }
                const filename = relative;
                const parsed = path.posix.parse(relative);
                items.push({
                    filename,
                    name: parsed.name || filename,
                    size: blob.properties.contentLength || 0,
                    modifiedAt: blob.properties.lastModified?.toISOString() ||
                        new Date().toISOString(),
                    path: `/${toPosix(path.posix.join(STORAGE_BASE_PREFIX, 'data', relative))}`,
                });
            }
            console.log(`✅ ナレッジベースデータ取得完了 (Azure): ${items.length}件`);
            return res.json({
                success: true,
                data: items,
                total: items.length,
                timestamp: new Date().toISOString(),
            });
        }
        // knowledge-base/dataフォルダのパスを設定
        const dataPath = path.join(process.cwd(), 'knowledge-base', 'data');
        // フォルダが存在するか確認
        if (!fs.existsSync(dataPath)) {
            console.log('📁 knowledge-base/data/フォルダが存在しません');
            return res.json({
                success: true,
                data: [],
                total: 0,
                message: 'knowledge-base/data/フォルダが存在しません',
            });
        }
        // フォルダ内のファイル一覧を取得
        const files = fs.readdirSync(dataPath);
        // JSONファイルのみをフィルタリング
        const jsonFiles = files.filter(file => {
            const filePath = path.join(dataPath, file);
            const stats = fs.statSync(filePath);
            return stats.isFile() && file.toLowerCase().endsWith('.json');
        });
        // ファイル情報を取得
        const fileList = jsonFiles.map(file => {
            const filePath = path.join(dataPath, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                name: path.parse(file).name,
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                path: `/knowledge-base/data/${file}`,
            };
        });
        console.log(`✅ ナレッジベースデータ取得完了: ${fileList.length}件`);
        res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ ナレッジベースデータ取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジベースデータの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/knowledge/:filename
 * 特定のJSONファイルの内容を取得
 */
router.get('/:filename(*)', async (req, res) => {
    try {
        const { filename } = req.params;
        console.log(`📚 ナレッジベースファイル取得: ${filename}`);
        if (!filename) {
            return res.status(400).json({
                success: false,
                error: 'ファイル名が指定されていません',
            });
        }
        if (AZURE_ENABLED) {
            try {
                const relativePath = sanitizeRelativePath(filename);
                const blobPath = buildBlobPath(relativePath);
                const containerClient = getContainerClient();
                const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
                const exists = await blockBlobClient.exists();
                if (!exists) {
                    return res.status(404).json({
                        success: false,
                        error: 'ファイルが見つかりません',
                    });
                }
                const rawContent = await azureStorage.readFileAsString(blobPath);
                const content = rawContent.replace(/^\uFEFF/, '');
                const jsonData = JSON.parse(content);
                const properties = await blockBlobClient.getProperties();
                console.log('✅ ナレッジベースファイル取得完了 (Azure)');
                return res.json({
                    success: true,
                    data: jsonData,
                    filename: relativePath,
                    size: properties.contentLength || Buffer.byteLength(content, 'utf-8'),
                    modifiedAt: properties.lastModified?.toISOString(),
                });
            }
            catch (error) {
                console.error('❌ Azureナレッジベースファイル取得エラー:', error);
                return res.status(500).json({
                    success: false,
                    error: 'ナレッジベースファイルの取得に失敗しました',
                    details: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        // ファイルパスを構築
        const filePath = path.join(process.cwd(), 'knowledge-base', 'data', filename);
        // ファイルが存在するか確認
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'ファイルが見つかりません',
            });
        }
        // JSONファイルかどうか確認
        if (!filename.toLowerCase().endsWith('.json')) {
            return res.status(400).json({
                success: false,
                error: 'JSONファイルのみ取得可能です',
            });
        }
        // ファイル内容を読み込み
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        console.log('✅ ナレッジベースファイル取得完了');
        res.json({
            success: true,
            data: jsonData,
            filename: filename,
            size: fileContent.length,
        });
    }
    catch (error) {
        console.error('❌ ナレッジベースファイル取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ナレッジベースファイルの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export { router as knowledgeRouter };
