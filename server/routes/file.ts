import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
const router: any = Router();
router.post('/delete', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'ファイルパスが指定されていません' });
        }
        // 安全のため、パスが指定されたディレクトリ内にあることを確認
        const normalizedPath: any = path.normalize(filePath);
        const baseDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const absolutePath: any = path.join(process.cwd(), normalizedPath);
        if (!absolutePath.startsWith(baseDir)) {
            return res.status(403).json({ error: '許可されていないディレクトリへのアクセスです' });
        }
        // ファイルの存在確認
        await fs.access(absolutePath);
        // ファイルの削除
        await fs.unlink(absolutePath);
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
