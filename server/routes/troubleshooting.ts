import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
const router = express.Router();
// 汎用ロギング関数
function logDebug(message: any, ...args) {
    if (process.env.NODE_ENV !== 'production') {
        console.debug(message, ...args);
    }
}
function logInfo(message: any, ...args) {
    console.info(message, ...args);
}
function logWarn(message: any, ...args) {
    console.warn(message, ...args);
}
function logError(message: any, ...args) {
    console.error(message, ...args);
}
// トラブルシューティングリスト取得
router.get('/list', async (req, res) => {
    try {
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            return res.json([]);
        }
        const files: any = fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'));
        const troubleshootingList = [];
        for (const file of files) {
            try {
                const filePath: any = path.join(troubleshootingDir, file);
                const content: any = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                troubleshootingList.push(data);
            }
            catch (error) {
                logError(`Error reading file ${file}:`, error);
            }
        }
        res.json(troubleshootingList);
    }
    catch (error) {
        logError('Error in troubleshooting list:', error);
        res.status(500).json({ error: 'Failed to load troubleshooting data' });
    }
});
// トラブルシューティング詳細取得
router.get('/detail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: any = path.join(troubleshootingDir, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Troubleshooting flow not found' });
        }
        const content: any = fs.readFileSync(filePath, 'utf8');
        const data: any = JSON.parse(content);
        res.json(data);
    }
    catch (error) {
        logError('Error in troubleshooting detail:', error);
        res.status(500).json({ error: 'Failed to load troubleshooting detail' });
    }
});
// トラブルシューティング作成
router.post('/', async (req, res) => {
    try {
        const troubleshootingData: any = req.body;
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            fs.mkdirSync(troubleshootingDir, { recursive: true });
        }
        const id: any = troubleshootingData.id || `ts_${Date.now()}`;
        const filePath: any = path.join(troubleshootingDir, `${id}.json`);
        // ファイルが既に存在する場合は上書き
        fs.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));
        res.status(201).json({
            success: true,
            id: id,
            message: 'Troubleshooting flow created successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting create:', error);
        res.status(500).json({ error: 'Failed to create troubleshooting flow' });
    }
});
// トラブルシューティング更新
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingData: any = req.body;
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: any = path.join(troubleshootingDir, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Troubleshooting flow not found' });
        }
        fs.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));
        res.json({
            success: true,
            message: 'Troubleshooting flow updated successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting update:', error);
        res.status(500).json({ error: 'Failed to update troubleshooting flow' });
    }
});
// トラブルシューティング削除
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        const filePath: any = path.join(troubleshootingDir, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Troubleshooting flow not found' });
        }
        fs.unlinkSync(filePath);
        res.json({
            success: true,
            message: 'Troubleshooting flow deleted successfully'
        });
    }
    catch (error) {
        logError('Error in troubleshooting delete:', error);
        res.status(500).json({ error: 'Failed to delete troubleshooting flow' });
    }
});
// トラブルシューティング検索
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        const troubleshootingDir: any = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            return res.json([]);
        }
        const files: any = fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'));
        const searchResults = [];
        for (const file of files) {
            try {
                const filePath: any = path.join(troubleshootingDir, file);
                const content: any = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                // タイトル、説明、キーワードで検索
                const searchText = `${data.title || ''} ${data.description || ''} ${data.keyword || ''}`.toLowerCase();
                if (searchText.includes(query.toLowerCase())) {
                    searchResults.push(data);
                }
            }
            catch (error) {
                logError(`Error reading file ${file}:`, error);
            }
        }
        res.json(searchResults);
    }
    catch (error) {
        logError('Error in troubleshooting search:', error);
        res.status(500).json({ error: 'Failed to search troubleshooting flows' });
    }
});
export const troubleshootingRouter: any = router;
