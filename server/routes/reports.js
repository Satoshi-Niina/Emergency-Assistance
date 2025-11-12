"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
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
        const exportsDir = path_1.default.join(__dirname, '../../knowledge-base/exports');
        console.log('検索ディレクトリ:', exportsDir);
        const files = await promises_1.default.readdir(exportsDir);
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
        const filePath = path_1.default.join(exportsDir, targetFile);
        console.log('ファイルパス:', filePath);
        // 既存のJSONファイルを読み込み
        const fileContent = await promises_1.default.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        console.log('既存データのキー:', Object.keys(jsonData));
        // 差分データで更新
        const updatedData = {
            ...jsonData,
            ...diffData,
        };
        console.log('更新後のデータキー:', Object.keys(updatedData));
        // 更新されたJSONファイルを保存
        await promises_1.default.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
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
exports.default = router;
