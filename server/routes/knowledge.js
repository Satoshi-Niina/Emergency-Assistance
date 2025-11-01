import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
/**
 * GET /api/knowledge
 * knowledge-base/dataフォルダのJSONファイル一覧を取得
 */
router.get('/', async (_req, res) => {
    try {
        console.log('📚 ナレッジベースデータ取得リクエスト');
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
router.get('/:filename', async (_req, res) => {
    try {
        const { filename } = req.params;
        console.log(`📚 ナレッジベースファイル取得: ${filename}`);
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
