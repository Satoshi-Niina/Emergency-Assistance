import express from 'express';
import fs from 'fs/promises';
import path from 'path';
const router = express.Router();
// JSONファイルを更新するエンドポイント
router.post('/update', async (_req, res) => {
    try {
        console.log('=== /api/reports/update エンドポイントが呼び出されました ===');
        console.log('リクエストボディ:', req.body);
        const { chatId, diffData } = req.body;
        if (!chatId || !diffData) {
            console.log('パラメータ不足:', { chatId, diffData });
            return res.status(400).json({ error: 'chatId と diffData が必要です' });
        }
        console.log('検索するchatId:', chatId);
        // knowledge-base/exports フォルダ内のJSONファイルを検索
        const exportsDir = path.join(__dirname, '../../knowledge-base/exports');
        console.log('検索ディレクトリ:', exportsDir);
        const files = await fs.readdir(exportsDir);
        console.log('ディレクトリ内のファイル:', files);
        // chatIdを含むJSONファイルを検索
        const targetFile = files.find(file => file.includes(chatId) && file.endsWith('.json'));
        console.log('見つかったファイル:', targetFile);
        if (!targetFile) {
            console.log('対象のJSONファイルが見つかりません');
            return res
                .status(404)
                .json({ error: '対象のJSONファイルが見つかりません' });
        }
        const filePath = path.join(exportsDir, targetFile);
        console.log('ファイルパス:', filePath);
        // 既存のJSONファイルを読み込み
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        console.log('既存データのキー:', Object.keys(jsonData));
        // 差分データで更新
        const updatedData = {
            ...jsonData,
            ...diffData,
        };
        console.log('更新後のデータキー:', Object.keys(updatedData));
        // 更新されたJSONファイルを保存
        await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
        console.log(`JSONファイルが更新されました: ${targetFile}`);
        res.json({
            success: true,
            message: 'JSONファイルが更新されました',
            updatedFile: targetFile,
        });
    }
    catch (error) {
        console.error('JSONファイル更新エラー:', error);
        console.error('エラースタック:', error.stack);
        res.status(500).json({
            error: 'JSONファイルの更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
