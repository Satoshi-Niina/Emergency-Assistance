"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeRouter = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
exports.knowledgeRouter = router;
/**
 * GET /api/knowledge
 * knowledge-base/dataフォルダのJSONファイル一覧を取得
 */
router.get('/', async (_req, res) => {
    try {
        console.log('📚 ナレッジベースデータ取得リクエスト');
        // knowledge-base/dataフォルダのパスを設定
        const dataPath = path_1.default.join(process.cwd(), 'knowledge-base', 'data');
        // フォルダが存在するか確認
        if (!fs_1.default.existsSync(dataPath)) {
            console.log('📁 knowledge-base/data/フォルダが存在しません');
            return res.json({
                success: true,
                data: [],
                total: 0,
                message: 'knowledge-base/data/フォルダが存在しません',
            });
        }
        // フォルダ内のファイル一覧を取得
        const files = fs_1.default.readdirSync(dataPath);
        // JSONファイルのみをフィルタリング
        const jsonFiles = files.filter(file => {
            const filePath = path_1.default.join(dataPath, file);
            const stats = fs_1.default.statSync(filePath);
            return stats.isFile() && file.toLowerCase().endsWith('.json');
        });
        // ファイル情報を取得
        const fileList = jsonFiles.map(file => {
            const filePath = path_1.default.join(dataPath, file);
            const stats = fs_1.default.statSync(filePath);
            return {
                filename: file,
                name: path_1.default.parse(file).name,
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
router.get('/:filename', async (_req, res) => {
    try {
        const { filename } = req.params;
        console.log(`📚 ナレッジベースファイル取得: ${filename}`);
        // ファイルパスを構築
        const filePath = path_1.default.join(process.cwd(), 'knowledge-base', 'data', filename);
        // ファイルが存在するか確認
        if (!fs_1.default.existsSync(filePath)) {
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
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
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
