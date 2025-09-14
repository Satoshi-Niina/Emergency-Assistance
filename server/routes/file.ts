import { Router } from 'express';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
router.post('/delete', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'ファイルパスが指定されていません' });
        }
        // 許可ディレクトリ一覧
        const allowedDirs = [
            path.join(__dirname, '../../knowledge-base/troubleshooting'),
            path.join(__dirname, '../../knowledge-base/temp'),
            path.join(__dirname, '../../cache')
        ];
        const normalizedPath: any = path.normalize(filePath);
        const absolutePath: any = path.join(__dirname, '../../', normalizedPath);
        const isAllowed = allowedDirs.some(dir => absolutePath.startsWith(dir));
        if (!isAllowed) {
            return res.status(403).json({ error: '許可されていないディレクトリへのアクセスです' });
        }
        // ファイルの存在確認
        await fsPromises.access(absolutePath);
        // ファイルの削除
        await fsPromises.unlink(absolutePath);
        res.status(200).json({ message: 'ファイルを削除しました' });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'ファイルが見つかりません' });
        }
        console.error('ファイル削除エラー:', error);
        res.status(500).json({ error: 'ファイルの削除に失敗しました' });
    }
});
export default router;
